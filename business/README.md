# Business workspace

From the repository root:

```powershell
python -m pip install -r requirements.txt
python -m uvicorn business.business:app --reload --host 127.0.0.1 --port 8000
```

Open http://127.0.0.1:8000/business. The existing home page is served at `/`.
Opening the HTML directly does not start the Python backend.

For AI proposals, set `GEMINI_API_KEY` and `GEMINI_MODEL` in the server environment
before starting Uvicorn. Use a model available to your Google account that supports
structured JSON output. Environment files are not automatically loaded.
Credentials never enter the HTML or browser storage. The brief is sent to Gemini
only when the user presses **Suggest scenarios**. No live research is performed.

`business.html` collects input, makes same-origin requests and renders responses.
`business.py` owns validation, AI prompts/calls, scenario schemas, financial calculations,
formatting, feasibility checks and comparison logic. No generated code is executed.
Manual scenarios and the explicitly labelled illustrative example need no AI credentials.
There is no automatic replacement for a failed AI response.

The cash model evaluates incremental spending and revenue over 1–60 months. It
charges upfront spending at month 0, operating costs every month, and revenue from
the launch month. Required cash is the peak cumulative deficit. Recovery is the
first month from which cumulative cash remains nonnegative through the horizon.
Text constraints and qualitative assumptions need review; cash/team/launch limits
are checked automatically. Values are INR. No persistence is implemented; refreshing
starts a new workspace. API documentation is available at `/docs`.

Install test dependencies with `python -m pip install -r requirements-dev.txt`.
Run backend checks: `python -m unittest discover -s business -t . -p "test_*.py"`.
