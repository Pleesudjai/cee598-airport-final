export default function DataSources() {
  const sources = [
    { name: 'FAA ArcGIS', type: 'Live API', badge: 'live', badgeColor: 'adequate', desc: 'Airport locations + runway dimensions', url: 'https://services6.arcgis.com/ssFJjBXIUyZDrSYZ/arcgis/rest/services/' },
    { name: 'USDA NRCS SDA', type: 'Live API', badge: 'live', badgeColor: 'adequate', desc: 'Soil profile by lat/lon (SSURGO)', url: 'https://sdmdataaccess.nrcs.usda.gov/' },
    { name: 'FAA TAF', type: 'Pre-loaded', badge: 'FY2025', badgeColor: 'primary', desc: '3,319 airports — operations 1990-2055', url: 'https://taf.faa.gov/' },
    { name: 'FAA ACD', type: 'Pre-loaded', badge: 'v2024', badgeColor: 'primary', desc: '388 aircraft — MTOW, gear, dimensions', url: 'https://www.faa.gov/airports/engineering/aircraft_char_database' },
    { name: 'Course Data', type: 'Pre-loaded', badge: '2014-2021', badgeColor: 'secondary', desc: '6 airports — aircraft-level traffic detail', url: null },
  ]

  return (
    <section id="data-sources">
      <div className="flex items-center gap-3 mb-4">
        <span className="material-symbols-outlined text-primary">database</span>
        <h3 className="text-xl font-bold tracking-tight">Data Sources & Freshness</h3>
      </div>
      <div className="bg-surface-lowest rounded-xl p-5 shadow-[0px_12px_32px_rgba(25,28,30,0.06)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] font-bold uppercase tracking-widest text-outline">
              <th className="text-left py-2 px-3">Source</th>
              <th className="text-left py-2 px-3">Type</th>
              <th className="text-center py-2 px-3">Freshness</th>
              <th className="text-left py-2 px-3">Description</th>
              <th className="text-left py-2 px-3">Link</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((s, i) => (
              <tr key={i} className="border-t border-outline-variant/10 hover:bg-surface-low">
                <td className="py-3 px-3 font-bold text-on-surface">{s.name}</td>
                <td className="py-3 px-3 text-xs text-outline">{s.type}</td>
                <td className="py-3 px-3 text-center">
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-${s.badgeColor}/10 text-${s.badgeColor}`}>
                    {s.badge === 'live' ? '🟢 Live' : `🔵 ${s.badge}`}
                  </span>
                </td>
                <td className="py-3 px-3 text-xs text-outline">{s.desc}</td>
                <td className="py-3 px-3">
                  {s.url ? (
                    <a href={s.url} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1">
                      Open <span className="material-symbols-outlined text-sm">open_in_new</span>
                    </a>
                  ) : <span className="text-xs text-outline">Excel file</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-[10px] text-outline">
          TAF and ACD can be refreshed by re-downloading from FAA and rebuilding the app. Live APIs fetch on demand when searching new airports.
        </p>
      </div>
    </section>
  )
}
