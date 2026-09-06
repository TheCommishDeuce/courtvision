"""Exercise only the local backend-preflight block, never the deploy entrypoint."""
from __future__ import annotations

import os
from pathlib import Path
import subprocess

import pytest


DEPLOY_SCRIPT = Path(__file__).resolve().parents[1] / "deploy" / "deploy.sh"


def _backend_preflight() -> str:
    source = DEPLOY_SCRIPT.read_text()
    _, start, rest = source.partition('    step "Running backend tests"\n')
    block, end, _ = rest.partition('    step "Typechecking, linting and testing the frontend"\n')
    assert start and end, "Backend preflight markers must remain identifiable"
    # No git, npm, SSH, rsync, or deployment commands are executed by these tests.
    return block


def _fake_python(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        '#!/bin/sh\n'
        'printf "%s|%s\\n" "$0" "$*" >> "$CALL_LOG"\n'
        'if [ "$1" = "-m" ]; then exit "${TEST_EXIT_CODE:-0}"; fi\n'
    )
    path.chmod(0o755)


@pytest.fixture()
def environment(tmp_path: Path):
    root = tmp_path / "checkout with spaces"
    root.mkdir()
    system_python = tmp_path / "bin" / "python3"
    _fake_python(system_python)
    custom_python = tmp_path / "custom environment" / "python"
    _fake_python(custom_python)
    env = {
        "ROOT": str(root),
        "PATH": f"{system_python.parent}{os.pathsep}{os.environ.get('PATH', '')}",
        "CALL_LOG": str(tmp_path / "calls.log"),
        # This configures remote venv creation, not the local test interpreter.
        "PYTHON_BIN": "remote-python-must-not-be-used",
    }
    return root, system_python, custom_python, env


@pytest.mark.parametrize("has_project_python,override,expected", [
    (True, None, "project"),
    (True, "", "project"),
    (True, "custom", "custom"),
    (False, None, "system"),
    (False, "custom", "custom"),
])
def test_preflight_selects_local_python(environment, has_project_python, override, expected):
    root, system_python, custom_python, env = environment
    project_python = root / ".venv" / "bin" / "python"
    if has_project_python:
        _fake_python(project_python)
    if override is not None:
        env["PYTHON"] = str(custom_python) if override == "custom" else override

    result = subprocess.run(["bash", "-eu", "-c", _backend_preflight()], env=env, capture_output=True, text=True)
    assert result.returncode == 0, result.stderr
    selected = {"project": project_python, "custom": custom_python, "system": system_python}[expected]
    calls = Path(env["CALL_LOG"]).read_text().splitlines()
    assert calls[-1] == f"{selected}|-m pytest -q"
    assert all(call.startswith(f"{selected}|") for call in calls)


def test_invalid_explicit_override_does_not_silently_fall_back(environment):
    root, _, _, env = environment
    _fake_python(root / ".venv" / "bin" / "python")
    env["PYTHON"] = str(root / "missing-python")
    result = subprocess.run(["bash", "-eu", "-c", _backend_preflight()], env=env, capture_output=True, text=True)
    assert result.returncode != 0
    assert not Path(env["CALL_LOG"]).exists()


def test_backend_test_failure_still_stops_preflight(environment):
    root, _, _, env = environment
    _fake_python(root / ".venv" / "bin" / "python")
    env["TEST_EXIT_CODE"] = "17"
    result = subprocess.run(["bash", "-eu", "-c", _backend_preflight()], env=env, capture_output=True, text=True)
    assert result.returncode == 17
