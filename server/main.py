from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import os
import json
import time
from pathlib import Path
from collections import defaultdict
from typing import AsyncGenerator, Any

try:
    import google.generativeai as developer_genai
except ImportError:
    developer_genai = None

try:
    from google import genai as vertex_genai
    from google.genai import types as vertex_types
except ImportError:
    vertex_genai = None
    vertex_types = None

from dotenv import load_dotenv
from models.schemas import TaskSpecRequest, TaskSpec, RepairRequest
from models.arm_context import ArmContextBuilder, GeminiPromptAssembler
from models.validators import SafetyValidator

app = FastAPI(title='Mirai AI Backend', version='1.1.0')

app.add_middleware(
    CORSMiddleware,
    allow_origins=['http://localhost:5173', 'https://mirai.vercel.app'],
    allow_credentials=True,
    allow_methods=['POST', 'GET'],
    allow_headers=['*'],
)

# Load env from backend/.env first (project convention), then server/.env fallback.
PROJECT_ROOT = Path(__file__).resolve().parents[1]
BACKEND_ENV_PATH = PROJECT_ROOT / 'backend' / '.env'
SERVER_ENV_PATH = Path(__file__).resolve().parent / '.env'

if BACKEND_ENV_PATH.exists():
    load_dotenv(BACKEND_ENV_PATH)
elif SERVER_ENV_PATH.exists():
    load_dotenv(SERVER_ENV_PATH)

GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
GEMINI_PROVIDER = os.getenv('GEMINI_PROVIDER', 'developer').strip().lower()
VERTEX_PROJECT_ID = (
    os.getenv('VERTEX_PROJECT_ID')
    or os.getenv('GCP_PROJECT_ID')
    or os.getenv('GCP_PROJECT_NUMBER')
    or os.getenv('GOOGLE_CLOUD_PROJECT')
)
VERTEX_LOCATION = os.getenv('VERTEX_LOCATION', 'global')
GEMINI_MODEL = os.getenv('GEMINI_MODEL', 'gemini-2.0-flash')
GEMINI_FALLBACK_MODELS = [
    'gemini-2.5-flash',
    'gemini-2.0-flash-001',
    'gemini-flash-latest',
    'gemini-2.0-flash-lite',
    'gemini-flash-lite-latest',
    'gemini-1.5-flash-latest',
    'gemini-1.5-flash',
]
_vertex_client = None

def configure_provider() -> None:
    if GEMINI_PROVIDER == 'developer':
        if developer_genai is None:
            raise RuntimeError('google-generativeai package not installed for developer Gemini provider')
        if not GEMINI_API_KEY:
            raise RuntimeError('GEMINI_API_KEY not found for developer Gemini provider')
        developer_genai.configure(api_key=GEMINI_API_KEY)
        return

    if GEMINI_PROVIDER == 'vertex':
        if vertex_genai is None or vertex_types is None:
            raise RuntimeError('google-genai package not installed for Vertex AI Gemini provider')
        if not VERTEX_PROJECT_ID:
            raise RuntimeError('VERTEX_PROJECT_ID or GCP_PROJECT_ID is required for Vertex AI Gemini provider')
        return

    raise RuntimeError("GEMINI_PROVIDER must be either 'developer' or 'vertex'")

def normalize_model_name(name: str) -> str:
    return name if name.startswith('models/') else 'models/' + name

def model_suffix(name: str) -> str:
    return name.split('/', 1)[1] if name.startswith('models/') else name

def discover_generate_models() -> list[str]:
    if GEMINI_PROVIDER != 'developer' or developer_genai is None:
        return []

    try:
        discovered = []
        for model in developer_genai.list_models():
            methods = getattr(model, 'supported_generation_methods', []) or []
            if 'generateContent' in methods:
                discovered.append(getattr(model, 'name', ''))
        return [m for m in discovered if m]
    except Exception:
        return []

