export default function Footer() {
  return (
    <footer className="mt-16 border-t border-outline-variant/20 bg-surface-low">
      <div className="max-w-[1600px] mx-auto px-8 py-8">
        <div className="grid grid-cols-3 gap-6 text-xs text-outline">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface mb-2">Project</p>
            <p>CEE 598 Topic Airport Design — Final Project</p>
            <p>Arizona State University — Spring 2026</p>
            <p className="mt-1 font-medium text-on-surface">Chidchanok Pleesudjai</p>
            <p>cpleesud@asu.edu</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface mb-2">Methodology</p>
            <p>FAARFIELD 2.1.1 desktop-parity engine</p>
            <p>LEAFClassLib + AMClassLib (FAASR3D rigid FEM)</p>
            <p>2014 PCC fatigue (LeafCDFRigid_2014)</p>
            <p>R = 360 psi per FAA AC 150/5320-6F · SCI = 80</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface mb-2">Data Sources</p>
            <p>FAA ArcGIS — Airport locations & runways</p>
            <p>USDA NRCS SDA — Soil profiles</p>
            <p>FAA TAF — Traffic operations & forecast</p>
            <p>FAA ACD — Aircraft characteristics</p>
          </div>
        </div>
        <p className="mt-6 text-[10px] text-outline-variant text-center">
          Built with React + Vite + Tailwind CSS + Recharts + MapLibre — AeroPave Pro Design System
        </p>
      </div>
    </footer>
  )
}
