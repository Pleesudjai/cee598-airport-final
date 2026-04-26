// ASTM D5340 distress categorization for the PCI panel.
//
// FAARFIELD's CDF predicts ONLY load-related damage. To validate the prediction
// against field PCI we need to separate load-related distress from climate
// (and "other") distress.  This module exports the categorization plus a few
// helpers used by the chart components.
//
// References: ASTM D5340-12 §X1.1 (distress catalog); FAA AC 150/5380-7B
// (Pavement Management Program); FAA AC 150/5380-6C (M&R guidelines).

export const ASTM_D5340_BANDS = [
  { label: 'Failed',      min: 0,   max: 10,  fill: '#7f1d1d', text: '#fef2f2' },
  { label: 'Serious',     min: 11,  max: 25,  fill: '#dc2626', text: '#1a1a1a' },
  { label: 'Very Poor',   min: 26,  max: 40,  fill: '#f97316', text: '#1a1a1a' },
  { label: 'Poor',        min: 41,  max: 55,  fill: '#fbbf24', text: '#1a1a1a' },
  { label: 'Fair',        min: 56,  max: 70,  fill: '#facc15', text: '#1a1a1a' },
  { label: 'Satisfactory',min: 71,  max: 85,  fill: '#86efac', text: '#1a1a1a' },
  { label: 'Good',        min: 86,  max: 100, fill: '#22c55e', text: '#fefefe' },
]

// Lower bounds of each band — for ReferenceLine threshold markers.
export const ASTM_D5340_THRESHOLDS = [86, 71, 56, 41, 26, 11]

// Distress categorization aligned to the codes that ACTUALLY appear in
// pci_distress_data.json (audited 2026-04-25 — only 10 codes occur across all
// 13 sections × 2005-2023 inspections, all in the 41-57 AC-overlay range).
//
// This airport's PMS uses the PAVER/MicroPAVER AC distress numbering scheme
// (codes 41-57 for AC-overlay distresses), NOT the ASTM D5340 PCC slab
// numbering (codes 21-38).  The records' `desc` field is authoritative for
// the human-readable label — the JSON's `distress_codes` dict at the top
// level uses a different (incorrect-for-this-PMS) labeling.
//
// Category ∈ {"load", "climate", "other"}.
export const DISTRESS_CATEGORY = {
  41: 'load',     // ALLIGATOR CR        — fatigue, primary load distress on AC
  42: 'climate',  // BLEEDING            — asphalt response to high temp
  43: 'climate',  // BLOCK CR            — shrinkage cracking
  44: 'other',    // BUMPS/SAGS          — subgrade settlement
  45: 'other',    // DEPRESSION          — settlement / construction
  46: 'climate',  // CORRUGATION         — heat softening
  47: 'load',     // JT REF. CR          — reflective from underlying PCC joint loading
  48: 'climate',  // L_T CR (long/trans) — thermal cracking
  49: 'other',    // LANE SH DROP        — shoulder construction
  50: 'other',    // PATCH/UT CUT        — past maintenance feature
  51: 'climate',  // POLISHED AG
  52: 'climate',  // RAVELING            — surface aging / weathering
  53: 'load',     // RUTTING             — load deformation
  54: 'load',     // SHOVING             — load + high-temperature deformation
  55: 'load',     // SLIPPAGE CR         — load-induced shear
  56: 'climate',  // SWELLING            — moisture / frost heave
  57: 'climate',  // WEATHERING          — surface aging
}

// Authoritative labels, taken from the `desc` field of actual records (more
// reliable than the JSON's distress_codes dict which uses different labels).
export const CODE_LABELS = {
  41: 'Alligator Cr',
  42: 'Bleeding',
  43: 'Block Cr',
  44: 'Bumps/Sags',
  45: 'Depression',
  46: 'Corrugation',
  47: 'JT Ref Cr',
  48: 'L/T Cr',
  49: 'Lane Sh Drop',
  50: 'Patch/UT Cut',
  51: 'Polished Ag',
  52: 'Raveling',
  53: 'Rutting',
  54: 'Shoving',
  55: 'Slippage Cr',
  56: 'Swelling',
  57: 'Weathering',
}

export function classify(code) {
  return DISTRESS_CATEGORY[Number(code)] || 'other'
}

export function codeLabel(code, fallbackDesc) {
  return CODE_LABELS[Number(code)] || fallbackDesc || `Code ${code}`
}

// Normalize a unit string to "m" (linear) or "m²" (area) — m and m² should
// never be summed together; this helper enforces the split.
export function normalizeUnit(unit) {
  if (!unit) return 'm'
  const u = String(unit).toLowerCase()
  if (u.includes('m2') || u.includes('²') || u.includes('sq')) return 'm²'
  return 'm'
}

// Color palette for distress categories (used by DistressBreakdownChart legend
// and the bar fills).
export const CATEGORY_COLORS = {
  load:    { L: '#fecaca', M: '#f87171', H: '#dc2626' },  // red family
  climate: { L: '#dbeafe', M: '#60a5fa', H: '#1d4ed8' },  // blue family
  other:   { L: '#bbf7d0', M: '#4ade80', H: '#15803d' },  // green family
}

// Neutral grayscale ramp used by the legend "Severity (saturation)" swatches
// so the user can see the intensity gradient independent of any category hue.
export const SEVERITY_GRAYSCALE = {
  L: '#e5e7eb',  // light gray  → Low
  M: '#6b7280',  // medium gray → Medium
  H: '#1f2937',  // dark gray   → High
}

// PCI history dot color along a diverging palette by pct_load.
//   pct_load = 0  → climate-only  → blue
//   pct_load = 50 → mixed         → gray
//   pct_load = 100 → load-only    → red
export function pctLoadColor(pctLoad) {
  if (pctLoad == null) return '#9ca3af'
  const v = Math.max(0, Math.min(100, pctLoad))
  if (v < 25)  return '#1d4ed8'
  if (v < 50)  return '#60a5fa'
  if (v < 75)  return '#9ca3af'
  if (v < 90)  return '#f87171'
  return '#dc2626'
}

// Compute load-adjusted deduct for one inspection record.
// Per ASTM D5340: PCI = 100 − max(CDV).  We approximate the LOAD-attributable
// deduct as (100 − PCI) × (pct_load / 100).
export function loadAdjustedDeduct(pci, pctLoad) {
  if (pci == null || pctLoad == null) return null
  return (100 - pci) * (pctLoad / 100)
}

// Look up a section's record from pci_distress_data.json given the project's
// 4-letter ICAO (e.g., "KCIU") + section_id (e.g., 21222).  The JSON keys use
// the 3-letter form ("CIU_21222") so we strip the leading K.
export function pciKeyFor(icao, sectionId) {
  const base = icao && icao.startsWith('K') ? icao.slice(1) : icao
  return `${base}_${sectionId}`
}

// Parse "YYYY-MM-DD" → epoch ms for Recharts time axis.
export function dateToMs(dateStr) {
  if (!dateStr) return null
  return new Date(dateStr).getTime()
}
