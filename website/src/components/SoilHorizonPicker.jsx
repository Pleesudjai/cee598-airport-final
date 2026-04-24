import { useState, useMemo, useEffect } from 'react'
import { classifyAASHTO, cbrToModulus, modulusToK } from '../engine/faarfieldEngine'

export default function SoilHorizonPicker({ horizons, pavementDepthIn, onSelectCBR, flat = false }) {
  const [method, setMethod] = useState(1)
  const [manualCBR, setManualCBR] = useState(null)
  const [manualIdx, setManualIdx] = useState(-1)  // Track which row was manually clicked

  const pavementDepthCm = pavementDepthIn * 2.54

  const result = useMemo(() => {
    if (!horizons || horizons.length === 0) return null

    // Method 1 — at-pavement-bottom: find the first horizon whose bottom
    // reaches past the pavement depth AND has known CBR. If the nominal
    // at-bottom horizon is "Unknown" (e.g. Cr bedrock), fall through to the
    // next known horizon deeper. If none exists, method1Idx = -1 (no data).
    let method1Idx = -1
    for (let i = 0; i < horizons.length; i++) {
      if ((horizons[i].botCm || 0) < pavementDepthCm) continue
      const cls = classifyAASHTO(horizons[i].pass200, horizons[i].ll, horizons[i].pi)
      if (cls.known) { method1Idx = i; break }
    }
    // If no known horizon at/below pavement, try any known horizon at all
    if (method1Idx === -1) {
      for (let i = 0; i < horizons.length; i++) {
        const cls = classifyAASHTO(horizons[i].pass200, horizons[i].ll, horizons[i].pi)
        if (cls.known) { method1Idx = i; break }
      }
    }
    const method1CBR = method1Idx >= 0
      ? classifyAASHTO(horizons[method1Idx].pass200, horizons[method1Idx].ll, horizons[method1Idx].pi).cbr
      : null

    // Method 2 — weighted average below pavement, over KNOWN horizons only.
    let totalWeight = 0, weightedCBR = 0
    for (const h of horizons) {
      if ((h.botCm || 0) <= pavementDepthCm) continue
      const top = Math.max(h.topCm || 0, pavementDepthCm)
      const thickness = (h.botCm || 0) - top
      if (thickness <= 0) continue
      const cls = classifyAASHTO(h.pass200, h.ll, h.pi)
      if (!cls.known) continue
      totalWeight += thickness
      weightedCBR += cls.cbr * thickness
    }
    const method2CBR = totalWeight > 0 ? Math.round(weightedCBR / totalWeight) : null

    // Method 3 — weakest within 1.5x depth, over KNOWN horizons only.
    const maxDepth = pavementDepthCm * 1.5
    let method3Idx = -1, method3CBR = Infinity
    for (let i = 0; i < horizons.length; i++) {
      const h = horizons[i]
      if ((h.topCm || 0) > maxDepth) break
      if ((h.botCm || 0) <= pavementDepthCm) continue
      const cls = classifyAASHTO(h.pass200, h.ll, h.pi)
      if (!cls.known) continue
      if (cls.cbr < method3CBR) { method3CBR = cls.cbr; method3Idx = i }
    }
    if (method3Idx === -1) {
      // Fallback to method 1's known horizon if search found nothing
      method3Idx = method1Idx
      method3CBR = method1CBR
    }

    const selectedIdx = method === 1 ? method1Idx : method === 3 ? method3Idx : -1
    const selectedCBR = method === 1 ? method1CBR : method === 2 ? method2CBR : method3CBR

    return { method1Idx, method1CBR, method2CBR, method3Idx, method3CBR, selectedIdx, selectedCBR }
  }, [horizons, pavementDepthCm, method])

  if (!horizons || horizons.length === 0) return null

  // activeCBR may be null if the auto-picked method returned "no known data".
  // We only propagate a real number to the parent / downstream E & k math.
  const activeCBR = manualCBR ?? result?.selectedCBR ?? null
  const hasCBR = activeCBR != null && activeCBR > 0
  const activeE = hasCBR ? cbrToModulus(activeCBR) : null
  const activeK = hasCBR ? modulusToK(activeE) : null

  // Propagate to parent ONLY when the user explicitly changes method/row, not on mount.
  // On mount the parent already has its course-data or search-result CBR set, and we
  // don't want to silently override it with the NRCS horizon auto-pick. The "Apply to
  // Section" button lets the user opt into the horizon-based CBR when they want it.
  function commitCBR(val) {
    if (onSelectCBR && val != null && val > 0) onSelectCBR(val)
  }

  return (
    <div className={flat ? '' : 'bg-surface-lowest rounded-xl p-5 shadow-[0px_12px_32px_rgba(25,28,30,0.06)]'}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-outline mb-4">Soil Horizon Picker</p>

      {/* Horizon table — proper alignment */}
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="text-[10px] font-bold uppercase tracking-widest text-outline border-b border-outline-variant/20">
              <th className="text-left py-2 px-2 w-6"></th>
              <th className="text-left py-2 px-2 w-12">Hz</th>
              <th className="text-left py-2 px-2 w-24">Depth</th>
              <th className="text-left py-2 px-2 w-32">Texture</th>
              <th className="text-right py-2 px-2 w-14">Clay%</th>
              <th className="text-right py-2 px-2 w-12">LL</th>
              <th className="text-right py-2 px-2 w-12">PI</th>
              <th className="text-right py-2 px-2 w-14">#200</th>
              <th className="text-center py-2 px-2 w-16">AASHTO</th>
              <th className="text-right py-2 px-2 w-14">CBR</th>
              <th className="text-center py-2 px-2 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {horizons.map((h, i) => {
              const cls = classifyAASHTO(h.pass200, h.ll, h.pi)
              const isKnown = cls.known
              const isSelected = isKnown && ((method === 0 && manualIdx === i) || (result?.selectedIdx === i && method !== 2 && method !== 0))
              const isWeakest = isKnown && result?.method3Idx === i
              return (
                <tr key={i}
                  onClick={() => {
                    if (!isKnown) return    // cannot manually select unknown-CBR horizons
                    setMethod(0); setManualCBR(cls.cbr); setManualIdx(i)
                    commitCBR(cls.cbr)
                  }}
                  className={`transition-colors border-t border-outline-variant/10 ${
                    !isKnown
                      ? 'opacity-60 cursor-not-allowed'
                      : isSelected ? 'bg-primary/10 cursor-pointer' : 'hover:bg-surface-low cursor-pointer'
                  }`}>
                  <td className="py-3 px-2">
                    <span className={`inline-block w-3 h-3 rounded-full border-2 ${
                      !isKnown ? 'border-outline-variant/30' :
                      isSelected ? 'bg-primary border-primary' : 'border-outline-variant'
                    }`} />
                  </td>
                  <td className="py-3 px-2 font-mono font-bold text-on-surface">{h.hz || '?'}</td>
                  <td className="py-3 px-2 text-outline font-mono whitespace-nowrap">{h.topCm}–{h.botCm} cm</td>
                  <td className="py-3 px-2 font-medium text-on-surface">{h.texture || '—'}</td>
                  <td className="py-3 px-2 text-right font-mono text-outline">{h.clay != null ? h.clay : '—'}</td>
                  <td className="py-3 px-2 text-right font-mono text-outline">{h.ll != null ? h.ll : '—'}</td>
                  <td className="py-3 px-2 text-right font-mono text-outline">{h.pi != null ? h.pi : '—'}</td>
                  <td className="py-3 px-2 text-right font-mono text-outline">{h.pass200 != null ? h.pass200 : '—'}</td>
                  <td className={`py-3 px-2 text-center font-mono font-bold ${isKnown ? 'text-primary' : 'text-outline'}`}>
                    {cls.group}
                  </td>
                  <td className="py-3 px-2 text-right font-mono font-bold text-on-surface">
                    {isKnown ? cls.cbr : <span className="text-outline font-normal">—</span>}
                  </td>
                  <td className="py-3 px-2 text-center">
                    {!isKnown && (
                      <span className="text-[9px] font-bold text-outline bg-outline-variant/20 px-2 py-1 rounded whitespace-nowrap" title="No lab data — cannot estimate CBR">
                        NO DATA
                      </span>
                    )}
                    {isKnown && isWeakest && (
                      <span className="text-[9px] font-bold text-failing bg-failing/10 px-2 py-1 rounded whitespace-nowrap">
                        WEAKEST
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Method selector — 3 equal buttons */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { id: 1, label: 'At pavement bottom', desc: 'Quick estimate' },
          { id: 2, label: 'Weighted average', desc: 'Below pavement' },
          { id: 3, label: 'Weakest (1.5x depth)', desc: 'Conservative ⚠' },
        ].map(m => (
          <button key={m.id} onClick={() => {
              setMethod(m.id); setManualCBR(null); setManualIdx(-1)
              // Compute what this method yields and commit it
              const v = m.id === 1 ? result?.method1CBR : m.id === 2 ? result?.method2CBR : result?.method3CBR
              commitCBR(v)
            }}
            className={`text-left px-4 py-3 rounded-lg transition-colors ${
              method === m.id
                ? 'bg-primary/10 ring-2 ring-primary/30'
                : 'bg-surface-low hover:bg-surface-high'
            }`}>
            <span className="text-xs font-bold block text-on-surface">{m.label}</span>
            <span className="text-[10px] text-outline">{m.desc}</span>
          </button>
        ))}
      </div>

      {/* Result bar */}
      <div className="flex items-center justify-between bg-surface-low rounded-lg px-5 py-3">
        <div className="flex items-center gap-5">
          <div>
            <span className="text-[10px] text-outline uppercase tracking-widest block">Selected CBR</span>
            {hasCBR ? (
              <span className="text-3xl font-extrabold text-primary">{activeCBR}</span>
            ) : (
              <span className="text-2xl font-extrabold text-outline">—</span>
            )}
          </div>
          <div className="text-xs text-outline space-y-0.5">
            {hasCBR ? (
              <>
                <div>E = <span className="font-mono font-bold text-on-surface">{activeE.toLocaleString()}</span> psi</div>
                <div>k = <span className="font-mono font-bold text-on-surface">{activeK.toFixed(0)}</span> pci</div>
              </>
            ) : (
              <div className="text-failing font-medium">No CBR — enter manually →</div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[10px] text-outline uppercase tracking-widest">Override:</label>
          <input type="number" min="1" max="80" value={manualCBR ?? ''}
            onChange={e => {
              const v = e.target.value ? +e.target.value : null
              setManualCBR(v)
              if (v != null && v > 0) commitCBR(v)
            }}
            placeholder={hasCBR ? 'auto' : 'required'}
            className={`w-20 bg-surface-lowest border rounded-lg px-3 py-2 text-sm font-mono text-center focus:ring-2 focus:ring-primary ${
              hasCBR ? 'border-outline-variant/30' : 'border-failing/60 ring-1 ring-failing/30'
            }`} />
          {hasCBR && (
            <button onClick={() => commitCBR(activeCBR)}
              title="Send this CBR to the Pavement Structure and CDF analysis"
              className="text-[10px] font-bold uppercase tracking-widest bg-primary text-white px-3 py-2 rounded-lg hover:bg-primary/90 transition-colors">
              Apply to Section
            </button>
          )}
        </div>
      </div>

      {/* No-data warning (auto-methods couldn't find a valid horizon) */}
      {!hasCBR && (
        <div className="mt-3 bg-failing-bg rounded-lg px-4 py-3 text-xs text-failing flex items-start gap-2">
          <span className="material-symbols-outlined text-base shrink-0 mt-0.5">error</span>
          <div>
            <p className="font-bold mb-1">No usable CBR data in this soil profile</p>
            <p className="text-outline">
              The auto-selected horizon has no lab data (likely bedrock or NRCS-unclassified layer). CBR is not fabricated here — you must enter a value manually in the <strong>Override</strong> field to proceed. Common references: clay ≈ 3-5, silt ≈ 7-10, sand ≈ 15-25, gravel ≈ 30-50.
            </p>
          </div>
        </div>
      )}

      {/* Conservative warning — only meaningful when both values are known */}
      {hasCBR && method !== 3 && result?.method3CBR != null && result.method3CBR < activeCBR && (
        <div className="mt-3 bg-borderline-bg rounded-lg px-4 py-3 text-xs text-borderline flex items-center gap-2">
          <span className="material-symbols-outlined text-base">warning</span>
          Conservative estimate (Method 3) gives CBR = <span className="font-bold">{result.method3CBR}</span>, which is lower than your selection of {activeCBR}.
        </div>
      )}
    </div>
  )
}
