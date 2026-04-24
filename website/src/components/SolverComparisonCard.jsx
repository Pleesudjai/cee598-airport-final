export default function SolverComparisonCard({ jsResult, nativeStress }) {
  if (!jsResult || !nativeStress) return null

  const jsPcc = jsResult.cdf_pcc || 0
  const jsMax = jsResult.cdf_max || 0
  const nativeMax = Math.abs(nativeStress)

  return (
    <div className="rounded-2xl bg-surface-lowest p-5 shadow-[0px_12px_32px_rgba(25,28,30,0.06)]">
      <h3 className="text-sm font-bold text-on-surface mb-3">Solver Comparison</h3>
      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-outline">JS Engine CDF</span>
            <span className="font-mono font-bold text-on-surface">{jsMax.toExponential(2)}</span>
          </div>
          <div className="h-2 bg-surface-low rounded-full overflow-hidden">
            <div className="h-full bg-primary/60 rounded-full" style={{ width: `${Math.min(Math.log10(Math.max(jsMax, 0.001)) * 20 + 60, 100)}%` }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-outline">LEAF Max Stress</span>
            <span className="font-mono font-bold text-on-surface">{nativeMax.toFixed(1)} psi</span>
          </div>
          <div className="h-2 bg-surface-low rounded-full overflow-hidden">
            <div className="h-full bg-adequate/60 rounded-full" style={{ width: `${Math.min(nativeMax / 10, 100)}%` }} />
          </div>
        </div>
      </div>
      <p className="text-[10px] text-outline mt-3">
        JS engine: approximate CDF (Miner's rule). Native LEAF: real layered elastic stress field from FAARFIELD solver.
      </p>
    </div>
  )
}
