import React, { useState, useEffect, useRef, Suspense } from 'react'
import { checkHealth } from './api/nativeStressClient'
import airports from './data/airports.json'
import sections from './data/sections.json'
import cdfResults from './data/cdf_results.json'
import Footer from './components/Footer'

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(error) { return { error } }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, background: '#ffdad6', margin: 20, borderRadius: 12, fontFamily: 'Inter, sans-serif' }}>
          <h2 style={{ color: '#ba1a1a', fontSize: 20 }}>Component Error</h2>
          <pre style={{ fontSize: 13, whiteSpace: 'pre-wrap', marginTop: 10 }}>{this.state.error.message}</pre>
          <pre style={{ fontSize: 11, color: '#666', marginTop: 5 }}>{this.state.error.stack}</pre>
        </div>
      )
    }
    return this.props.children
  }
}

const ProjectReport = React.lazy(() => import('./tabs/ProjectReport'))
const DesignTool = React.lazy(() => import('./tabs/DesignTool'))
const MethodologyTab = React.lazy(() => import('./tabs/MethodologyTab'))

function Loading() {
  return <div style={{ padding: 48, textAlign: 'center', color: '#737784', fontSize: 14 }}>Loading...</div>
}

const TABS = [
  { id: 'report', label: 'Project Report', icon: 'assignment' },
  { id: 'tool', label: 'Design Tool', icon: 'engineering' },
  { id: 'methodology', label: 'Methodology', icon: 'calculate' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('report')
  const [selectedAirport, setSelectedAirport] = useState(null)
  const [selectedSection, setSelectedSection] = useState(null)
  const [searchedAirport, setSearchedAirport] = useState(null)
  const [customTraffic, setCustomTraffic] = useState(null)
  const [customLayers, setCustomLayers] = useState(null)
  const [nativeAvailable, setNativeAvailable] = useState(false)
  const [analysisAvailable, setAnalysisAvailable] = useState(false)
  const failStreak = useRef(0)   // consecutive null health responses

  useEffect(() => {
    function applyHealth(h) {
      // h === null means timeout / network error.  Don't flip availability to
      // false on a single missed heartbeat — that's the cause of the flickering
      // "FAARFIELD backend offline" messages.  Require 3 consecutive misses
      // (~24 s with the 8 s timeout) before declaring offline.  Any successful
      // poll resets the streak.
      if (h === null) {
        failStreak.current += 1
        if (failStreak.current >= 3) {
          setNativeAvailable(false)
          setAnalysisAvailable(false)
        }
        return
      }
      failStreak.current = 0
      setNativeAvailable(!!h.leafAvailable)
      setAnalysisAvailable(!!h.analysisAvailable)
    }
    checkHealth().then(applyHealth)
    const id = setInterval(() => checkHealth().then(applyHealth), 5000)
    return () => clearInterval(id)
  }, [])

  // Cross-tab: clicking airport in Report opens it in Tool
  function openInTool(icao, secId) {
    setSelectedAirport(icao)
    setSelectedSection(secId || null)
    setActiveTab('tool')
    window.scrollTo(0, 0)
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-surface">
        {/* Header with tabs */}
        <header className="sticky top-0 z-50 h-14 bg-surface-lowest/90 backdrop-blur-xl flex items-center px-8 shadow-[0px_1px_0px_rgba(0,0,0,0.05)]">
          <div className="flex items-center gap-2 mr-6">
            <span className="material-symbols-outlined text-primary text-2xl">flight_takeoff</span>
            <h1 className="text-sm font-bold tracking-tight text-on-surface">AeroPave</h1>
          </div>

          {/* Tab buttons */}
          <nav className="flex gap-1">
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => { setActiveTab(tab.id); window.scrollTo(0, 0) }}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeTab === tab.id
                    ? 'bg-primary text-white shadow-md'
                    : 'text-outline hover:bg-surface-low hover:text-on-surface'
                }`}>
                <span className="material-symbols-outlined text-base">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="ml-auto">
            <span className="text-[10px] font-bold uppercase tracking-widest text-outline">CEE 598 — Spring 2026</span>
          </div>
        </header>

        {/* Tab content */}
        <main className="max-w-[1600px] mx-auto px-8 py-8">
          <ErrorBoundary>
            <Suspense fallback={<Loading />}>
              {activeTab === 'report' && (
                <ProjectReport
                  airports={airports} sections={sections} cdfResults={cdfResults}
                  onOpenInTool={openInTool}
                />
              )}
              {activeTab === 'tool' && (
                <DesignTool
                  airports={airports} sections={sections} cdfResults={cdfResults}
                  selectedAirport={selectedAirport} selectedSection={selectedSection}
                  onAirportChange={setSelectedAirport} onSectionChange={setSelectedSection}
                  searchedAirport={searchedAirport} onSearchResult={setSearchedAirport}
                  customTraffic={customTraffic} onTrafficChange={setCustomTraffic}
                  customLayers={customLayers} onLayersChange={setCustomLayers}
                  nativeAvailable={nativeAvailable}
                  analysisAvailable={analysisAvailable}
                />
              )}
              {activeTab === 'methodology' && (
                <MethodologyTab />
              )}
            </Suspense>
          </ErrorBoundary>
        </main>

        <Footer />
      </div>
    </ErrorBoundary>
  )
}
