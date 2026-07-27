'use strict';

/**
 * Evidence verification — the single highest-value layer in this refactor.
 *
 * A signal whose quote cannot be located in the manuscript is not a weak
 * signal. It is a fabricated one, and shipping it destroys the
 * editorial-trust claim CLASR sells. So: unverifiable quote -> the signal is
 * DROPPED, not down-weighted.
 *
 * Ports Python's difflib.SequenceMatcher (Ratcliff/Obershelp) ratio directly
 * rather than substituting a cheaper similarity metric, so verification
 * behaviour matches the reference implementation this was calibrated
 * against. No external dependency — plain JS only.
 *
 * ANCHORED FUZZY MATCHING (2026-07-26). Ported from the same Python audit
 * as the negation check above. The original fuzzy pass here used a blind
 * fixed-stride scan (window/4) — cheap, but a real quote offset by roughly
 * half a window can score below FUZZY_THRESHOLD purely from the misalignment
 * and get rejected as fabricated. That's a worse failure mode than a missed
 * detection: it silently drops a genuine, verifiable finding. anchors() below
 * finds distinctive 4-word n-grams from the quote, locates them by exact
 * substring match, and positions the comparison window there instead of
 * guessing a stride — removing the misalignment failure mode for any quote
 * that shares a few consecutive words with its source (nearly all of them).
 * The blind stride scan still runs as a fallback, only when anchoring finds
 * nothing usable.
 *
 * NEGATION-AWARE ABSENCE CHECK (2026-07-26). Added after auditing a parallel
 * Python implementation of the same kit-derivation problem (see taxonomy.js's
 * SCHEMA-SIZE ISSUE note). For ABSENCE-shaped signals (taxonomy.js's
 * shapeOf()/absenceTermsOf() — a first tranche of ~18 signals whose claim is
 * "this declaration is missing"), quote location alone isn't enough: the
 * manuscript might state the very thing the signal claims is absent,
 * elsewhere in the text. A naive keyword scan for e.g. "funding" would even
 * match INSIDE the sentence that confirms the absence ("no funding was
 * received") and wrongly treat it as contradicting evidence. negativeSearch()
 * below is negation-aware for exactly this reason — see isNegated().
 */

const { shapeOf, absenceTermsOf, EvidenceShape } = require('./taxonomy');

// A quote that matches this closely after normalisation counts as located.
// 0.90 tolerates OCR noise, ligatures and whitespace damage from PDF
// extraction while still rejecting invented sentences. Tune against your
// gold set (see trialfiles/README.md §4).
const FUZZY_THRESHOLD = 0.90;

const MIN_QUOTE_WORDS = 6;

/** Collapse the differences PDF extraction introduces, nothing more. */
function normalise(text) {
  let t = String(text).normalize('NFKC');
  t = t.replace(/­/g, ''); // soft hyphen
  t = t.replace(/[‐-―]/g, '-'); // dash variants
  t = t.replace(/[‘’]/g, "'");
  t = t.replace(/[“”]/g, '"');
  t = t.replace(/-\s*\n\s*/g, ''); // de-hyphenate line breaks
  t = t.replace(/\s+/g, ' ');
  return t.trim().toLowerCase();
}

/** Cheap upper bound on ratio(), used to skip windows before doing real work. */
function realQuickRatio(a, b) {
  const la = a.length;
  const lb = b.length;
  if (la + lb === 0) return 1.0;
  return (2.0 * Math.min(la, lb)) / (la + lb);
}

/** Ratcliff/Obershelp longest contiguous matching block between a and b. */
function findLongestMatch(a, b) {
  const b2j = new Map();
  for (let j = 0; j < b.length; j++) {
    const ch = b[j];
    let arr = b2j.get(ch);
    if (!arr) { arr = []; b2j.set(ch, arr); }
    arr.push(j);
  }

  let bestI = 0, bestJ = 0, bestSize = 0;
  let j2len = new Map();
  for (let i = 0; i < a.length; i++) {
    const newJ2len = new Map();
    const indices = b2j.get(a[i]);
    if (indices) {
      for (const j of indices) {
        const k = (j2len.get(j - 1) || 0) + 1;
        newJ2len.set(j, k);
        if (k > bestSize) {
          bestI = i - k + 1;
          bestJ = j - k + 1;
          bestSize = k;
        }
      }
    }
    j2len = newJ2len;
  }
  return { i: bestI, j: bestJ, size: bestSize };
}

