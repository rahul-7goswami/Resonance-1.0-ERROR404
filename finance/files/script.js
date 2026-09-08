'use strict';

/* =============================================================================
   STATE
   ============================================================================= */

const appState = {
  domains: [],        // { id, name, description, minValue, maxValue, selectedValue }
  currentStep: 1,
  scenarios: [],       // populated by generateScenarios()
  selectedScenario: null,
};

const SUGGESTED_DOMAINS = [
  'Purchase', 'Investment', 'Liquidation', 'Monthly Income',
  'Estimated Spending', 'Savings', 'Emergency Fund', 'Debt Repayment',
];

const MIN_VALUE_FLOOR = 1;          // a minimum of 0 breaks max = min * 1000
const MIN_VALUE_CEILING = 1_000_000_000; // 100 crore — guards against absurd inputs

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

function formatINR(value) {
  if (!Number.isFinite(value)) return '—';
  return inr.format(value);
}

function uid() {
  return 'd_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

/* =============================================================================
   DOM REFERENCES
   ============================================================================= */

const el = {
  domainForm: document.getElementById('domainForm'),
  domainInput: document.getElementById('domainInput'),
  domainError: document.getElementById('domainError'),
  domainList: document.getElementById('domainList'),
  emptyState: document.getElementById('emptyState'),
  domainCountHint: document.getElementById('domainCountHint'),
  toStep2Btn: document.getElementById('toStep2Btn'),
  suggestions: document.getElementById('suggestions'),

  rangeCards: document.getElementById('rangeCards'),
  backTo1Btn: document.getElementById('backTo1Btn'),
  toStep3Btn: document.getElementById('toStep3Btn'),

  reviewList: document.getElementById('reviewList'),
  backTo2Btn: document.getElementById('backTo2Btn'),
  confirmBtn: document.getElementById('confirmBtn'),

  simOverlay: document.getElementById('simOverlay'),
  simLine: document.getElementById('simLine'),

  bestPanel: document.getElementById('bestPanel'),
  outcomeGrid: document.getElementById('outcomeGrid'),
  explainBox: document.getElementById('explainBox'),
  inputSummary: document.getElementById('inputSummary'),
  modifyBtn: document.getElementById('modifyBtn'),
  resetBtn: document.getElementById('resetBtn'),

  progressRail: document.getElementById('progressRail'),
};

/* =============================================================================
   STEP NAVIGATION
   ============================================================================= */

function goToStep(step) {
  appState.currentStep = step;
  document.querySelectorAll('.view').forEach((v) => {
    v.hidden = Number(v.dataset.view) !== step;
  });
  document.querySelectorAll('.progress-step').forEach((p) => {
    const s = Number(p.dataset.step);
    p.classList.toggle('is-active', s === step);
    p.classList.toggle('is-done', s < step);
  });
  el.progressRail.setAttribute('aria-valuenow', String(step));
  const mainEl = document.getElementById('main');
  if (typeof mainEl.scrollIntoView === 'function') {
    mainEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

/* =============================================================================
   STEP 1 — DOMAIN MANAGEMENT
   ============================================================================= */

function validateDomainName(name) {
  const trimmed = (name || '').trim();
  if (!trimmed) {
    return { valid: false, message: 'Enter a domain name before adding it.' };
  }
  if (trimmed.length > 60) {
    return { valid: false, message: 'Keep domain names under 60 characters.' };
  }
  const isDuplicate = appState.domains.some(
    (d) => d.name.toLowerCase() === trimmed.toLowerCase()
  );
  if (isDuplicate) {
    return { valid: false, message: `"${trimmed}" has already been added.` };
  }
  return { valid: true, value: trimmed };
}

function addDomain(name) {
  const result = validateDomainName(name);
  if (!result.valid) {
    el.domainError.textContent = result.message;
    return false;
  }
  el.domainError.textContent = '';
  appState.domains.push({
    id: uid(),
    name: result.value,
    description: '',
    minValue: null,
    maxValue: null,
    selectedValue: null,
  });
  renderDomainCards();
  return true;
}

function removeDomain(id) {
  appState.domains = appState.domains.filter((d) => d.id !== id);
  renderDomainCards();
}

function renderDomainCards() {
  el.domainList.innerHTML = '';
  appState.domains.forEach((domain, index) => {
    const li = document.createElement('li');
    li.className = 'domain-item';
    li.innerHTML = `
      <span class="domain-item-index">${String(index + 1).padStart(2, '0')}</span>
      <span class="domain-item-name">${escapeHTML(domain.name)}</span>
      <button type="button" class="domain-item-remove" aria-label="Remove ${escapeHTML(domain.name)}">×</button>
    `;
    li.querySelector('.domain-item-remove').addEventListener('click', () => removeDomain(domain.id));
    el.domainList.appendChild(li);
  });

  const count = appState.domains.length;
  el.domainCountHint.textContent = `${count} domain${count === 1 ? '' : 's'} added`;
  el.toStep2Btn.disabled = count === 0;
  el.emptyState.classList.toggle('is-hidden', count > 0);
}

function renderSuggestions() {
  el.suggestions.innerHTML = '';
  SUGGESTED_DOMAINS.forEach((name) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'suggestion-chip';
    chip.textContent = `+ ${name}`;
    chip.addEventListener('click', () => addDomain(name));
    el.suggestions.appendChild(chip);
  });
}

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

el.domainForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (addDomain(el.domainInput.value)) {
    el.domainInput.value = '';
    el.domainInput.focus();
  }
});

