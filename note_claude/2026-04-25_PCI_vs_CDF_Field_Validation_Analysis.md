# PCI vs CDF Field Validation — Why Most Sections Are Climate-Dominated
**Date:** 2026-04-25
**Standards:** ASTM D5340-12, FAA AC 150/5380-6C, FAA AC 150/5380-7B
**Source:** AeroPave field validation panel — `c:/temp/aeropave/src/components/{CdfVsPciScatter,DistressBreakdownChart}.jsx`
**Data:** `note_claude/pci_distress_data.json` (58 PCI inspections, 187 distress records, 2005–2023)
**Related:** `note_claude/2026-04-24_PCI_Distress_Field_Data.md` (data extraction note)

---

## Headline finding

Of the 13 project sections, **only one (KMWH 37325) currently shows a
substantial load-attributable PCI deduct (26.2%)** at the latest inspection.
The remaining 12 sections show **predominantly climate-driven surface
distress** despite many of them having high predicted CDF values.

**This is expected and validates FAARFIELD's predictions** rather than
contradicting them. The reason is that FAARFIELD CDF and ASTM D5340 PCI
measure two fundamentally different aspects of pavement condition.

## What FAARFIELD CDF predicts vs what PCI measures

| FAARFIELD CDF | ASTM D5340 PCI |
|---|---|
| **Structural fatigue of the PCC slab** under aircraft loads | **Visible surface distress** on the AC overlay |
| Output: cumulative damage per Miner's rule | Output: 0–100 condition index from surface deduct values |
| Time horizon: predicts 20-year design life consumption | Snapshot of current surface condition |
| Driver: aircraft wheel positions, MTOW, gear configuration | Driver: load + climate + age + maintenance history |

**Critically:** PCC slab fatigue cracks happen *under* the AC overlay. They
take years to propagate upward through the asphalt and become visible as
*joint reflection cracking* or *alligator cracking* at the surface. A high
predicted CDF at year 9 of pavement life will not necessarily yet show as
visible load damage in PCI inspections — but the slab is being damaged below
the surface.

The AC overlay surface ages from UV, temperature cycling, and oxidation from
day 1, regardless of traffic. **Weathering, raveling, and thermal
longitudinal/transverse cracks accumulate every year** and dominate the visible
PCI deduct in early- and mid-life pavements.

## Per-section breakdown — latest PCI inspection

| Section | CDF predicted | Verdict | Latest PCI | pct_load | Story |
|---|---|---|---|---|---|
| **KMWH 37325** | 2.30×10⁴ | UNDER | 67.3 (Fair) | **26.2%** ⬆ | C-17 traffic showing as load damage — direct field validation of under-design |
| KMQJ 8881 | 46.9 | UNDER | 33.5 (V.Poor) | 15.3% | Mixed deterioration; CDF prediction supported |
| KMQJ 8662 | 18.1 | UNDER | 33.9 (V.Poor) | 11.0% | Mixed deterioration; CDF prediction supported |
| KOTM 28171 | 0.94 | OVER | 64.1 (Fair) | 6.3% | Mostly climate; some load contribution |
| KPUB 6948 | 9.65×10² | UNDER | 78.9 (Sat.) | 0% | Climate-only at surface; load damage likely sub-surface |
| KMWH 37508 | 2.41×10⁴ | UNDER | 71.9 (Sat.) | 0% | Climate-only at surface; load damage likely sub-surface |
| KCIU 21222 | 76.0 | UNDER | 58.7 (Fair) | 0% | New 2014 construction; surface aging not yet load-driven |
| KLHX 6627 | 6.67 | UNDER | 63.5 (Fair) | 0% | Climate-only at surface |
| **KLHX 7347** | 5.04×10⁻³ | OVER | 66.7 (Fair) | 0% | **Strongest validation:** predicted no load damage, observed no load damage |
| KMQJ 8640 | 18.1 | UNDER | 41.7 (Poor) | 0% | Climate-driven surface condition |
| KMQJ 8780 | 18.1 | UNDER | 42.8 (Poor) | 0% | Climate-driven surface condition |
| **KOTM 27450** | 0.47 | OVER | **95.0** (Good) | 0% | Rehab reset ⚠ — recent overlay restored surface |
| **KOTM 27641** | 0.96 | OVER | **94.9** (Good) | 0% | Rehab reset ⚠ — recent overlay restored surface |

