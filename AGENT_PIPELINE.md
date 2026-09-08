# D-Flow agent handover

Run `python -m uvicorn business.business:app --reload` from this repository.
The shared app serves Business, Finance, Life and Pricing.

Set `GEMINI_API_KEY` and `GEMINI_MODEL` in the server environment. Finance and Life
can override the model with `GEMINI_FINANCE_MODEL` and `GEMINI_LIFE_MODEL`; research
requires Google Search grounding. No credentials are shipped or stored in the UI.

## User input JSON

Every submitted Business proposal/simulation, Finance snapshot/clarification/research,
and Life clarification/research creates its own file:

`data/inputs/<domain>/<request-id>.json`

The object contains `request_id`, `domain`, `stage`, `created_at` and `variables`.
The validated user input lives under `variables`. The backend closes the file,
reads it back, and uses that document to construct the agent input. Requests fail
before the provider call if saving fails. Files are retained locally, excluded from
Git and not served by the application. `DFLOW_DATA_DIR` can relocate storage.
The app does not provide authentication or multi-user hosting: run it locally.

## Predefined prompts

- `prompts/business.txt`: business objectives, strategies, constraints, financial formulas.
- `prompts/finance.txt`: personal goals, research, financial interpretation and formulas.
- `prompts/life.txt`: non-financial life choices, similar experiences and suggestions.

These files are loaded for agent requests. Stage-specific instructions accompany
them, with the input JSON clearly delimited as data.

## AI-defined arithmetic

Business proposals include per-scenario formulas. The UI retains these while inputs
are edited and Python recalculates them alongside the baseline scenario model.
Finance generates formulas after research discovery, evaluates them in Python,
then supplies the results to the verification/conclusion pass.
Allowed syntax: numeric variables/constants, parentheses, +, -, *, / and bounded **.
No eval, exec, calls, attributes, filesystem access or generated Python execution.
Unknown variables, invalid operations and excessive results become explicit errors.
Unit labels and formula suitability still need review; syntax validation does not
prove a financial model is correct. Missing required data is requested, not invented.

Life performs search discovery and a second verification pass, including comparable
cases with anecdotes distinguished from general evidence. It produces suggestions,
trade-offs and reversible experiments, not financial rankings.

Research requires traceable source metadata; failed or ungrounded responses do not
become researched conclusions. Live AI verification requires configured credentials.

Run checks: `python -m unittest business.test_business finance.test_finance life.test_life`.
