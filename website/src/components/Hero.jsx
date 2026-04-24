export default function Hero({ underCount, overCount, totalSections }) {
  return (
    <section className="grid grid-cols-12 gap-6">
      <div className="col-span-8">
        <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2">CEE 598 Airport Design — Final Project</p>
        <h2 className="text-4xl font-extrabold tracking-tighter text-on-surface leading-tight">
          Airport Pavement Structural<br />Evaluation using FAARFIELD
        </h2>
        <p className="mt-3 text-sm text-outline max-w-2xl">
          Interactive CDF analysis for 6 airports (13 pavement sections) using FAARFIELD 2.1.1 methodology.
          Hybrid data from FAA ArcGIS, USDA NRCS, and FAA Terminal Area Forecast.
        </p>
        <p className="mt-2 text-xs text-outline">Chidchanok Pleesudjai — Arizona State University — Spring 2026</p>
      </div>
      <div className="col-span-4 flex gap-4">
        <div className="flex-1 bg-failing-bg rounded-xl p-6 flex flex-col items-center justify-center">
          <span className="text-5xl font-extrabold text-failing">{underCount}</span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-failing mt-1">Under-designed</span>
          <span className="text-xs text-outline mt-0.5">CDF &gt; 1.0</span>
        </div>
        <div className="flex-1 bg-adequate-bg rounded-xl p-6 flex flex-col items-center justify-center">
          <span className="text-5xl font-extrabold text-adequate">{overCount}</span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-adequate mt-1">Over-designed</span>
          <span className="text-xs text-outline mt-0.5">CDF &lt; 1.0</span>
        </div>
      </div>
    </section>
  )
}
