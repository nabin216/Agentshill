from __future__ import annotations
import json
import os
import subprocess
import sys
import threading
import time
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

ROOT = Path(__file__).resolve().parents[2]
RESULTS = ROOT / 'results'
EXPERIMENTS = ROOT / 'experiments'
RESULTS.mkdir(exist_ok=True)
app = FastAPI(title='AgentShield Research Console', docs_url='/api/docs', openapi_url='/api/openapi.json')
lock = threading.Lock()
state: dict[str, Any] = {'running': False, 'experiment': None, 'started_at': None, 'exit_code': None}
ALLOWED = {
    'baseline': 'run_live_agent.py',
    'protected': 'run_protected_agent.py',
    'attack_001': 'run_attack_001.py',
}

class StartRequest(BaseModel):
    experiment: str

def read_jsonl(path: Path, limit: int = 250) -> list[dict]:
    if not path.is_file():
        return []
    from collections import deque
    with path.open(encoding='utf-8', errors='replace') as f:
        lines = deque(f, maxlen=limit)
    out = []
    for line in lines:
        try:
            record = json.loads(line)
            if isinstance(record, dict):
                out.append({k: record.get(k) for k in ('timestamp', 'tool', 'decision', 'reason')})
        except json.JSONDecodeError:
            continue
    return out

def read_attack() -> list[dict]:
    p = RESULTS / 'attack_001.json'
    if not p.is_file():
        return []
    try:
        data = json.loads(p.read_text(encoding='utf-8'))
        return [{k: row.get(k) for k in ('mode','model','user_task','injection_task','utility_success','security_success','elapsed_seconds')} for row in data if isinstance(row,dict)] if isinstance(data,list) else []
    except (ValueError, OSError):
        return []

def summary() -> dict:
    audit = read_jsonl(RESULTS / 'gateway_audit.jsonl', 10000)
    counts = Counter(str(x.get('decision')) for x in audit)
    return {'total_decisions': len(audit), 'allowed': counts['ALLOW'], 'confirm': counts['CONFIRM'], 'denied': counts['DENY'], 'recent': list(reversed(audit[-100:])), 'attack_results': read_attack(), 'experiments': [{'id': k, 'filename': v, 'available': (EXPERIMENTS / v).is_file()} for k,v in ALLOWED.items()], 'runner': dict(state), 'model': os.getenv('GROQ_MODEL', 'openai/gpt-oss-20b')}

@app.get('/api/health')
def health():
    return {'status':'ok','utc':datetime.now(timezone.utc).isoformat(),'project_root':str(ROOT)}

@app.get('/api/overview')
def overview():
    return summary()

@app.get('/api/logs/{experiment}')
def logs(experiment: str):
    if experiment not in ALLOWED:
        raise HTTPException(404, 'Unknown experiment')
    p = RESULTS / f'dashboard_{experiment}.log'
    if not p.is_file():
        return {'text': '', 'exists': False}
    with p.open('rb') as f:
        f.seek(0, 2)
        f.seek(max(0, f.tell() - 40000))
        content = f.read().decode('utf-8', errors='replace')
    return {'text': content, 'exists': True}

def worker(experiment: str):
    filename = ALLOWED[experiment]
    log_path = RESULTS / f'dashboard_{experiment}.log'
    env = dict(os.environ)
    env['PYTHONPATH'] = str(ROOT) + (os.pathsep + env['PYTHONPATH'] if env.get('PYTHONPATH') else '')
    try:
        with log_path.open('w', encoding='utf-8') as log:
            process = subprocess.Popen([sys.executable, '-u', str(EXPERIMENTS / filename)], cwd=str(ROOT), env=env, stdout=log, stderr=subprocess.STDOUT, stdin=subprocess.DEVNULL)
            code = process.wait(timeout=900)
    except subprocess.TimeoutExpired:
        process.kill()
        process.wait()
        code = -1
        with log_path.open('a') as log:
            log.write('\nTIMEOUT: experiment exceeded 15 minutes\n')
    except Exception as exc:
        code = -2
        with log_path.open('a') as log:
            log.write(f'Runner error: {type(exc).__name__}: {exc}\n')
    finally:
        with lock:
            state.update(running=False, exit_code=code)

@app.post('/api/experiments/start', status_code=202)
def start(body: StartRequest):
    if body.experiment not in ALLOWED:
        raise HTTPException(400, 'Unsupported experiment')
    if not (EXPERIMENTS / ALLOWED[body.experiment]).is_file():
        raise HTTPException(404, 'Experiment script not installed')
    with lock:
        if state['running']:
            raise HTTPException(409, 'An experiment is already running')
        state.update(running=True, experiment=body.experiment, started_at=datetime.now(timezone.utc).isoformat(), exit_code=None)
        threading.Thread(target=worker, args=(body.experiment,), daemon=True).start()
    return {'started': body.experiment}
