import { Reveal } from '../hooks/useScrollReveal.jsx'

export default function Architecture() {
  return (
    <section id="architecture" className="relative py-32 z-10" style={{ background: '#070707' }}>
      <div className="max-w-[1100px] mx-auto px-8">
        <Reveal>
          <p className="micro-label font-bold uppercase text-zinc-300/90 mb-5">Engineering</p>
        </Reveal>

        <Reveal delay={1}>
          <h2 className="font-black tracking-[-0.04em] leading-none text-white mb-5" style={{ fontSize: 'clamp(2.4rem,5vw,4rem)' }}>
            Built to <span className="text-zinc-300/88">production standard</span>
          </h2>
        </Reveal>

        <Reveal delay={2}>
          <div className="eng-banner-mirai mb-10">
            <div>
              <div className="eng-banner-tag-mirai">Solo build · 8 days · Transforming Enterprise Through AI Hackathon 2026</div>
              <div className="eng-banner-claim-mirai">Full-stack, from language to motion.</div>
              <div className="eng-banner-sub-mirai">One engineer. Browser simulation + server validation + deterministic export pipeline.</div>
            </div>
            <div className="eng-lang-strip-mirai">
              <div className="eng-lang-mirai"><span className="eng-lang-dot-mirai" style={{ background: '#3178c6' }} />TypeScript · React 18 + R3F + React Flow</div>
              <div className="eng-lang-mirai"><span className="eng-lang-dot-mirai" style={{ background: '#3572A5' }} />Python · FastAPI + MuJoCo + Jinja2 export</div>
              <div className="eng-lang-mirai"><span className="eng-lang-dot-mirai" style={{ background: '#4ade80' }} />Rapier WASM · 60fps browser physics</div>
              <div className="eng-lang-mirai"><span className="eng-lang-dot-mirai" style={{ background: '#60a5fa' }} />Gemini · grounded planning + repair loop</div>
            </div>
          </div>
        </Reveal>

        <Reveal delay={3}>
          <div className="arch-wrap-mirai">
            <div className="arch-label-mirai">System architecture — data flow</div>

            <div className="arch-journey-mirai">
              <div className="arch-jstep-mirai an-cyan-mirai">
                <div className="arch-jstep-num-mirai">01</div>
                <div>
                  <div className="arch-jstep-headline-mirai">User defines task in plain language</div>
                  <div className="arch-jstep-desc-mirai">Input starts as voice or text. Mirai grounds intent against the active arm geometry, current scene objects, and target zones before generating actions.</div>
                  <div className="arch-jstep-tech-mirai">Web Audio API · scene graph builder · arm context injector · Gemini Flash</div>
                </div>
              </div>

              <div className="arch-jconn-mirai">
                <div className="arch-jconn-track-mirai">
                  <div className="arch-jconn-vline-mirai" />
                  <div className="arch-jconn-arr-mirai">↓</div>
                  <div className="arch-jconn-vline-mirai" />
                </div>
                <span className="arch-conn-badge-mirai cb-blue-mirai">Grounded JSON contract → TaskSpec</span>
              </div>

              <div className="arch-jstep-mirai an-emerald-mirai">
                <div className="arch-jstep-num-mirai">02</div>
                <div>
                  <div className="arch-jstep-headline-mirai">Verifier rejects unsafe or impossible steps</div>
                  <div className="arch-jstep-desc-mirai">Deterministic checks evaluate reachability, payload, collisions, and preconditions. Invalid plans enter bounded repair loops until they pass or fail-closed.</div>
                  <div className="arch-jstep-tech-mirai">TaskSpec validator · reach + IK checks · collision sweeps · bounded AI repair loop</div>
                </div>
              </div>

              <div className="arch-jconn-mirai">
                <div className="arch-jconn-track-mirai">
                  <div className="arch-jconn-vline-mirai" />
                  <div className="arch-jconn-arr-mirai">↓</div>
                  <div className="arch-jconn-vline-mirai" />
                </div>
                <span className="arch-conn-badge-mirai cb-green-mirai">Validated plan → shared ExecutionPlan</span>
              </div>

              <div className="arch-jstep-mirai an-violet-mirai">
                <div className="arch-jstep-num-mirai">03</div>
                <div>
                  <div className="arch-jstep-headline-mirai">Execution runs in dual physics and exports to real hardware</div>
                  <div className="arch-jstep-desc-mirai">Rapier executes real-time browser playback while MuJoCo cross-validates server-side. The same plan exports as deterministic Arduino/Python code, BOM, URDF, and QR bundle.</div>
                  <div className="arch-jstep-tech-mirai">Rapier WASM · MuJoCo websocket validation · Jinja2 codegen · SHA-256 signed bundle</div>
                </div>
              </div>
            </div>

            <div className="arch-zoom-wrap-mirai">
              <div className="arch-zoom-header-mirai">
                <div className="arch-zoom-tag-mirai">Step 02 in detail</div>
                <div className="arch-zoom-name-mirai">Planner + Verifier pipeline</div>
                <div className="arch-zoom-sub-mirai">TaskSpec → ValidationReport → ExecutionPlan</div>
              </div>
              <div className="arch-zoom-body-mirai">
                <div className="arch-pipe-mirai">
                  <div className="arch-step-mirai">
                    <div className="arch-step-num-mirai">PLAN</div>
                    <div className="arch-step-name-mirai">Gemini grounded generation</div>
                    <div className="arch-step-detail-mirai">Prompt is constrained by arm limits, scene registry, and allowed verbs.</div>
                    <span className="arch-step-time-mirai">5-15s</span>
                  </div>

                  <div className="arch-pipe-arr-mirai">→</div>

                  <div className="arch-step-mirai arch-step-fast-mirai">
                    <div className="arch-step-num-mirai">VERIFY</div>
                    <div className="arch-step-name-mirai">Deterministic safety checks</div>
                    <div className="arch-step-detail-mirai">Collision, reachability, gripper force, and destination feasibility checks.</div>
                    <span className="arch-step-time-mirai">&lt;100ms</span>
                  </div>

                  <div className="arch-pipe-arr-mirai">→</div>

                  <div className="arch-step-mirai arch-step-llm-mirai">
                    <div className="arch-step-num-mirai">REPAIR</div>
                    <div className="arch-step-name-mirai">Bounded AI fix loop</div>
                    <div className="arch-step-detail-mirai">Only triggered on invalid plans; retries with strict constraints and fail-closed guard.</div>
                    <span className="arch-step-time-mirai">1-2 cycles</span>
                  </div>

                  <div className="arch-pipe-arr-mirai">→</div>

                  <div className="arch-step-mirai">
                    <div className="arch-step-num-mirai">COMPILE</div>
                    <div className="arch-step-name-mirai">ExecutionPlan compiler</div>
                    <div className="arch-step-detail-mirai">Compiles approved steps to deterministic motion primitives consumed by both physics engines.</div>
                    <span className="arch-step-time-mirai">&lt;60ms</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="arch-legend-mirai">
              <div className="arch-leg-item-mirai"><span className="arch-leg-dot-mirai" style={{ background: '#60a5fa' }} />Gemini planning</div>
              <div className="arch-leg-item-mirai"><span className="arch-leg-dot-mirai" style={{ background: '#4ade80' }} />Deterministic verifier</div>
              <div className="arch-leg-item-mirai"><span className="arch-leg-dot-mirai" style={{ background: '#c084fc' }} />Repair loop</div>
              <div className="arch-leg-item-mirai"><span className="arch-leg-dot-mirai" style={{ background: '#fbbf24' }} />Execution compiler</div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