el.toStep2Btn.addEventListener('click', () => {
  if (appState.domains.length === 0) return;
  renderRangeConfig();
  goToStep(2);
});

/* =============================================================================
   STEP 2 — RANGE CONFIGURATION
   maximum = minimum * 1000 (never user-editable)
   ============================================================================= */

function calculateRange(minValue) {
  return minValue * 1000;
}

function validateMinValue(raw) {
  if (raw === '' || raw === null || raw === undefined) {
    return { valid: false, message: 'Enter a minimum value.' };
  }
  const num = Number(raw);
  if (Number.isNaN(num) || !Number.isFinite(num)) {
    return { valid: false, message: 'Minimum must be a valid number.' };
  }
  if (num < MIN_VALUE_FLOOR) {
    return { valid: false, message: `Minimum must be at least ${formatINR(MIN_VALUE_FLOOR)}.` };
  }
  if (num > MIN_VALUE_CEILING) {
    return { valid: false, message: `Minimum is too large. Keep it under ${formatINR(MIN_VALUE_CEILING)}.` };
  }
  return { valid: true, value: num };
}

function renderRangeConfig() {
  el.rangeCards.innerHTML = '';

  appState.domains.forEach((domain) => {
    const card = document.createElement('div');
    card.className = 'range-card';
    card.dataset.id = domain.id;

    const hasRange = domain.minValue !== null;

    card.innerHTML = `
      <h3 class="range-card-title">${escapeHTML(domain.name)}</h3>
      <div class="range-card-row">
        <div class="range-field">
          <label for="min-${domain.id}">Minimum value (₹)</label>
          <input type="number" id="min-${domain.id}" class="min-input" min="${MIN_VALUE_FLOOR}" step="1"
                 value="${hasRange ? domain.minValue : ''}" placeholder="e.g. 50000">
        </div>
        <div class="range-field readout">
          <label>Maximum value (auto: min × 1000)</label>
          <div class="value max-readout">${hasRange ? formatINR(domain.maxValue) : '—'}</div>
        </div>
      </div>
      <p class="range-error"></p>

      <div class="selected-readout">
        <span class="label">Selected scenario value</span>
        <span class="value selected-readout-value">${hasRange ? formatINR(domain.selectedValue) : '—'}</span>
      </div>
      <input type="range" class="value-slider" min="${hasRange ? domain.minValue : 0}"
             max="${hasRange ? domain.maxValue : 1}" step="1"
             value="${hasRange ? domain.selectedValue : 0}" ${hasRange ? '' : 'disabled'}
             aria-label="Selected value for ${escapeHTML(domain.name)}">
      <div class="range-bounds-labels">
        <span class="min-label">${hasRange ? formatINR(domain.minValue) : '₹0'}</span>
        <span class="max-label">${hasRange ? formatINR(domain.maxValue) : '₹0'}</span>
      </div>
    `;

    const minInput = card.querySelector('.min-input');
    const errorEl = card.querySelector('.range-error');
    const slider = card.querySelector('.value-slider');
    const maxReadout = card.querySelector('.max-readout');
    const selectedReadout = card.querySelector('.selected-readout-value');
    const minLabel = card.querySelector('.min-label');
    const maxLabel = card.querySelector('.max-label');

    minInput.addEventListener('input', () => {
      const result = validateMinValue(minInput.value);
      if (!result.valid) {
        errorEl.textContent = result.message;
        domain.minValue = null;
        domain.maxValue = null;
        domain.selectedValue = null;
        slider.disabled = true;
        maxReadout.textContent = '—';
        selectedReadout.textContent = '—';
        minLabel.textContent = '₹0';
        maxLabel.textContent = '₹0';
        return;
      }
      errorEl.textContent = '';
      const min = result.value;
      const max = calculateRange(min);
      domain.minValue = min;
      domain.maxValue = max;
      domain.selectedValue = min; // slider default = minimum, per spec

      slider.disabled = false;
      slider.min = String(min);
      slider.max = String(max);
      slider.value = String(min);

      maxReadout.textContent = formatINR(max);
      selectedReadout.textContent = formatINR(min);
      minLabel.textContent = formatINR(min);
      maxLabel.textContent = formatINR(max);
    });

    slider.addEventListener('input', () => {
      const val = Number(slider.value);
      domain.selectedValue = val;
      selectedReadout.textContent = formatINR(val);
    });

    el.rangeCards.appendChild(card);
  });
}