/** difflib.SequenceMatcher(a, b).ratio() — recursive matching-block sum. */
function sequenceRatio(a, b) {
  const total = a.length + b.length;
  if (total === 0) return 1.0;

  let matches = 0;
  const stack = [[0, a.length, 0, b.length]];
  while (stack.length) {
    const [aLow, aHigh, bLow, bHigh] = stack.pop();
    if (aLow >= aHigh || bLow >= bHigh) continue;
    const { i, j, size } = findLongestMatch(a.slice(aLow, aHigh), b.slice(bLow, bHigh));
    if (size === 0) continue;
    const ai = aLow + i;
    const bj = bLow + j;
    matches += size;
    stack.push([aLow, ai, bLow, bj]);
    stack.push([ai + size, aHigh, bj + size, bHigh]);
  }
  return (2.0 * matches) / total;
}

function round4(n) {
  return Math.round(n * 10000) / 10000;
}

const ANCHOR_WORDS = 4;
const MAX_ANCHOR_STARTS = 64;

/**
 * Distinctive n-grams from the quote, used to position the fuzzy comparison
 * window instead of guessing a stride. Prefers grams built from longer
 * (rarer-looking) words, since those are least likely to produce a spurious
 * exact match elsewhere in the source.
 * @param {string} q normalised quote
 * @returns {string[]}
 */
function anchors(q) {
  const words = q.split(' ').filter(Boolean);
  if (words.length <= ANCHOR_WORDS) return [q];
  const grams = [];
  for (let i = 0; i <= words.length - ANCHOR_WORDS; i++) {
    grams.push(words.slice(i, i + ANCHOR_WORDS).join(' '));
  }
  grams.sort((a, b) => {
    const lenOf = (g) => g.split(' ').reduce((sum, w) => sum + w.length, 0);
    return lenOf(b) - lenOf(a);
  });
  return grams.slice(0, 8);
}

/**
 * @returns {{located: boolean, method: 'exact'|'anchored'|'scanned'|'not_found'|'too_short',
 *            score: number, charOffset: number}}
 */
function locateQuote(quote, source) {
  const q = normalise(quote);
  const s = normalise(source);

  if (q.split(' ').filter(Boolean).length < MIN_QUOTE_WORDS) {
    // Short quotes match by accident. They prove nothing.
    return { located: false, method: 'too_short', score: 0.0, charOffset: -1 };
  }

  const idx = s.indexOf(q);
  if (idx !== -1) {
    return { located: true, method: 'exact', score: 1.0, charOffset: idx };
  }

  const window = q.length;
  let bestScore = 0.0, bestIdx = -1, bestMethod = 'not_found';

  // Pass 1 — anchored: position windows on exact n-gram hits.
  const starts = new Set();
  for (const gram of anchors(q)) {
    const offsetInQuote = q.indexOf(gram);
    let pos = s.indexOf(gram);
    while (pos !== -1 && starts.size < MAX_ANCHOR_STARTS) {
      starts.add(Math.max(0, pos - Math.max(0, offsetInQuote)));
      pos = s.indexOf(gram, pos + 1);
    }
  }
  for (const start of starts) {
    const chunk = s.slice(start, start + window);
    if (realQuickRatio(q, chunk) < FUZZY_THRESHOLD) continue;
    const scoreVal = sequenceRatio(q, chunk);
    if (scoreVal > bestScore) {
      bestScore = scoreVal;
      bestIdx = start;
      bestMethod = 'anchored';
    }
  }

  // Pass 2 — bounded stride scan, only if anchoring found nothing usable.
  if (bestScore < FUZZY_THRESHOLD) {
    const step = Math.max(1, Math.floor(window / 8));
    const limit = Math.max(1, s.length - window + 1);
    for (let start = 0; start < limit; start += step) {
      const chunk = s.slice(start, start + window);
      if (realQuickRatio(q, chunk) < FUZZY_THRESHOLD) continue;
      const scoreVal = sequenceRatio(q, chunk);
      if (scoreVal > bestScore) {
        bestScore = scoreVal;
        bestIdx = start;
        bestMethod = 'scanned';
      }
    }
  }

  if (bestScore >= FUZZY_THRESHOLD) {
    return { located: true, method: bestMethod, score: round4(bestScore), charOffset: bestIdx };
  }
  return { located: false, method: 'not_found', score: round4(bestScore), charOffset: -1 };
}