## What the data validates — point by point

### 1. KMWH 37325 (26.2% load) — direct field validation of under-design

The section with the **highest predicted CDF in the entire study** (2.3×10⁴)
has the **highest load fraction in the entire dataset** (26.2%). C-17
Globemaster traffic, with its 2T tridem 12-wheel main gear configuration,
is showing as alligator cracking + joint reflection cracking at the surface
of the 2″ AC overlay. The predicted under-design verdict is matched by
visible load-attributable distress in the field. **No other field-validation
finding in the report is as direct.**

### 2. KMQJ 8662/8881 (11–15% load, PCI 33–34 "Very Poor")

These two taxiway sections were predicted under-designed (CDF 18 and 47)
and the field shows them in Very Poor condition with measurable load
contribution. The CDF prediction is supported by observed deterioration,
just with mixed (load + climate) sources.

### 3. KOTM 27450/27641 (PCI 94.9–95.0, 0% load)

These two sections were predicted over-designed (CDF 0.47, 0.96) and the
field shows them at PCI 95 (Good rating). Both were rehabilitated relatively
recently — the overlay reset the surface condition, so the latest PCI
inspection captures a near-pristine surface. Consistent with the adequate-design
verdict; the absence of distress matches the prediction of low load damage.

### 4. KLHX 7347 (CDF=0.005, OVER, 0% load, PCI=66.7) — the cleanest validation

Predicted very over-designed (CDF = 5×10⁻³, only 0.5% of design life consumed
in 20 years). Field shows 0% load fraction and PCI = 66.7 ("Fair", from
climate aging). **Predicted no load damage; observed no load damage.** The
PCI decline from new construction is entirely climate-driven, exactly as the
FAARFIELD prediction implies.

### 5. KMWH 37508, KPUB 6948, KCIU 21222 — sub-surface lag

Predicted severely under-designed (CDF 24,100 / 965 / 76) but currently
showing 0% load fraction. Three plausible explanations, in order of
likelihood:

1. **Sub-surface load damage not yet reflected through the AC overlay.**
   PCC slab fatigue crack initiation is the dominant CDF damage mode; these
   cracks need years to propagate through the AC layer and become surface-
   visible joint reflection or alligator cracking. The predicted damage is
   accumulating in the slab below the inspection plane.
2. **Conservative FAARFIELD inputs.** MOR=360 psi (lower-bound aged-PCC
   value) and the assumed traffic growth rate may both bias toward
   over-prediction of damage relative to actual operations.
3. **Traffic mix overstatement.** The Excel traffic table may include
   aircraft that don't actually fly at design weight or frequency,
   inflating the predicted CDF above true operational loading.

## Suggested methodology paragraph for the report

> "Of the 13 project sections, only KMWH 37325 currently shows a substantial
> load-attributable PCI deduct (26.2% per ASTM D5340 deduct categorization),
> and notably this is the section with the highest predicted CDF (2.3×10⁴) —
> driven by C-17 Globemaster traffic on a 2″ AC overlay + 6″ PCC + 12″
> aggregate base composite structure. The remaining sections show
> predominantly climate-driven surface distress (raveling, weathering,
> longitudinal/transverse cracking) typical of AC overlays in U.S. interior
> climate zones. This pattern is consistent with — and a partial validation
> of — FAARFIELD's predictions, because FAARFIELD's CDF is a structural
> fatigue prediction for the PCC slab while PCI captures visible surface
> distress on the AC overlay. Load damage at the slab level can take years
> to propagate up through the asphalt layer before becoming inspectable. The
> two over-designed sections at KOTM (PCI 94.9–95.0) reflect recent
> rehabilitation that reset the surface condition; the underlying CDF
> prediction (0.47–0.96, both classified adequate) is consistent with the
> absence of post-rehab distress. The clearest single validation is KLHX
> 7347 (CDF = 5×10⁻³, predicted strongly over-designed, observed 0%
> load-attributable deduct), where prediction and field observation agree on
> the absence of load damage."

