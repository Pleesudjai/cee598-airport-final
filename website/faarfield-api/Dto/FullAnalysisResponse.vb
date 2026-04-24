Namespace Dto

    Public Class FullAnalysisResponse
        Public Property cdf_ac As Double
        Public Property cdf_sub As Double
        Public Property cdf_pcc As Double
        Public Property cdf_max As Double
        Public Property controlling As String
        Public Property adequate As Boolean
        Public Property perAircraft As AircraftCdfResult()
        Public Property requiredThickness As Double  ' Design mode: required layer thickness
        Public Property designLayerIndex As Integer  ' Which layer was iterated (0=AC, 1=PCC)
        Public Property designConverged As Boolean   ' Did Newton-Raphson converge?
        Public Property designIterations As Integer  ' Number of iterations used
        Public Property estimatedLife As Double       ' Life mode: estimated remaining life
        Public Property solver As String             ' "FAARFIELD_desktop_parity" or "FAARFIELD_desktop_parity+FEM3D"
        Public Property computeTimeMs As Long
        Public Property warnings As String()

        ' CDF profile (lateral offset sweep) — for plotting CDF vs Lateral Distance
        ' All arrays are 41 elements long, one per offset (0, 10, 20, ..., 400 inches)
        Public Property cdfProfileOffsetsIn As Double()    ' lateral offset values (inches)
        Public Property cdfProfileAc As Double()           ' cumulative AC fatigue CDF at each offset
        Public Property cdfProfileSub As Double()          ' cumulative Subgrade rutting CDF at each offset
        Public Property cdfProfilePcc As Double()          ' cumulative PCC fatigue CDF at each offset
        Public Property cdfProfileTotal As Double()        ' max(ac,sub,pcc) at each offset
        Public Property controlOffsetIn As Double          ' lateral position of peak CDF (inches)

        ' FEM3D outputs (populated when useFem3d=true)
        Public Property femUsed As Boolean
        Public Property femComputeTimeMs As Long
        Public Property femAircraftCount As Integer          ' How many aircraft had FEM stress computed
        Public Property femMaxRatio As Double                ' Highest FEM/LEAF ratio across all aircraft
        Public Property femMaxRatioAircraft As String        ' ICAO of the aircraft with max ratio
    End Class

    Public Class AircraftCdfResult
        Public Property name As String
        Public Property icao As String
        Public Property mtow As Double
        Public Property gear As String
        Public Property annualDeps As Double
        Public Property designDeps As Double
        Public Property cdf As Double
        Public Property cdfMax As Double
        Public Property coverageToPass As Double

        ' FEM3D per-aircraft stress (populated when useFem3d=true)
        Public Property leafPccStress As Double       ' Pure LEAF horizontal stress at PCC bottom
        Public Property femPccStress As Double        ' FEM PCC bottom stress from clsAM
        Public Property effectivePccStress As Double  ' max(FEM, LEAF x 0.95) used in fatigue
        Public Property femRatio As Double            ' FEM / LEAF ratio

        ' Per-aircraft CDF profile across the 41 lateral offsets (controlling failure mode).
        ' Useful for plotting individual aircraft contributions to the cumulative CDF curve.
        Public Property cdfProfile As Double()        ' 41 values

        ' Tier-matched aircraft library traceability (added 2026-04-22)
        Public Property geometrySource As String   ' xml | icao_proxy | family_proxy | nearest_proxy | gear_template | dual_fallback
        Public Property nWheels As Integer
        Public Property tireWidth As Double         ' inches, from BuildLeafParms
        Public Property wheelX As Double()          ' 0-based wheel X coords (inches), from tier-matched record
        Public Property wheelY As Double()          ' 0-based wheel Y coords (inches)

        ' Library's authoritative gear classification for the resolved geometry
        ' (e.g. "2T" = triple-tandem for C-17), distinct from .gear which echoes
        ' the request's traffic-supplied gear string.  Added 2026-04-23 to expose
        ' Excel/library mismatches like C17 (excel=2D vs library=2T).
        Public Property libGear As String
    End Class

End Namespace