el.backTo1Btn.addEventListener('click', () => goToStep(1));

el.toStep3Btn.addEventListener('click', () => {
  const incomplete = appState.domains.find((d) => d.minValue === null || Number.isNaN(d.minValue));
  if (incomplete) {
    alert(`Set a minimum value for "${incomplete.name}" before continuing.`);
    return;
  }
  renderReview();
  goToStep(3);
});

/* =============================================================================
   STEP 3 — REVIEW
   ============================================================================= */

function renderReview() {
  el.reviewList.innerHTML = `
    <div class="review-row head">
      <span>Domain</span><span>Minimum</span><span>Maximum</span><span>Selected</span>
    </div>
  `;
  appState.domains.forEach((d) => {
    const row = document.createElement('div');
    row.className = 'review-row';
    row.innerHTML = `
      <span class="name">${escapeHTML(d.name)}</span>
      <span class="figure">${formatINR(d.minValue)}</span>
      <span class="figure">${formatINR(d.maxValue)}</span>
      <span class="figure selected">${formatINR(d.selectedValue)}</span>
    `;
    el.reviewList.appendChild(row);
  });
}

el.backTo2Btn.addEventListener('click', () => {
  renderRangeConfig();
  goToStep(2);
});

el.confirmBtn.addEventListener('click', () => {
  runSimulationAnimation().then(() => {
    generateScenarios();
    rankScenarios();
    renderResults();
    goToStep(4);
  });
});

/* =============================================================================
   SIMULATION LOADING ANIMATION (~1.4s total, per spec: fast, demo-friendly)
   ============================================================================= */

function runSimulationAnimation() {
  const lines = [
    'Analyzing financial relationships…',
    'Generating scenarios…',
    'Evaluating feasibility…',
    'Evaluating sustainability…',
    'Ranking outcomes…',
  ];
  el.simOverlay.hidden = false;
  let i = 0;
  el.simLine.textContent = lines[0];
  return new Promise((resolve) => {
    const interval = setInterval(() => {
      i += 1;
      if (i < lines.length) {
        el.simLine.textContent = lines[i];
      } else {
        clearInterval(interval);
        el.simOverlay.hidden = true;
        resolve();
      }
    }, 280); // 5 lines * 280ms ≈ 1.4s
  });
}