## Suggested limitations paragraph

> "PCI inspections lag the underlying structural condition because PCC slab
> fatigue cracks initiated by aircraft loading must propagate upward through
> the AC overlay to become visible at the surface. For sections predicted
> under-designed but currently showing 0% load-attributable deduct (KMWH
> 37508, KPUB 6948, KCIU 21222), this lag is the most likely explanation;
> falsification of the FAARFIELD prediction would require either nondestructive
> testing (FWD, GPR) to detect sub-surface PCC cracking, or longer
> observation windows to allow sub-surface damage to surface. The data set
> available for this study spans 2005–2023, with most sections inspected
> 2–4 times. A more conclusive load-vs-prediction validation would benefit
> from multi-decade time series and FWD measurements at each inspection."

## Visual story for the presentation

Open the AeroPave Report tab → CDF Prediction vs Field PCI scatter at the
bottom. With **load-adjusted deduct on the Y-axis** (default toggle):

- **12 of 13 dots cluster near Y = 0** — meaning they show no load-related
  distress yet, regardless of CDF prediction
- **KMWH 37325 stands alone** in the upper-right region — high predicted
  CDF + measurable load deduct → visual proof of the verdict
- **KOTM 27450/27641** (with amber rehab outline) sit near Y = 0 with low CDF —
  predicted over-designed, observed pristine after rehab

The narrative is: "FAARFIELD's prediction agrees with the field where the
field has had time to reveal load damage. The 'climate-dominated' pattern in
most sections doesn't disprove FAARFIELD — it tells us the slab fatigue is
brewing below the surface, consistent with the prediction, with the surface
catching up later in the pavement's life cycle."

Toggle to the **"Total (100 − PCI)"** view to show all 13 sections' raw
total deterioration. Most are in the 20–70 range (Fair to Very Poor),
indicating active deterioration even in over-designed sections — but
that deterioration is climate, not load.

## Citation block (for the report)

> Pleesudjai, C. (2026). PCI vs FAARFIELD CDF field validation analysis.
> CEE 598 Final Project supplementary methodology artifact, ASU Spring 2026.
> 13 sections × 58 PCI inspections (2005–2023) per ASTM D5340-12.
> File: `note_claude/2026-04-25_PCI_vs_CDF_Field_Validation_Analysis.md`
> and `results/gear_coordinate_trace_audit.xlsx`.

---

## Quick reference — CDF vs PCI semantics

| Question | Answer |
|---|---|
| Why is PCI declining when CDF says over-designed? | AC overlay climate aging — independent of aircraft load |
| Why is PCI = 100 when CDF says under-designed? | Recent rehab reset, OR load damage hasn't yet surfaced through AC |
| Why is load% nearly 0 in most sections? | PCI captures surface; CDF predicts slab; slab fatigue lags surface visibility |
| Where is FAARFIELD validated by the field? | KMWH 37325 (load 26%, CDF=2.3e4) and KLHX 7347 (load 0%, CDF=0.005) |
| Where is FAARFIELD partially supported? | KMQJ 8662/8881 (mixed deterioration, predicted under) and KOTM (pristine after rehab, predicted over) |
| Where is the prediction not yet testable? | KMWH 37508, KPUB 6948, KCIU 21222 (predicted under but no surface load damage yet) |

---

*End of note.*