// Cues that flip a term's meaning: a NEGATED mention of "analysis plan"
// ("no analysis plan was registered") confirms an absence claim rather than
// contradicting it. Without this, every well-written absence statement would
// falsify the very signal that detected it.
const NEGATION_CUES = [
  'no ', 'not ', "n't ", 'without ', 'lack ', 'lacks ', 'lacking ',
  'absence of ', 'absent ', 'neither ', 'nor ', 'none ', 'never ',
  'failed to ', 'did not ', 'was not ', 'were not ', 'is not ', 'are not ',
  'unavailable', 'unreported', 'undisclosed', 'unregistered',
];
const NEGATION_WINDOW = 60; // characters of left context inspected

function isNegated(text, at) {
  let left = text.slice(Math.max(0, at - NEGATION_WINDOW), at);
  // Stop at a sentence boundary: negation does not carry across sentences.
  const cut = Math.max(left.lastIndexOf('. '), left.lastIndexOf('; '));
  if (cut !== -1) left = left.slice(cut + 2);
  return NEGATION_CUES.some((cue) => left.includes(cue));
}

/**
 * Terms whose AFFIRMATIVE presence contradicts an ABSENCE claim.
 *
 * A non-empty result falsifies the signal: the manuscript does state the
 * thing the signal says is missing. Negated occurrences are ignored — "no
 * analysis plan was registered" is evidence FOR the absence signal, not
 * against it.
 * @param {string[]} terms
 * @param {string} source
 * @returns {string[]} the terms found affirmatively present
 */
function negativeSearch(terms, source) {
  if (!terms || !terms.length) return [];
  const s = normalise(source);
  const hits = [];
  for (const term of terms) {
    const needle = normalise(term);
    let pos = s.indexOf(needle);
    let foundAffirmative = false;
    while (pos !== -1) {
      if (!isNegated(s, pos)) { foundAffirmative = true; break; }
      pos = s.indexOf(needle, pos + 1);
    }
    if (foundAffirmative) hits.push(term);
  }
  return hits;
}

/**
 * Split findings into { kept, rejected }. Always log the rejected ones — a
 * rising rejection rate is your early warning that prompt or model behaviour
 * has shifted.
 *
 * ABSENCE-shaped signals get a second check after quote location succeeds:
 * negativeSearch() over taxonomy.js's absence_terms. A hit means the
 * manuscript actually states the thing the signal claims is missing, so the
 * signal is dropped even though its own quote located fine — see the
 * NEGATION-AWARE ABSENCE CHECK note at the top of this file.
 */
function verifySignals(signals, sourceText) {
  const kept = [];
  const rejected = [];
  for (const signal of signals) {
    const verification = locateQuote(signal.evidence_quote, sourceText);
    if (!verification.located) {
      rejected.push({ signal, verification });
      continue;
    }
    if (shapeOf(signal.signal_id) === EvidenceShape.ABSENCE) {
      const hits = negativeSearch(absenceTermsOf(signal.signal_id), sourceText);
      if (hits.length) {
        rejected.push({
          signal,
          verification: { ...verification, located: false, method: 'contradicted', contradictingTerms: hits },
        });
        continue;
      }
    }
    kept.push({ signal, verification });
  }
  return { kept, rejected };
}

module.exports = {
  normalise,
  locateQuote,
  negativeSearch,
  isNegated,
  verifySignals,
  FUZZY_THRESHOLD,
  MIN_QUOTE_WORDS,
  NEGATION_CUES,
  NEGATION_WINDOW,
};