/* =============================================================================
   DECISION / SCORING ENGINE
   ---------------------------------------------------------------------------
   Pipeline: USER INPUT → VALIDATION → SCENARIO GENERATION → DECISION ENGINE
             → SCORING ENGINE → RANKING → RESULTS
   Structured as pure functions operating on plain data so this layer could
   be lifted into a real backend service unchanged.

   Model
   -----
   Every domain's user-selected value sits somewhere between its own min and
   max. We express that position as an "intensity" in [0, 1]:
       intensity = (selectedValue - min) / (max - min)
   Each scenario variant (Conservative / Balanced / Growth / Aggressive)
   re-targets every domain's intensity toward a different point on that
   scale, blended with the user's own baseline so a domain the user already
   pushed high stays relatively higher in every variant.

   From the resulting set of per-domain intensities we derive:
     - meanIntensity  : overall resource commitment across all domains
     - spread (stdev) : how concentrated vs. diversified the allocation is

   Feasibility, sustainability, risk, liquidity and balance are all
   deterministic functions of meanIntensity and spread — documented weight
   by weight below, so a judge (or another engineer) can trace any score
   back to the two numbers that produced it.
   ============================================================================= */

const SCENARIO_DEFS = [
  { key: 'conservative', name: 'Conservative Strategy', target: 0.20, blend: 0.35 },
  { key: 'balanced',     name: 'Balanced Strategy',     target: 0.50, blend: 0.55 },
  { key: 'growth',       name: 'Growth Strategy',       target: 0.68, blend: 0.65 },
  { key: 'aggressive',   name: 'Aggressive Strategy',   target: 0.88, blend: 0.75 },
];

function domainIntensity(domain) {
  const range = domain.maxValue - domain.minValue;
  if (range <= 0) return 0;
  const raw = (domain.selectedValue - domain.minValue) / range;
  return clamp01(raw);
}

function clamp01(n) {
  return Math.max(0, Math.min(1, n));
}

