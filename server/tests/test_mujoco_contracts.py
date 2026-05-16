from server.models.mujoco_schemas import MuJoCoRunRequest


def test_mujoco_run_request_valid():
    payload = {
        "run_id": "r1",
        "arm": {"segments": []},
        "execution_plan": {"frames": []},
        "rapier_frames": [],
        "target_fps": 60,
        "strict": True
    }
    req = MuJoCoRunRequest(**payload)
    assert req.run_id == "r1"