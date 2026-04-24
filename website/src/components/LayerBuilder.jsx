import { useState, useEffect } from 'react'

// Keys must match sections.json / AirportAccordion.jsx type strings exactly,
// otherwise the <select> silently falls back to the first option (P-401 AC)
// when rendering a preloaded layer whose type isn't in this dict.
const MATERIAL_DEFAULTS = {
  'P-401 AC':           { E: 200000,  nu: 0.35 },
  'P-501 PCC':          { E: 4000000, nu: 0.15 },
  'P-154 Subbase':      { E: 40000,   nu: 0.35 },
  'P-209 Agg Base':     { E: 75000,   nu: 0.35 },
  'Stabilized Base':    { E: 500000,  nu: 0.20 },
  'Stabilized Subbase': { E: 500000,  nu: 0.20 },
  'P-301 Soil Cement':  { E: 250000,  nu: 0.20 },
  'P-304 Cement Treated': { E: 500000, nu: 0.20 },
  'P-306 Lean Concrete': { E: 700000, nu: 0.20 },
}

const PRESETS = {
  'AC on PCC': [
    { type: 'P-401 AC', h: 2.5, E: 200000, nu: 0.35 },
    { type: 'P-501 PCC', h: 8, E: 4000000, nu: 0.15 },
  ],
  'AC on PCC + Base': [
    { type: 'P-401 AC', h: 2.5, E: 200000, nu: 0.35 },
    { type: 'P-501 PCC', h: 8, E: 4000000, nu: 0.15 },
    { type: 'P-209 Agg Base', h: 6, E: 75000, nu: 0.35 },
  ],
  'AC on PCC + Stabilized': [
    { type: 'P-401 AC', h: 3, E: 200000, nu: 0.35 },
    { type: 'P-501 PCC', h: 8, E: 4000000, nu: 0.15 },
    { type: 'Stabilized Base', h: 6, E: 500000, nu: 0.20 },
  ],
  'New Flexible': [
    { type: 'P-401 AC', h: 4, E: 200000, nu: 0.35 },
    { type: 'P-209 Agg Base', h: 8, E: 75000, nu: 0.35 },
  ],
  'New Rigid': [
    { type: 'P-501 PCC', h: 10, E: 4000000, nu: 0.15 },
    { type: 'P-209 Agg Base', h: 6, E: 75000, nu: 0.35 },
  ],
  'Heavy Duty Rigid': [
    { type: 'P-401 AC', h: 3, E: 200000, nu: 0.35 },
    { type: 'P-501 PCC', h: 16, E: 4000000, nu: 0.15 },
    { type: 'Stabilized Base', h: 6, E: 500000, nu: 0.20 },
  ],
}

