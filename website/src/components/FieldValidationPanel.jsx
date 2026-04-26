// Wraps the CdfVsPciScatter with a methodology paragraph + key findings list,
// for placement in ProjectReport above the DataSources block.
// Spec: specs/distress-trend-vs-cdf-panel.md (Phase 5)

import CdfVsPciScatter from './CdfVsPciScatter'

export default function FieldValidationPanel({ cdfResults, sections, onOpenInTool }) {
  return (
    <section className="space-y-4">
      <CdfVsPciScatter
        cdfResults={cdfResults}
        sections={sections}
        onOpenInTool={onOpenInTool}
      />

      <div className="bg-surface-lowest rounded-xl p-5 text-sm shadow-sm">
        <h4 className="text-[10px] font-bold uppercase tracking-widest text-outline mb-3">
          Methodology — why "load-adjusted deduct" instead of raw PCI
        </h4>
        <p className="text-on-surface leading-relaxed">
          FAARFIELD's CDF predicts <span className="font-bold">load-related</span> damage only —
          the cumulative damage from aircraft passes computed by Miner's rule on the LEAF
          stress field. Total PCI deterioration captures both load- and climate-driven distress
          (per ASTM D5340 §X1.1, codes are categorized as load, climate, or other). Comparing
          predicted CDF directly to raw PCI conflates two different damage modes.
        </p>
        <p className="text-on-surface leading-relaxed mt-2">
          The correct field-validation metric is{' '}
          <span className="font-mono bg-surface-low px-1.5 py-0.5 rounded">
            (100 − PCI<sub>latest</sub>) × pct_load<sub>latest</sub> / 100
          </span>
          {' '}— the load-attributable share of PCI deduct. The <code className="font-mono">pct_load</code>
          {' '}field per inspection is provided by the FAA Pavement Management System and reflects the
          ASTM D5340 deduct categorization. A toggle is provided to compare against total
          deduct for completeness.
        </p>
        <p className="text-on-surface leading-relaxed mt-2">
          <span className="font-bold">Standards cited:</span>{' '}
          ASTM D5340-12 <em>Standard Test Method for Airport Pavement Condition Index Surveys</em>;
          {' '}FAA AC 150/5380-6C <em>Guidelines and Procedures for Maintenance of Airport Pavements</em>;
          {' '}FAA AC 150/5380-7B <em>Pavement Management Program</em>.
        </p>
      </div>
    </section>
  )
}
