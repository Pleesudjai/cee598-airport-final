import Hero from '../components/Hero'
import ProjectSummaryUnified from '../components/ProjectSummaryUnified'
import SubgradeChart from '../components/SubgradeChart'
import DataSources from '../components/DataSources'
import KeyFindings from '../components/KeyFindings'
import FrostPanel from '../components/FrostPanel'
import FieldValidationPanel from '../components/FieldValidationPanel'

export default function ProjectReport({ airports, sections, cdfResults, onOpenInTool }) {
  const underCount = cdfResults.filter(r => !r.adequate).length
  const overCount = cdfResults.filter(r => r.adequate).length

  return (
    <div className="space-y-10">
      <Hero underCount={underCount} overCount={overCount} totalSections={cdfResults.length} />

      <ProjectSummaryUnified
        airports={airports}
        sections={sections}
        cdfResults={cdfResults}
        onOpenInTool={onOpenInTool}
      />

      <SubgradeChart airports={airports} />

      <FrostPanel onSelectAirport={icao => onOpenInTool(icao)} />

      <KeyFindings cdfResults={cdfResults} sections={sections} airports={airports} />

      <FieldValidationPanel
        cdfResults={cdfResults}
        sections={sections}
        onOpenInTool={onOpenInTool}
      />

      <DataSources />
    </div>
  )
}
