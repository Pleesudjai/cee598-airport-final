/**
 * faarfieldEngine.js — soil/unit utility helpers ONLY.
 *
 * The simplified Burmister + Westergaard CDF engine that previously lived here
 * was REMOVED on 2026-04-22. All CDF analysis must go through the native
 * FAARFIELD desktop-parity backend (LEAFClassLib + AMClassLib + 2014 fatigue
 * equations) at localhost:5100. No approximate fallback is permitted.
 *
 * What remains:
 *   - classifyAASHTO()      — pure soil-mechanics classification (no engine code)
 *   - cbrToModulus()        — FAARFIELD's standard CBR → E (psi) conversion
 *   - modulusToK()          — FAARFIELD's standard E → k (pci) conversion
 *
 * These are pure unit conversions and the AASHTO group lookup table — they
 * mirror the same formulas FAARFIELD desktop uses internally and are NOT a
 * re-implementation of the structural engine.
 */

// ============================================================================
// AASHTO CLASSIFICATION
// ============================================================================

export function classifyAASHTO(pass200, ll, pi) {
  // Unknown lab data (typical for bedrock/Cr horizons in NRCS soil survey) →
  // return null CBR + known: false. Callers must skip such horizons or
  // surface an explicit "no data" warning; they must NOT fabricate a CBR.
  if (pass200 == null || ll == null || pi == null) {
    return { group: 'Unknown', cbr: null, known: false };
  }
  if (pass200 <= 35) {
    if (pass200 <= 15 && pi <= 6) return { group: 'A-1-a', cbr: 30, known: true };
    if (pass200 <= 25 && pi <= 6) return { group: 'A-1-b', cbr: 25, known: true };
    if (ll <= 40 && pi <= 10) return { group: 'A-2-4', cbr: 20, known: true };
    return { group: 'A-2-6', cbr: 15, known: true };
  }
  if (ll <= 40 && pi <= 10) return { group: 'A-4', cbr: 8, known: true };
  if (ll > 40 && pi <= 10) return { group: 'A-5', cbr: 5, known: true };
  if (ll <= 40 && pi > 10) return { group: 'A-6', cbr: 7, known: true };
  return { group: 'A-7-6', cbr: 4, known: true };
}

// ============================================================================
// SUBGRADE CONVERSIONS (FAARFIELD standard)
// ============================================================================

export function cbrToModulus(cbr) { return 1500 * cbr; }
export function modulusToK(E) { return Math.pow(E / 20.15, 1 / 1.28405); }
