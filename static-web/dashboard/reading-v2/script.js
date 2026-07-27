(function () {
  'use strict';

  // Internal test page — see index.html header comment. Render functions
  // duplicated from dashboard/v2-preview/script.js rather than shared: both
  // pages are disposable test scaffolding, not product code, per that file's
  // own "everything specific to this page is self-contained" note.

  var $ = function (id) { return document.getElementById(id); };

  function qsParam(name) {
    var m = new RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
    return m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : '';
  }

  // Token/API-base handoff between v2-preview and reading-v2: localStorage
  // under our own namespaced key (never the real clasr:at key, so this never
  // collides with or clobbers the real site's session). Must be localStorage,
  // not sessionStorage: this page is opened via a rel="noopener" link from
  // v2-preview, and noopener severs sessionStorage inheritance to the new tab
  // in Chromium — localStorage is shared across same-origin tabs regardless.
  // Falls back to the real site's clasr:at if this origin happens to have one.
  try {
    var savedToken = localStorage.getItem('clasr:v2test:token') || localStorage.getItem('clasr:at');
    if (savedToken) $('v2r-token').value = savedToken;
    var savedBase = localStorage.getItem('clasr:v2test:apiBase');
    if (savedBase) $('v2r-api-base').value = savedBase;
  } catch (e) { /* ignore — manual entry still works */ }

  var idFromUrl = qsParam('id');
  if (idFromUrl) $('v2r-id').value = idFromUrl;

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
    html += '<div class="v2p-section"><h2><span class="v2p-json-toggle" id="v2r-json-toggle">Show raw JSON</span></h2><pre id="v2r-json-raw" class="v2p-json-raw" hidden>' + esc(JSON.stringify(report, null, 2)) + '</pre></div>';
    $('v2r-results').innerHTML = html;
    $('v2r-json-toggle').addEventListener('click', function () {
      var el = $('v2r-json-raw');
      el.hidden = !el.hidden;
      this.textContent = el.hidden ? 'Show raw JSON' : 'Hide raw JSON';
    });
  }

  function load() {
    var apiBase = $('v2r-api-base').value.replace(/\/$/, '');
    var id = $('v2r-id').value.trim();
    var token = $('v2r-token').value.trim();
    $('v2r-error').hidden = true;
    $('v2r-results').innerHTML = '';

    if (!id) { $('v2r-status').textContent = 'Enter a reading id.'; return; }
    if (!token) {
      $('v2r-error').hidden = false;
      $('v2r-error').textContent = 'Paste an access token first.';
      return;
    }

    try {
      sessionStorage.setItem('clasr:v2test:token', token);
      sessionStorage.setItem('clasr:v2test:apiBase', apiBase);
    } catch (e) { /* ignore */ }

    $('v2r-status').textContent = 'Loading…';

    fetch(apiBase + '/api/readings/' + encodeURIComponent(id), {
      headers: { Authorization: 'Bearer ' + token },
    })
      .then(function (res) {
        return res.json().then(function (data) { return { ok: res.ok, status: res.status, data: data }; });
      })
      .then(function (r) {
        $('v2r-status').textContent = '';
        if (!r.ok) {
          $('v2r-error').hidden = false;
          $('v2r-error').textContent = 'Error ' + r.status + ': ' + JSON.stringify(r.data, null, 2);
          return;
        }
        var report = r.data.report;
        if (typeof report === 'string') {
          try { report = JSON.parse(report); } catch (e) {
            $('v2r-error').hidden = false;
            $('v2r-error').textContent = 'This reading is not a v2 JSON report (failed to parse report field): ' + e.message;
            return;
          }
        }
        renderReport(report);
      })
      .catch(function (err) {
        $('v2r-status').textContent = '';
        $('v2r-error').hidden = false;
        $('v2r-error').textContent = 'Request failed: ' + err.message + '\n\nIs the backend running at ' + apiBase + '?';
      });
  }

  $('v2r-load').addEventListener('click', load);
  if (idFromUrl && ($('v2r-token').value || '').trim()) load();
})();