def build_model_candidates() -> list[str]:
    preferred_unique = list(dict.fromkeys([GEMINI_MODEL] + GEMINI_FALLBACK_MODELS))

    if GEMINI_PROVIDER == 'vertex':
        return preferred_unique

    preferred = [normalize_model_name(name) for name in preferred_unique]
    # De-duplicate while preserving order.
    preferred_unique = list(dict.fromkeys(preferred))

    discovered = discover_generate_models()
    if not discovered:
        return preferred_unique

    discovered_suffix_map = {model_suffix(m): m for m in discovered}
    candidates: list[str] = []

    # Keep explicit preference order but only if model is available for generateContent.
    for preferred_name in preferred_unique:
        resolved = discovered_suffix_map.get(model_suffix(preferred_name))
        if resolved and resolved not in candidates:
            candidates.append(resolved)

    return candidates or preferred_unique

def get_vertex_client():
    global _vertex_client
    if _vertex_client is None:
        client_kwargs: dict[str, Any] = {
            'vertexai': True,
            'project': VERTEX_PROJECT_ID,
            'location': VERTEX_LOCATION,
        }
        _vertex_client = vertex_genai.Client(**client_kwargs)
    return _vertex_client

def extract_chunk_text(chunk: Any) -> str:
    text = getattr(chunk, 'text', None)
    return text or ''

def generate_stream(model_name: str, system_prompt: str, user_prompt: str):
    if GEMINI_PROVIDER == 'vertex':
        client = get_vertex_client()
        config = vertex_types.GenerateContentConfig(system_instruction=system_prompt)
        return client.models.generate_content_stream(
            model=model_name,
            contents=user_prompt,
            config=config,
        )

    model = developer_genai.GenerativeModel(model_name)
    return model.generate_content([system_prompt, user_prompt], stream=True)

def generate_text(model_name: str, prompt: str, system_prompt: str | None = None) -> str:
    if GEMINI_PROVIDER == 'vertex':
        client = get_vertex_client()
        config = None
        if system_prompt:
            config = vertex_types.GenerateContentConfig(system_instruction=system_prompt)
        response = client.models.generate_content(
            model=model_name,
            contents=prompt,
            config=config,
        )
        return getattr(response, 'text', None) or ''

    model = developer_genai.GenerativeModel(model_name)
    response = model.generate_content(prompt)
    return response.text or ''

configure_provider()

GEMINI_MODELS = build_model_candidates()

_RATE_WINDOW_SEC = 60
_RATE_MAX_CALLS = 30
rate_buckets = defaultdict(list)

def is_quota_or_rate_error(exc: Exception) -> bool:
    msg = str(exc).lower()
    return (
        'quota exceeded' in msg
        or 'rate limit' in msg
        or 'resource_exhausted' in msg
        or '429' in msg
    )

def is_model_unavailable_error(exc: Exception) -> bool:
    msg = str(exc).lower()
    return (
        'not found for api version' in msg
        or 'not supported for generatecontent' in msg
        or '404' in msg
    )

def allow_request(ip: str) -> bool:
    now = time.time()
    bucket = rate_buckets[ip]
    while bucket and now - bucket[0] > _RATE_WINDOW_SEC:
        bucket.pop(0)
    if len(bucket) >= _RATE_MAX_CALLS:
        return False
    bucket.append(now)
    return True

@app.middleware('http')
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    response.headers['Permissions-Policy'] = 'microphone=(self)'
    return response

@app.get('/health')
def health_check():
    return {
        'status': 'ok',
        'provider': GEMINI_PROVIDER,
        'gemini_key_loaded': bool(GEMINI_API_KEY),
        'vertex_project_id': VERTEX_PROJECT_ID,
        'vertex_location': VERTEX_LOCATION,
        'model': GEMINI_MODEL,
        'resolved_models': GEMINI_MODELS,
        'fallback_models': GEMINI_MODELS[1:],
    }

