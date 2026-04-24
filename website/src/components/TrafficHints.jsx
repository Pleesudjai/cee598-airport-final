const CATEGORY_AIRCRAFT = {
  ac: [
    { type: 'B738', mtow: 174200, gear: 'D', label: 'Boeing 737-800' },
    { type: 'A320', mtow: 174165, gear: 'D', label: 'Airbus A320' },
  ],
  at: [
    { type: 'C208', mtow: 9062, gear: 'S', label: 'Cessna Caravan' },
    { type: 'DHC6', mtow: 12500, gear: 'S', label: 'Twin Otter' },
    { type: 'BE20', mtow: 12500, gear: 'D', label: 'King Air 200' },
  ],
  ga: [
    { type: 'C172', mtow: 2550, gear: 'S', label: 'Cessna 172' },
    { type: 'PA28', mtow: 2150, gear: 'S', label: 'Piper Cherokee' },
  ],
  mil: [
    // Gears match FAARFIELD library, not common mislabels: C-130 is single-tandem (2S),
    // C-17 is triple-tandem (2T).  See note_claude/2026-04-24_Gear_Mismatch_Excel_vs_FAARFIELD_Library.md
    { type: 'C130', mtow: 155000, gear: '2S', label: 'C-130 Hercules' },
    { type: 'C17', mtow: 585000, gear: '2T', label: 'C-17 Globemaster' },
  ],
}

export default function TrafficHints({ tafOps, basedAircraft, onAddFleet }) {
  if (!tafOps) return null

  const latest = tafOps
  const categories = [
    { key: 'ac', label: 'Air Carrier', ops: latest.ac, aircraft: CATEGORY_AIRCRAFT.ac, color: 'primary' },
    { key: 'at', label: 'Air Taxi', ops: latest.at, aircraft: CATEGORY_AIRCRAFT.at, color: 'secondary' },
    { key: 'ga', label: 'GA Itinerant', ops: latest.ga, aircraft: CATEGORY_AIRCRAFT.ga, color: 'outline' },
    { key: 'mil', label: 'Military', ops: latest.mil, aircraft: CATEGORY_AIRCRAFT.mil, color: 'tertiary' },
  ].filter(c => c.ops > 0)

  function addFleet(cat) {
    const depsPerType = Math.round(cat.ops / 2 / cat.aircraft.length) // ops÷2=deps, split evenly
    const fleet = cat.aircraft.map(a => ({
      type: a.type, mtow: a.mtow, gear: a.gear,
      annual_deps: depsPerType, source: 'taf_estimate',
      years: [], first_year: null, last_year_seen: null, total_deps: 0,
    }))
    onAddFleet?.(fleet)
  }

  return (
    <div className="bg-surface-lowest rounded-xl p-5 shadow-[0px_12px_32px_rgba(25,28,30,0.06)]">
      <div className="flex items-center gap-2 mb-3">
        <span className="material-symbols-outlined text-primary text-base">auto_fix_high</span>
        <p className="text-[10px] font-bold uppercase tracking-widest text-outline">Suggested Aircraft Mix (from TAF)</p>
      </div>

      {/* TAF summary */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {[
          { label: 'Air Carrier', value: latest.ac },
          { label: 'Air Taxi', value: latest.at },
          { label: 'GA', value: latest.ga + (latest.loc_ga || 0) },
          { label: 'Military', value: latest.mil + (latest.loc_mil || 0) },
        ].map(c => (
          <div key={c.label} className="bg-surface-low rounded-lg p-2 text-center">
            <p className="text-[10px] text-outline uppercase tracking-widest">{c.label}</p>
            <p className="text-lg font-extrabold text-on-surface">{c.value?.toLocaleString()}</p>
            <p className="text-[10px] text-outline">ops/yr</p>
          </div>
        ))}
      </div>

      {basedAircraft && (
        <p className="text-xs text-outline mb-3">
          Based aircraft: {basedAircraft.single} single, {basedAircraft.multi} multi, {basedAircraft.jet} jet, {basedAircraft.helo} helo
        </p>
      )}

      {/* Quick-fill buttons */}
      <div className="space-y-2">
        {categories.map(cat => (
          <button key={cat.key} onClick={() => addFleet(cat)}
            className="w-full flex items-center justify-between bg-surface-low hover:bg-surface-high rounded-lg px-4 py-2.5 text-left transition-colors group">
            <div>
              <span className="text-xs font-bold text-on-surface">+ Add {cat.label} fleet</span>
              <span className="text-[10px] text-outline ml-2">
                {cat.aircraft.map(a => `${a.label} (${Math.round(cat.ops/2/cat.aircraft.length)}/yr)`).join(' + ')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-outline">{cat.ops.toLocaleString()} ops</span>
              <span className="material-symbols-outlined text-primary text-sm opacity-0 group-hover:opacity-100">add_circle</span>
            </div>
          </button>
        ))}
      </div>

      <p className="mt-3 text-[10px] text-outline">
        <span className="material-symbols-outlined text-xs align-middle mr-1">info</span>
        Estimates from TAF category totals (ops ÷ 2 = departures, split evenly across typical aircraft). Edit as needed.
      </p>
    </div>
  )
}
