"""Persist validated domain variables before constructing any agent request."""
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException

ROOT = Path(__file__).resolve().parent


def input_document(domain, stage, variables):
    if domain not in {'business', 'finance', 'life'}:
        raise ValueError('Unknown domain')
    request_id = uuid4().hex
    folder = Path(os.getenv('DFLOW_DATA_DIR', str(ROOT / 'data' / 'inputs'))) / domain
    document = {'request_id': request_id, 'domain': domain, 'stage': stage,
                'created_at': datetime.now(timezone.utc).isoformat(), 'variables': variables}
    try:
        folder.mkdir(parents=True, exist_ok=True)
        path = folder / f'{request_id}.json'
        # Exclusive creation prevents collisions/overwrites. Only read after the write closes.
        with path.open('x', encoding='utf-8') as handle:
            json.dump(document, handle, ensure_ascii=False, indent=2, allow_nan=False)
        with path.open(encoding='utf-8') as handle:
            return json.load(handle)
    except (OSError, ValueError):
        raise HTTPException(500, 'Could not save the input JSON. The agent request was not sent.') from None


def prompt_for(domain):
    if domain not in {'business', 'finance', 'life'}:
        raise ValueError('Unknown domain')
    return (ROOT / 'prompts' / f'{domain}.txt').read_text(encoding='utf-8')