@app.post('/ai/plan', response_class=StreamingResponse)
async def stream_task_plan(request: Request, payload: TaskSpecRequest):
    ip = request.client.host if request.client else 'unknown'
    if not allow_request(ip):
        raise HTTPException(status_code=429, detail='Rate limit exceeded')

    if len(payload.user_input) > 500:
        raise HTTPException(status_code=400, detail='Input too long')

    arm_context = ArmContextBuilder.build_from_frontend_state(
        payload.arm_context.segments,
        payload.arm_context.gripper.type
    )
    system_prompt, user_prompt = GeminiPromptAssembler.build_planning_prompt(
        payload.user_input,
        arm_context,
        payload.scene_objects
    )

    async def event_generator() -> AsyncGenerator[str, None]:
        try:
            full_response = ''
            last_exc: Exception | None = None

            for idx, model_name in enumerate(GEMINI_MODELS):
                try:
                    full_response = ''

                    for chunk in generate_stream(model_name, system_prompt, user_prompt):
                        text = extract_chunk_text(chunk)
                        if not text:
                            continue
                        full_response += text

                        lower = full_response.lower()
                        if 'think:' in lower:
                            yield 'data: ' + json.dumps({'type': 'react_step', 'phase': 'think', 'content': 'Analyzing task intent'}) + '\n\n'
                        if 'act:' in lower:
                            yield 'data: ' + json.dumps({'type': 'react_step', 'phase': 'act', 'content': 'Building executable motion steps'}) + '\n\n'
                        if 'observe:' in lower:
                            yield 'data: ' + json.dumps({'type': 'react_step', 'phase': 'observe', 'content': 'Checking feasibility and safety'}) + '\n\n'

                        yield 'data: ' + json.dumps({'type': 'chunk', 'content': text}) + '\n\n'

                    # Successfully generated on this model.
                    break
                except Exception as exc:
                    last_exc = exc
                    should_fallback = (
                        (is_quota_or_rate_error(exc) or is_model_unavailable_error(exc))
                        and idx < len(GEMINI_MODELS) - 1
                    )
                    if should_fallback:
                        continue
                    raise

            if not full_response and last_exc is not None:
                raise last_exc

            start = full_response.find('{')
            end = full_response.rfind('}')
            if start == -1 or end == -1 or end <= start:
                raise ValueError('No valid JSON in model response')

            task_dict = json.loads(full_response[start:end + 1])
            task_spec = TaskSpec(**task_dict)
            preflight = SafetyValidator.validate_task_spec(task_spec, arm_context)

            payload_out = {
                'type': 'task_spec',
                'task': task_spec.model_dump(),
                'preflight': preflight.model_dump(),
            }
            yield 'data: ' + json.dumps(payload_out) + '\n\n'
            yield 'data: [DONE]\n\n'
        except Exception as exc:
            yield 'data: ' + json.dumps({'type': 'error', 'error': str(exc)}) + '\n\n'
            yield 'data: [DONE]\n\n'

    return StreamingResponse(event_generator(), media_type='text/event-stream')

@app.post('/ai/repair')
async def repair_failing_task(request: Request, payload: RepairRequest):
    ip = request.client.host if request.client else 'unknown'
    if not allow_request(ip):
        raise HTTPException(status_code=429, detail='Rate limit exceeded')

    if not payload.failures:
        return {'repaired_task': payload.task_spec.model_dump()}

    failures_desc = '\n'.join(
        ['Step ' + str(f.step_index) + ': ' + f.error_code + ' - ' + f.message for f in payload.failures]
    )

    repair_prompt = (
        'Rewrite only failing steps and return valid JSON only.\n\n'
        'Task:\n' + json.dumps(payload.task_spec.model_dump(), indent=2) + '\n\n'
        'Failures:\n' + failures_desc + '\n\n'
        'Constraints:\n'
        'Max reach: ' + str(payload.arm_context.max_reach) + 'm\n'
        'Payload limit: ' + str(payload.arm_context.payload_limit) + 'kg\n'
    )

    try:
        text = ''
        last_exc: Exception | None = None

        for idx, model_name in enumerate(GEMINI_MODELS):
            try:
                text = generate_text(model_name, repair_prompt)
                break
            except Exception as exc:
                last_exc = exc
                should_fallback = (
                    (is_quota_or_rate_error(exc) or is_model_unavailable_error(exc))
                    and idx < len(GEMINI_MODELS) - 1
                )
                if should_fallback:
                    continue
                raise

        if not text and last_exc is not None:
            raise last_exc

        start = text.find('{')
        end = text.rfind('}')
        if start == -1 or end == -1 or end <= start:
            raise ValueError('No valid JSON in repair response')
        repaired_dict = json.loads(text[start:end + 1])
        repaired = TaskSpec(**repaired_dict)
        return {'repaired_task': repaired.model_dump()}
    except Exception as exc:
        raise HTTPException(status_code=500, detail='Repair failed: ' + str(exc))

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='0.0.0.0', port=8000)