function mean(arr) {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stdev(arr) {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const variance = mean(arr.map((v) => (v - m) ** 2));
  return Math.sqrt(variance);
}

/**
 * Builds one scenario variant: re-targeted per-domain values plus the
 * aggregate stats used for scoring.
 */
function buildScenarioVariant(def, baselineIntensities) {
  const perDomainIntensity = appState.domains.map((domain, idx) => {
    const baseline = baselineIntensities[idx];
    const retargeted = baseline * (1 - def.blend) + def.target * def.blend;
    return clamp01(retargeted);
  });

  const allocations = appState.domains.map((domain, idx) => {
    const intensity = perDomainIntensity[idx];
    const value = Math.round(domain.minValue + intensity * (domain.maxValue - domain.minValue));
    return { domainId: domain.id, domainName: domain.name, intensity, value };
  });

  const meanIntensity = mean(perDomainIntensity);
  const spread = stdev(perDomainIntensity); // 0 = perfectly even, higher = concentrated

  return { def, allocations, meanIntensity, spread };
}

/**
 * Scoring engine. Every formula is a plain function of meanIntensity (0-1,
 * overall resource commitment) and spread (0-1-ish, concentration).
 * All outputs are clamped to [0, 100].
 */
function scoreVariant({ meanIntensity, spread }) {
  const pct = (n) => Math.round(clamp01(n) * 100);

  // Feasibility: falls as commitment rises — a fully-committed scenario is
  // harder to actually execute against real-world constraints.
  const feasibility = pct(1 - meanIntensity * 0.72 - spread * 0.25);

  // Sustainability: penalizes heavy commitment more steeply than
  // feasibility does (long-run depletion), and separately penalizes
  // concentration in one or two domains (fragility to a single shock).
  const sustainability = pct(1 - meanIntensity * 0.80 - spread * 0.35);

  // Risk: rises with both commitment and concentration. Reported directly
  // as a 0-100 "risk level" (higher = riskier) rather than inverted.
  const risk = pct(meanIntensity * 0.62 + spread * 0.55);

  // Liquidity: how much flexibility is left after these allocations.
  const liquidity = pct(1 - meanIntensity * 0.85);

  // Financial balance: rewards an even spread across domains and
  // penalizes both extremes of commitment (too little = underused,
  // too much = overextended) via a distance-from-midpoint term.
  const balance = pct(1 - spread * 0.9 - Math.abs(meanIntensity - 0.5) * 0.4);

  // Overall score. NOTE: we use (100 - risk) here rather than raw risk —
  // risk is a cost, not a benefit, so it must subtract from the overall
  // score for the ranking to make intuitive sense (a high-risk scenario
  // should not score higher for being risky). Weights otherwise follow
  // the brief's own weighting scheme and sum to 1.00:
  //   feasibility 0.30, sustainability 0.30, (100-risk) 0.15,
  //   liquidity 0.15, balance 0.10
  const overallScore = Math.round(
    feasibility * 0.30 +
    sustainability * 0.30 +
    (100 - risk) * 0.15 +
    liquidity * 0.15 +
    balance * 0.10
  );

  return { feasibility, sustainability, risk, liquidity, balance, overallScore };
}

function riskLabel(risk) {
  if (risk < 25) return 'Very Low';
  if (risk < 40) return 'Low';
  if (risk < 60) return 'Medium';
  if (risk < 80) return 'High';
  return 'Very High';
}

function riskTagClass(risk) {
  if (risk < 40) return 'low';
  if (risk < 65) return 'medium';
  return 'high';
}

/**
 * Generates all scenario variants from the user's confirmed domain values.
 * Populates appState.scenarios. Deterministic — no randomness — so a demo
 * run is always reproducible from the same inputs.
 */
function generateScenarios() {
  const baselineIntensities = appState.domains.map(domainIntensity);

  appState.scenarios = SCENARIO_DEFS.map((def) => {
    const variant = buildScenarioVariant(def, baselineIntensities);
    const scores = scoreVariant(variant);
    return {
      key: def.key,
      name: def.name,
      allocations: variant.allocations,
      meanIntensity: variant.meanIntensity,
      spread: variant.spread,
      ...scores,
    };
  });
}

function rankScenarios() {
  appState.scenarios.sort((a, b) => b.overallScore - a.overallScore);
  appState.selectedScenario = appState.scenarios[0];
}

/* =============================================================================
   STEP 4 — RESULTS RENDERING
   ============================================================================= */

function metricBar(label, value, isRisk = false) {
  return `
    <div class="metric-row">
      <div class="metric-row-labels"><span>${label}</span><span>${value}%</span></div>
      <div class="metric-bar-track">
        <div class="metric-bar-fill ${isRisk ? 'risk' : ''}" style="width:${value}%"></div>
      </div>
    </div>
  `;
}

function renderResults() {
  const best = appState.selectedScenario;

  el.bestPanel.innerHTML = `
    <div>
      <p class="best-panel-heading">Recommended outcome</p>
      <h3 class="best-panel-name">${best.name}</h3>
      <div class="best-panel-score">${best.overallScore}<span>/100</span></div>
      <span class="risk-tag ${riskTagClass(best.risk)}">${riskLabel(best.risk)} risk</span>
    </div>
    <div>
      ${metricBar('Feasibility', best.feasibility)}
      ${metricBar('Sustainability', best.sustainability)}
      ${metricBar('Liquidity', best.liquidity)}
      ${metricBar('Risk', best.risk, true)}
    </div>
  `;

  el.outcomeGrid.innerHTML = '';
  appState.scenarios.forEach((s, idx) => {
    const card = document.createElement('div');
    card.className = 'outcome-card' + (idx === 0 ? ' is-best' : '');
    card.innerHTML = `
      <div class="outcome-rank">#${idx + 1}${idx === 0 ? ' — Recommended' : ''}</div>
      <div class="outcome-name">${s.name}</div>
      <div class="outcome-score">${s.overallScore}<span style="font-size:14px;color:var(--paper-dim)">/100</span></div>
      <div class="outcome-metrics">
        <div class="row"><span>Feasibility</span><span>${s.feasibility}%</span></div>
        <div class="row"><span>Sustainability</span><span>${s.sustainability}%</span></div>
        <div class="row"><span>Liquidity</span><span>${s.liquidity}%</span></div>
      </div>
      <span class="risk-tag ${riskTagClass(s.risk)}">${riskLabel(s.risk)} risk</span>
    `;
    el.outcomeGrid.appendChild(card);
  });

  renderExplainability(best);

  el.inputSummary.innerHTML = '';
  appState.domains.forEach((d) => {
    const row = document.createElement('div');
    row.className = 'input-summary-row';
    row.innerHTML = `<span>${escapeHTML(d.name)}</span><span class="figure">${formatINR(d.selectedValue)}</span>`;
    el.inputSummary.appendChild(row);
  });
}

/**
 * Generates explanations grounded in the ACTUAL computed numbers for the
 * winning scenario — no generic boilerplate per scenario type.
 */
function renderExplainability(best) {
  const points = [];

  if (best.liquidity >= 60) {
    points.push(
      `This allocation keeps ${best.liquidity}% liquidity headroom, leaving enough flexibility to cover other financial objectives if priorities shift.`
    );
  } else if (best.liquidity < 35) {
    points.push(
      `Liquidity is tight at ${best.liquidity}% — most available capacity is committed to this scenario, so an unexpected expense would be harder to absorb.`
    );
  } else {
    points.push(
      `Liquidity sits at a moderate ${best.liquidity}%, balancing commitment to this scenario against room to maneuver.`
    );
  }

  const spreadPct = Math.round(best.spread * 100);
  if (spreadPct < 12) {
    points.push(
      `Allocation is spread evenly across your ${appState.domains.length} domain${appState.domains.length === 1 ? '' : 's'} (${spreadPct}% variance), which supports the ${best.balance}% balance score — no single domain dominates the outcome.`
    );
  } else {
    const sorted = [...best.allocations].sort((a, b) => b.intensity - a.intensity);
    const heaviest = sorted[0];
    points.push(
      `"${heaviest.domainName}" carries the largest share of this scenario (${formatINR(heaviest.value)}), which concentrates risk there more than in your other domains.`
    );
  }

  if (best.risk < 40) {
    points.push(
      `Risk is measured at ${best.risk}%, mainly because the overall commitment level (${Math.round(best.meanIntensity * 100)}% of available range) stays well inside a sustainable band.`
    );
  } else {
    points.push(
      `Risk runs higher at ${best.risk}%, driven by an overall commitment level of ${Math.round(best.meanIntensity * 100)}% across your ranges — the trade-off for pursuing more upside.`
    );
  }

  points.push(
    `Feasibility (${best.feasibility}%) and sustainability (${best.sustainability}%) combine with the above to produce an overall score of ${best.overallScore}/100, ahead of the next-best option, ${appState.scenarios[1] ? appState.scenarios[1].name : 'the alternative'}.`
  );

  el.explainBox.innerHTML = `<ul>${points.map((p) => `<li>${p}</li>`).join('')}</ul>`;
}

el.modifyBtn.addEventListener('click', () => {
  renderRangeConfig();
  goToStep(2);
});

el.resetBtn.addEventListener('click', () => {
  if (!confirm('This clears all domains and scenario data. Start over?')) return;
  resetScenario();
});

function resetScenario() {
  appState.domains = [];
  appState.currentStep = 1;
  appState.scenarios = [];
  appState.selectedScenario = null;
  renderDomainCards();
  goToStep(1);
}

/* =============================================================================
   INIT
   ============================================================================= */

renderSuggestions();
renderDomainCards();
goToStep(1);
