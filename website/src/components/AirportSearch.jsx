import { useState, useMemo, useRef, useEffect } from 'react'
import { fetchAirport, fetchRunways, fetchSoilProfile } from '../api/apiClient'

// FAA ArcGIS autocomplete — searches by ICAO, name, or city
const FAA_SEARCH_URL = 'https://services6.arcgis.com/ssFJjBXIUyZDrSYZ/arcgis/rest/services/US_Airport/FeatureServer/0/query'

export default function AirportSearch({ onResult, hideResult }) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const debounceRef = useRef(null)
  const inputRef = useRef(null)

  // Autocomplete: fetch suggestions as user types
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const q = query.trim()
    if (q.length < 2) { setSuggestions([]); return }

    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        // Search by ICAO_ID, NAME, or SERVCITY
        const where = `ICAO_ID LIKE '%${q.toUpperCase()}%' OR UPPER(NAME) LIKE '%${q.toUpperCase()}%' OR UPPER(SERVCITY) LIKE '%${q.toUpperCase()}%'`
        const url = `${FAA_SEARCH_URL}?where=${encodeURIComponent(where)}&outFields=ICAO_ID,NAME,SERVCITY,STATE,ELEVATION&resultRecordCount=8&f=json`
        const resp = await fetch(url)
        const json = await resp.json()
        if (json.features) {
          setSuggestions(json.features.map(f => ({
            icao: f.attributes.ICAO_ID,
            name: f.attributes.NAME,
            city: f.attributes.SERVCITY,
            state: f.attributes.STATE,
            elevation: f.attributes.ELEVATION,
          })).filter(a => a.icao))
          setShowSuggestions(true)
        }
      } catch { /* silently fail on autocomplete */ }
      setSearching(false)
    }, 300) // 300ms debounce

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  // Close suggestions on click outside
  useEffect(() => {
    function handleClick(e) {
      if (inputRef.current && !inputRef.current.contains(e.target)) setShowSuggestions(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function selectAirport(icao) {
    setQuery(icao)
    setShowSuggestions(false)
    await doSearch(icao)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setShowSuggestions(false)
    const icao = query.trim().toUpperCase()
    if (!icao || icao.length < 3) return
    await doSearch(icao)
  }

  async function doSearch(icao) {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const airport = await fetchAirport(icao)
      const { runways } = await fetchRunways(airport.globalId)

      let soil = null
      try {
        soil = await fetchSoilProfile(airport.lat, airport.lon)
      } catch (soilErr) {
        console.warn('Soil fetch failed:', soilErr)
      }

      const fullResult = { ...airport, runways, soil }
      setResult(fullResult)
      onResult?.(fullResult)
    } catch (err) {
      setError(err.message || 'Airport not found')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="flex gap-2" ref={inputRef}>
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg">search</span>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            placeholder="Type airport name, city, or ICAO code..."
            className="w-full bg-surface-low border-none rounded-lg pl-10 pr-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-primary placeholder:text-outline-variant"
          />
          {searching && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline text-sm animate-spin">progress_activity</span>
          )}

          {/* Autocomplete dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-surface-lowest rounded-lg shadow-[0px_12px_32px_rgba(25,28,30,0.06)] max-h-64 overflow-y-auto custom-scrollbar">
              {suggestions.map((s, i) => (
                <div key={i}
                  onClick={() => selectAirport(s.icao)}
                  className="flex items-center justify-between px-4 py-2.5 hover:bg-surface-low cursor-pointer border-b border-outline-variant/10 last:border-none">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary text-lg">flight_takeoff</span>
                    <div>
                      <span className="font-mono font-bold text-sm text-primary">{s.icao}</span>
                      <span className="text-sm text-on-surface ml-2">{s.name}</span>
                      <p className="text-xs text-outline">{s.city}, {s.state}</p>
                    </div>
                  </div>
                  <span className="text-xs text-outline">{s.elevation?.toFixed(0)} ft</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <button type="submit" disabled={loading}
          className="bg-gradient-to-r from-primary to-primary-container text-white rounded-lg px-5 py-2.5 text-sm font-bold disabled:opacity-50 flex items-center gap-2 shrink-0">
          {loading ? (
            <span className="animate-spin material-symbols-outlined text-lg">progress_activity</span>
          ) : (
            <span className="material-symbols-outlined text-lg">flight_takeoff</span>
          )}
          {loading ? 'Loading...' : 'Search'}
        </button>
      </form>

      {error && (
        <div className="bg-failing-bg rounded-lg px-4 py-2 text-sm text-failing flex items-center gap-2">
          <span className="material-symbols-outlined text-lg">error</span>
          {error}
        </div>
      )}

      {result && !hideResult && (
        <div className="bg-surface-lowest rounded-xl p-5 shadow-[0px_12px_32px_rgba(25,28,30,0.06)]">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-extrabold text-primary">{result.icao}</span>
                <span className="text-sm font-medium text-on-surface">{result.name}</span>
                {!result.live && (
                  <span className="text-[11px] bg-borderline-bg text-borderline px-2 py-0.5 rounded font-bold">CACHED</span>
                )}
              </div>
              <p className="text-xs text-outline mt-0.5">{result.city}, {result.state} — Elev. {result.elevation?.toFixed(0)} ft</p>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-adequate bg-adequate/10 px-2 py-1 rounded">
              {result.live ? '🟢 Live' : '🔵 Cached'}
            </span>
          </div>

          {result.runways?.length > 0 && (
            <div className="mt-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-outline mb-3">Runways</p>
              <div className="flex gap-2 flex-wrap">
                {result.runways.map((r, i) => (
                  <span key={i} className="text-xs bg-surface-low rounded px-2 py-1 font-mono">
                    {r.designator} — {r.length}x{r.width} ft — {r.surface}
                  </span>
                ))}
              </div>
            </div>
          )}

          {result.soil && (
            <div className="mt-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-outline mb-1">
                Soil Profile {result.soil.live ? '🟢' : '🔵'}
              </p>
              <p className="text-xs text-on-surface">Dominant: <span className="font-bold">{result.soil.dominant}</span></p>
              <p className="text-xs text-outline">{result.soil.horizons?.length} horizons found — select in Analysis Panel below</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
