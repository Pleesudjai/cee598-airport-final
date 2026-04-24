import { useState } from 'react'
import Hero from '../components/Hero'
import SummaryTable from '../components/SummaryTable'
import SubgradeChart from '../components/SubgradeChart'
import DataSources from '../components/DataSources'
import AirportAccordion from '../components/AirportAccordion'
import KeyFindings from '../components/KeyFindings'
import FrostPanel from '../components/FrostPanel'

export default function ProjectReport({ airports, sections, cdfResults, onOpenInTool }) {
  const underCount = cdfResults.filter(r => !r.adequate).length
  const overCount = cdfResults.filter(r => r.adequate).length

  return (
    <div className="space-y-10">
      <Hero underCount={underCount} overCount={overCount} totalSections={cdfResults.length} />

      <SummaryTable
        results={cdfResults} sections={sections} airports={airports}
        onSelectSection={(icao, secId) => onOpenInTool(icao, secId)}
      />

      <section>
        <div className="flex items-center gap-3 mb-4">
          <span className="material-symbols-outlined text-primary">apartment</span>
          <h3 className="text-xl font-bold tracking-tight">Per-Airport Detail</h3>
        </div>
        {airports.map(apt => (
          <AirportAccordion
            key={apt.icao} airport={apt} sections={sections} cdfResults={cdfResults}
            onOpenInTool={onOpenInTool}
          />
        ))}
      </section>

      <SubgradeChart airports={airports} />

      <FrostPanel onSelectAirport={icao => onOpenInTool(icao)} />

      <KeyFindings cdfResults={cdfResults} sections={sections} airports={airports} />

      <DataSources />
    </div>
  )
}
