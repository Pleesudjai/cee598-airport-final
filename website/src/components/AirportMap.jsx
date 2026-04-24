import { useEffect, useRef, useState } from 'react'
import airports from '../data/airports.json'
import cdfResults from '../data/cdf_results.json'

export default function AirportMap({ onSelectAirport, searchedAirport, selectedAirport }) {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const markersRef = useRef([])
  const [mapReady, setMapReady] = useState(false)

  // Check if any section at this airport is under-designed
  function airportStatus(icao) {
    const results = cdfResults.filter(r => r.icao === icao)
    return results.some(r => !r.adequate) ? 'failing' : 'adequate'
  }

  useEffect(() => {
    let map
    import('maplibre-gl').then(maplibregl => {
      import('maplibre-gl/dist/maplibre-gl.css')
      map = new maplibregl.Map({
        container: mapRef.current,
        style: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
        center: [-98, 40],
        zoom: 3.8,
      })

      map.addControl(new maplibregl.NavigationControl(), 'top-right')
      mapInstance.current = map

      map.on('load', () => {
        setMapReady(true)
        // Add project airport markers
        airports.forEach(apt => {
          const status = airportStatus(apt.icao)
          const color = status === 'failing' ? '#ba1a1a' : '#059669'
          const sections = cdfResults.filter(r => r.icao === apt.icao)
          const underCount = sections.filter(r => !r.adequate).length

          const el = document.createElement('div')
          el.style.cssText = `width:28px;height:28px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.2);cursor:pointer;display:flex;align-items:center;justify-content:center;`
          el.innerHTML = `<span style="color:white;font-size:10px;font-weight:800;">${sections.length}</span>`

          const popup = new maplibregl.Popup({ offset: 20, closeButton: false })
            .setHTML(`
              <div style="font-family:Inter,sans-serif;padding:4px 0;">
                <div style="font-weight:800;font-size:14px;">${apt.icao}</div>
                <div style="font-size:12px;color:#737784;">${apt.name}, ${apt.state}</div>
                <div style="font-size:11px;margin-top:4px;">
                  ${sections.length} sections — ${underCount > 0
                    ? `<span style="color:#ba1a1a;font-weight:700;">${underCount} under-designed</span>`
                    : '<span style="color:#059669;font-weight:700;">All adequate</span>'}
                </div>
              </div>
            `)

          const marker = new maplibregl.Marker({ element: el })
            .setLngLat([apt.lon, apt.lat])
            .setPopup(popup)
            .addTo(map)

          el.addEventListener('click', () => onSelectAirport?.(apt.icao))
          markersRef.current.push(marker)
        })
      })
    })

    return () => { if (map) map.remove() }
  }, [])

  // Add searched airport marker
  useEffect(() => {
    if (!searchedAirport || !mapInstance.current) return
    import('maplibre-gl').then(maplibregl => {
      const el = document.createElement('div')
      el.style.cssText = 'width:28px;height:28px;border-radius:50%;background:#0047ab;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);cursor:pointer;display:flex;align-items:center;justify-content:center;'
      el.innerHTML = '<span style="color:white;font-size:14px;" class="material-symbols-outlined">search</span>'

      new maplibregl.Marker({ element: el })
        .setLngLat([searchedAirport.lon, searchedAirport.lat])
        .addTo(mapInstance.current)

      mapInstance.current.flyTo({ center: [searchedAirport.lon, searchedAirport.lat], zoom: 8, duration: 1500 })
    })
  }, [searchedAirport])

  // Fly to selected PROJECT airport whenever the user picks one (dropdown,
  // marker click, or search-result that resolves to a project ICAO).
  // Depends on `mapReady` so it also fires after the lazy map finishes
  // loading if a selectedAirport was already set on first render.
  useEffect(() => {
    if (!selectedAirport || !mapReady || !mapInstance.current) return
    const apt = airports.find(a => a.icao === selectedAirport)
    if (!apt) return
    mapInstance.current.flyTo({
      center: [apt.lon, apt.lat],
      zoom: 9,                   // close enough to read the runways
      speed: 1.2,
      curve: 1.4,
      duration: 1400,
      essential: true,
    })
  }, [selectedAirport, mapReady])

  return (
    <div ref={mapRef} className="w-full h-[400px] rounded-xl overflow-hidden shadow-[0px_12px_32px_rgba(25,28,30,0.06)]" />
  )
}
