(function () {
  'use strict';

  // Externalised from an inline <script> block (2026-07-27): static-web's
  // CSP is `script-src 'self' ...` with no 'unsafe-inline' and no nonce, so
  // an inline <script> is silently blocked by the browser before a single
  // line runs — including the click listener at the bottom of this file.
  // That's why "click did nothing": the listener was never attached. An
  // external 'self'-origin file is allowed by the same policy.

  var $ = function (id) { return document.getElementById(id); };

  // Pre-fill from this page's OWN localStorage, if this origin happens to
  // have one (e.g. static-web served locally and logged into directly).
  // localStorage is origin-scoped, so a different host than where you
  // logged in won't see clasr.ai's token automatically — paste it manually
  // in that case (see note above the field). Wrapped in try/catch: some
  // browsers throw (not just return null) on localStorage access under
  // restrictive contexts, and that must never be able to block the rest of
  // this file from running.
  try {
    var storedToken = localStorage.getItem('clasr:at');
    if (storedToken) $('v2p-token').value = storedToken;
  } catch (e) { /* ignore — manual paste still works */ }

  var SEVERITY_CLASS = { 4: 'critical', 3: 'major', 2: 'minor', 1: 'minor', 0: 'info' };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function severityBadge(n) {
    var cls = SEVERITY_CLASS[n] !== undefined ? SEVERITY_CLASS[n] : 'info';
    return '<span class="severity severity--' + cls + '">' + esc(cls.toUpperCase()) + ' (' + n + ')</span>';
  }

  function renderSummary(report) {
    var rows = [
      ['Risk band', report.risk_band],
      ['Raw score', report.raw_score],
      ['Signals', report.scored_signals.length],
      ['Dropped (unverifiable)', report.dropped_unverifiable],
      ['Taxonomy gap flagged', report.taxonomy_gap_flagged ? 'yes' : 'no'],
    ];
    var html = '<div class="v2p-summary-row">';
    rows.forEach(function (r) {
      html += '<div class="v2p-summary-card"><div class="label">' + esc(r[0]) + '</div><div class="value">' + esc(r[1]) + '</div></div>';
    });
    html += '</div>';
    return html;
  }

  function renderScoredSignals(list) {
    if (!list.length) return '<p class="v2p-empty">No signals detected.</p>';
    return list.map(function (s) {
      return '<div class="v2p-card">' +
        '<div class="v2p-card-head">' + severityBadge(s.severity) + '<strong>' + esc(s.signal_id) + '</strong>' +
        '<span class="v2p-card-meta">' + esc(s.section) + ' · weight ' + esc(s.weight) + ' · contribution ' + esc(s.contribution) + ' · ' + esc(s.basis) + ' · ' + esc(s.verification_method) + '</span></div>' +
        '<blockquote>' + esc(s.evidence_quote) + '</blockquote>' +
        '</div>';
    }).join('');
  }

  function renderPAS(pas) {
    if (!pas.entries.length) return '<p class="v2p-empty">No PAS-eligible signals in this report.</p>';
    var html = pas.entries.map(function (c, i) {
      return '<div class="v2p-card">' +
        '<div class="v2p-card-head"><strong>[' + (i + 1) + '] ' + esc(c.label) + '</strong>' +
        '<span class="v2p-card-meta">' + esc(c.section) + ' · ' + esc(c.inferenceType) + ' · confidence ' + esc(c.confidence.applied) + (c.confidence.capped ? ' (capped from ' + esc(c.confidence.declared) + ')' : '') + '</span></div>' +
        '<blockquote>' + esc(c.evidence) + '</blockquote>' +
        '<p class="inference">' + esc(c.inference) + '</p>' +
        '</div>';
    }).join('');
    html += '<p class="v2p-card-meta">' + esc(pas.excluded_count) + ' other detected signal(s) not PAS-eligible.' + (pas.note ? ' ' + esc(pas.note) : '') + '</p>';
    return html;
  }

  function renderCategorical(report) {
    var dr = report.desk_reject_profile, ov = report.overreach_pattern, rr = report.reproducibility_risk, ip = report.integrated_posture;
    var zoneList = Object.keys(dr.zones).map(function (z) {
      return '<li>' + (dr.zones[z] ? '✓' : '·') + ' ' + esc(z) + '</li>';
    }).join('');
    return '<div class="v2p-summary-row">' +
      '<div class="v2p-summary-card"><div class="label">Desk-reject cooccurrence</div><div class="value">' + esc(dr.cooccurrence) + '</div></div>' +
      '<div class="v2p-summary-card"><div class="label">Overreach pattern</div><div class="value">' + esc(ov.pattern) + '</div></div>' +
      '<div class="v2p-summary-card"><div class="label">Reproducibility risk</div><div class="value">' + esc(rr) + '</div></div>' +
      '<div class="v2p-summary-card"><div class="label">Integrated posture</div><div class="value">' + esc(ip.level) + (ip.partial ? ' (partial)' : '') + '</div></div>' +
      '</div>' +
      '<p class="v2p-card-meta">Desk-reject active zones: <ul style="margin:4px 0 0 18px;">' + zoneList + '</ul></p>' +
      (ov.instances ? '<p class="v2p-card-meta">Overreach: ' + ov.instances + ' instance(s), types: ' + esc(ov.types.join(', ')) + ', highest: ' + esc(ov.highestSeverity) + '</p>' : '');
  }

  function renderReport(report) {
    var html = '';
    html += '<div class="v2p-section"><h2>Summary</h2>' + renderSummary(report) + '</div>';
    html += '<div class="v2p-section"><h2>Priority Action Signals</h2>' + renderPAS(report.priority_action_signals) + '</div>';
    html += '<div class="v2p-section"><h2>Categorical resolution</h2>' + renderCategorical(report) + '</div>';
    html += '<div class="v2p-section"><h2>All scored signals</h2>' + renderScoredSignals(report.scored_signals) + '</div>';
    html += '<div class="v2p-section"><h2><span class="v2p-json-toggle" id="v2p-json-toggle">Show raw JSON</span></h2><pre id="v2p-json-raw" class="v2p-json-raw" hidden>' + esc(JSON.stringify(report, null, 2)) + '</pre></div>';
    $('v2p-results').innerHTML = html;
    $('v2p-json-toggle').addEventListener('click', function () {
      var el = $('v2p-json-raw');
      el.hidden = !el.hidden;
      this.textContent = el.hidden ? 'Show raw JSON' : 'Hide raw JSON';
    });
  }

  function readForm() {
    return {
      apiBase: $('v2p-api-base').value.replace(/\/$/, ''),
      text: $('v2p-text').value.trim(),
      runs: $('v2p-runs').value,
      token: $('v2p-token').value.trim(),
    };
  }

  function setBusy(busy, statusText) {
    $('v2p-run').disabled = busy;
    $('v2p-run-async').disabled = busy;
    $('v2p-status').textContent = statusText || '';
  }

  $('v2p-run').addEventListener('click', function () {
    var f = readForm();
    if (!f.text) { return; }
    if (!f.token) {
      $('v2p-error').hidden = false;
      $('v2p-error').textContent = 'Paste an access token first (see note above the field).';
      return;
    }

    setBusy(true, 'Running (this can take 10-90s depending on runs)...');
    $('v2p-error').hidden = true;
    $('v2p-results').innerHTML = '';

    var fd = new FormData();
    fd.append('text', f.text);
    if (f.runs) fd.append('runs', f.runs);

    fetch(f.apiBase + '/analyze/v2', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + f.token },
      body: fd,
    })
      .then(function (res) {
        return res.json().then(function (data) { return { ok: res.ok, status: res.status, data: data }; });
      })
      .then(function (r) {
        setBusy(false);
        if (!r.ok) {
          $('v2p-error').hidden = false;
          $('v2p-error').textContent = 'Error ' + r.status + ': ' + JSON.stringify(r.data, null, 2);
          return;
        }
        renderReport(r.data.report);
      })
      .catch(function (err) {
        setBusy(false);
        $('v2p-error').hidden = false;
        $('v2p-error').textContent = 'Request failed: ' + err.message + '\n\nIs the local backend running at ' + f.apiBase + '?';
      });
  });

  // "Real flow" path: POST /api/readings/start-v2 (job queue) -> poll
  // /api/processing/:jobId -> link to dashboard/reading-v2/, matching how
  // the actual production "New reading" button works today for v1.
  $('v2p-run-async').addEventListener('click', function () {
    var f = readForm();
    if (!f.text) { return; }
    if (!f.token) {
      $('v2p-error').hidden = false;
      $('v2p-error').textContent = 'Paste an access token first (see note above the field).';
      return;
    }

    // localStorage, not sessionStorage: the report link below opens with
    // rel="noopener" (deliberately, since it's an external-feeling nav), and
    // noopener severs sessionStorage inheritance to the new tab in Chromium.
    // localStorage is shared across same-origin tabs regardless of opener.
    try {
      localStorage.setItem('clasr:v2test:token', f.token);
      localStorage.setItem('clasr:v2test:apiBase', f.apiBase);
    } catch (e) { /* ignore */ }

    setBusy(true, 'Starting job...');
    $('v2p-error').hidden = true;
    $('v2p-results').innerHTML = '';

    var fd = new FormData();
    fd.append('text', f.text);
    if (f.runs) fd.append('runs', f.runs);

    fetch(f.apiBase + '/api/readings/start-v2', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + f.token },
      body: fd,
    })
      .then(function (res) {
        return res.json().then(function (data) { return { ok: res.ok, status: res.status, data: data }; });
      })
      .then(function (r) {
        if (!r.ok) {
          setBusy(false);
          $('v2p-error').hidden = false;
          $('v2p-error').textContent = 'Error ' + r.status + ': ' + JSON.stringify(r.data, null, 2);
          return;
        }
        pollJob(f.apiBase, f.token, r.data.jobId);
      })
      .catch(function (err) {
        setBusy(false);
        $('v2p-error').hidden = false;
        $('v2p-error').textContent = 'Request failed: ' + err.message + '\n\nIs the local backend running at ' + f.apiBase + '?';
      });
  });

  function pollJob(apiBase, token, jobId) {
    setBusy(true, 'Processing (job ' + jobId + ')...');
    var timer = setInterval(function () {
      fetch(apiBase + '/api/processing/' + jobId, { headers: { Authorization: 'Bearer ' + token } })
        .then(function (res) { return res.json(); })
        .then(function (data) {
          var job = data.job;
          if (!job) return;
          if (job.status === 'processing') {
            $('v2p-status').textContent = 'Processing (job ' + jobId + ', ' + job.progress + '%)...';
            return;
          }
          clearInterval(timer);
          setBusy(false);
          if (job.status === 'complete') {
            $('v2p-results').innerHTML = '<p class="v2p-note">Job complete. <a href="' + esc(job.reportUrl) +
              '" target="_blank" rel="noopener">Open the rendered report at ' + esc(job.reportUrl) + '</a> ' +
              '(token/API base are pre-filled there via sessionStorage).</p>';
          } else {
            $('v2p-error').hidden = false;
            $('v2p-error').textContent = 'Job failed: ' + (job.error || 'unknown error');
          }
        })
        .catch(function (err) {
          clearInterval(timer);
          setBusy(false);
          $('v2p-error').hidden = false;
          $('v2p-error').textContent = 'Polling failed: ' + err.message;
        });
    }, 2000);
  }
})();
