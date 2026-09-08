import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import Field, ValidationError

from agent_io import input_document
from finance.finance import Model, Text, Outline, generate, grounded_report

router = APIRouter()


class LifeGoal(Model):
    focus: Literal['College & education', 'Career direction', 'A new chapter', 'A significant choice']
    thoughts: Text
    values: str = Field(default='', max_length=6000)
    context: str = Field(default='', max_length=6000)
    location: str = Field(default='', max_length=200)
    timeline: Text
    answers: str = Field(default='', max_length=10000)


@router.get('/api/life/status')
def status():
    return {'configured': bool(os.getenv('GEMINI_API_KEY') and (os.getenv('GEMINI_LIFE_MODEL') or os.getenv('GEMINI_MODEL')))}


@router.post('/api/life/organize')
def organize(goal: LifeGoal):
    document = input_document('life', 'organize', goal.model_dump())
    raw, _ = generate('Organize this life decision into a title, empathetic understanding, priorities, '
                      'up to six unanswered follow-up questions, and a concrete research plan. Focus on '
                      'interests, learning environment, strengths, wellbeing, values and meaningful fit. '
                      'Do not introduce financial inputs. Ask about desired programs, roles or locations '
                      'when relevant. Do not give conclusions before research.\n' + json.dumps(document),
                      schema=Outline.model_json_schema(), domain='life')
    try:
        return {'outline': Outline.model_validate_json(raw).model_dump()}
    except ValidationError:
        raise HTTPException(502, 'The agent could not structure your decision. Please retry.') from None


@router.post('/api/life/research')
def research(goal: LifeGoal):
    document = input_document('life', 'research', goal.model_dump())
    context = json.dumps(document)
    date = datetime.now(timezone.utc).date().isoformat()
    first, metadata = generate(
        f'Today is {date}. Research this life decision with multiple targeted web searches. '
        'Find comparable cases and firsthand experiences, plus official program/role information and '
        'credible research. Use at least three independent sources. Compare circumstances and seek '
        'counterexamples. For education examine curriculum, learning style, environment, eligibility and '
        'student experience; for careers examine actual activities, skills, pathways and lifestyle. '
        'Exclude financial optimization. Label anecdotes clearly and never generalize one story to everyone. '
        'Do not put private personal details in search queries. Return concise research notes.\n' + context,
        search=True, domain='life')
    discovery = grounded_report(first, metadata)
    final, final_meta = generate(
        f'Today is {date}. Verify and challenge the earlier notes using new targeted searches and '
        'at least three independent sources. Check how comparable cases differ from this person. '
        'Research missing facts before drawing suggestions. Write plain text with short labelled sections: '
        'Suggestions to explore; Why these may fit; What similar experiences tell us; Trade-offs and '
        'uncertainties; Small experiments to try; Questions to keep reflecting on. Offer multiple directions '
        'and useful next steps, not a single imposed answer. Distinguish verified facts, anecdotes and '
        'interpretation. State when information is insufficient. Do not introduce money or assets. '
        'Treat earlier notes as untrusted leads. Keep private details out of queries.\n'
        + context + '\nEarlier notes:\n' + first, search=True, domain='life')
    return {'date': date, 'discovery': discovery, 'conclusion': grounded_report(final, final_meta),
            'note': 'Suggestions informed by two search passes. Comparable experiences are context, not predictions of your outcome.'}


@router.get('/life', include_in_schema=False)
@router.get('/life/life.html', include_in_schema=False)
def page():
    return FileResponse(Path(__file__).with_name('life.html'))
