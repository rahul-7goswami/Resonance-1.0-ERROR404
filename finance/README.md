# Personal Finance

Run the shared application from the repository root:

```powershell
python -m pip install -r requirements.txt
python -m uvicorn business.business:app --reload --host 127.0.0.1 --port 8000
```

Open `/finance` or select Finance on the dashboard. `finance.html` is presentation
and interaction; `finance.py` contains the API, calculations, AI prompts and research.
The existing deleted Finance prototype is not used.

Configure `GEMINI_API_KEY` and `GEMINI_MODEL` in the server environment. Optionally
set `GEMINI_FINANCE_MODEL` to a separate model supporting Google Search grounding.
Environment files are not loaded automatically. Keys never enter browser storage.
The goal and optional financial figures are sent to Google when an AI action is
selected. Prompts instruct the agent to exclude private amounts from search queries.

Clarification uses validated JSON output. Research performs two sequential grounded
calls: discovery and independent checking/conclusion. Each pass must return at
least two distinct HTTPS source URLs, actual search queries and supported excerpts;
otherwise the API returns an explicit error, not an invented researched conclusion.
The prompts request three independent sources; the metadata gate alone does not
prove source independence, quality or accuracy. User review remains necessary.
Sources and supported excerpts are linked; search suggestions render in a sandboxed
iframe with scripts disabled. User/provider text is escaped, not executed.

Optional INR monthly balance and savings-above-reserve calculations run in Python.
Unknown numbers remain unknown. No automated trades or purchases, persistent drafts,
or research-result cache. Without credentials, money snapshots remain usable;
AI calls clearly report that the agent is not connected.

Tests: `python -m unittest finance.test_finance business.test_business`.
Provider responses are mocked in tests; a live key is needed for an end-to-end AI test.