export default function LayerBuilder({ initialLayers, onLayersChange, isProjectAirport, flat = false }) {
  const [layers, setLayers] = useState(initialLayers || [])

  useEffect(() => {
    if (initialLayers) {
      // Only update if values actually differ (avoid loop with quickAdjust)
      const same = layers.length === initialLayers.length &&
        layers.every((l, i) => l.type === initialLayers[i].type && l.h === initialLayers[i].h &&
          l.E === initialLayers[i].E && l.nu === initialLayers[i].nu)
      if (!same) setLayers(initialLayers)
    }
  }, [initialLayers])

  function update(newLayers) {
    setLayers(newLayers)
    onLayersChange?.(newLayers)
  }

  function addLayer() {
    update([...layers, { type: 'P-401 AC', h: 3, E: 200000, nu: 0.35 }])
  }

  function removeLayer(idx) {
    update(layers.filter((_, i) => i !== idx))
  }

  function updateLayer(idx, field, value) {
    const updated = layers.map((l, i) => {
      if (i !== idx) return l
      const newL = { ...l, [field]: value }
      // Auto-fill E and nu when type changes
      if (field === 'type' && MATERIAL_DEFAULTS[value]) {
        newL.E = MATERIAL_DEFAULTS[value].E
        newL.nu = MATERIAL_DEFAULTS[value].nu
      }
      return newL
    })
    update(updated)
  }

  function applyPreset(name) {
    if (PRESETS[name]) update(PRESETS[name].map(l => ({ ...l })))
  }

  function moveLayer(idx, dir) {
    if (idx + dir < 0 || idx + dir >= layers.length) return
    const newLayers = [...layers]
    const tmp = newLayers[idx]
    newLayers[idx] = newLayers[idx + dir]
    newLayers[idx + dir] = tmp
    update(newLayers)
  }

  return (
    <div className={flat ? '' : 'bg-surface-lowest rounded-xl p-5 shadow-[0px_12px_32px_rgba(25,28,30,0.06)]'}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">layers</span>
          <p className="text-[10px] font-bold uppercase tracking-widest text-outline">Pavement Structure</p>
          {isProjectAirport && (
            <span className="text-[9px] font-bold text-adequate bg-adequate/10 px-2 py-0.5 rounded">Pre-loaded from course data</span>
          )}
          {!isProjectAirport && layers.length === 0 && (
            <span className="text-[9px] font-bold text-borderline bg-borderline-bg px-2 py-0.5 rounded">No pavement data — define layers below</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <select onChange={e => applyPreset(e.target.value)} value=""
            className="bg-surface-low border-none rounded-lg px-3 py-1.5 text-xs font-medium focus:ring-2 focus:ring-primary">
            <option value="" disabled>Presets...</option>
            {Object.keys(PRESETS).map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
      </div>

      {layers.length > 0 && (
        <table className="w-full text-xs mb-3">
          <thead>
            <tr className="text-[10px] font-bold uppercase tracking-widest text-outline border-b border-outline-variant/20">
              <th className="text-center py-2 px-2 w-8">#</th>
              <th className="text-left py-2 px-2">Material Type</th>
              <th className="text-center py-2 px-2">Thickness (in)</th>
              <th className="text-center py-2 px-2">E (psi)</th>
              <th className="text-center py-2 px-2">Poisson</th>
              <th className="text-center py-2 px-2 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {layers.map((l, i) => (
              <tr key={i} className="border-t border-outline-variant/10 hover:bg-surface-low align-middle">
                <td className="py-2 px-2 text-center font-mono text-outline">{i + 1}</td>
                <td className="py-2 px-2">
                  <select value={l.type} onChange={e => updateLayer(i, 'type', e.target.value)}
                    className="bg-surface-low border-none rounded px-2 py-1 text-xs font-medium w-full focus:ring-1 focus:ring-primary">
                    {Object.keys(MATERIAL_DEFAULTS).map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </td>
                <td className="py-2 px-2 text-center">
                  <input type="number" value={l.h} min="0.5" max="36" step="0.5"
                    onChange={e => updateLayer(i, 'h', +e.target.value)}
                    className="w-16 bg-surface-low border-none rounded px-2 py-1 text-center font-mono focus:ring-1 focus:ring-primary" />
                </td>
                <td className="py-2 px-2 text-center">
                  <input type="number" value={l.E} min="1000" step="1000"
                    onChange={e => updateLayer(i, 'E', +e.target.value)}
                    className="w-24 bg-surface-low border-none rounded px-2 py-1 text-center font-mono focus:ring-1 focus:ring-primary" />
                </td>
                <td className="py-2 px-2 text-center">
                  <input type="number" value={l.nu} min="0.05" max="0.5" step="0.05"
                    onChange={e => updateLayer(i, 'nu', +e.target.value)}
                    className="w-16 bg-surface-low border-none rounded px-2 py-1 text-center font-mono focus:ring-1 focus:ring-primary" />
                </td>
                <td className="py-2 px-2 text-center">
                  <div className="flex items-center gap-1 justify-center">
                    <button onClick={() => moveLayer(i, -1)} className="text-outline hover:text-primary" title="Move up">
                      <span className="material-symbols-outlined text-sm">arrow_upward</span>
                    </button>
                    <button onClick={() => moveLayer(i, 1)} className="text-outline hover:text-primary" title="Move down">
                      <span className="material-symbols-outlined text-sm">arrow_downward</span>
                    </button>
                    <button onClick={() => removeLayer(i)} className="text-failing hover:text-failing/80" title="Remove">
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <button onClick={addLayer}
        className="flex items-center gap-1 text-xs font-bold text-primary hover:text-primary-container transition-colors">
        <span className="material-symbols-outlined text-base">add</span>
        Add Layer
      </button>
    </div>
  )
}
