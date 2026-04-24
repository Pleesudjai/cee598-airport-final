export default function SolverModeBadge({ available, analysisAvailable }) {
  if (analysisAvailable) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary/15 text-primary border border-primary/30">
        <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        Full FAARFIELD Engine
      </span>
    )
  }
  if (available) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-adequate/15 text-adequate border border-adequate/30">
        <span className="w-2 h-2 rounded-full bg-adequate animate-pulse" />
        Native FAARFIELD (LEAF)
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-outline/10 text-outline border border-outline/20">
      <span className="w-2 h-2 rounded-full bg-outline" />
      Approximate (JS Engine)
    </span>
  )
}
