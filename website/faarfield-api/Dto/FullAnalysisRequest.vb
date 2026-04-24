Namespace Dto

    Public Class FullAnalysisRequest
        Public Property layers As LayerInput()
        Public Property subgrade As SubgradeInput
        Public Property aircraft As AircraftTrafficInput()
        Public Property growth As Double        ' Annual growth rate as decimal (e.g., 0.032)
        Public Property life As Integer         ' Design life in years (default 20)
        Public Property flexStr As Double       ' PCC flexural strength psi (default 700)
        Public Property sci As Double           ' Structural Condition Index (default 80)
        Public Property designType As String    ' "FlexOnRigid", "NewFlex", "NewRigid"
        Public Property runMode As String       ' "cdf" (life analysis) or "design" (thickness design)

        ' AC mix design properties for RDEC fatigue model (0 = use defaults)
        Public Property acFlexuralMod As Double   ' Dynamic flexural modulus psi (default 600000)
        Public Property acAirVoids As Double      ' Air void content % (default 3.5)
        Public Property acAsphaltVol As Double    ' Asphalt content by volume % (default 12)
        Public Property acPNMS As Double          ' % passing nominal max sieve (default 95)
        Public Property acPPCS As Double          ' % passing primary control sieve (default 58)
        Public Property acP200 As Double          ' % passing #200 sieve (default 4.5)

        ' FEM3D opt-in: when true, compute FEM PCC stress per aircraft and apply FAARFIELD's
        ' max(FEM, LEAF x 0.95) rule to PCC fatigue. Adds ~30s per aircraft at desktop-parity mesh.
        Public Property useFem3d As Boolean

        ' FEM element size in inches. 0 or unset = FAARFIELD desktop parity (5").
        ' 10 = fast preview (~2x faster, ~5-10% underprediction of peak stress).
        ' Valid range 2-15.
        Public Property fem3dMeshSize As Integer
    End Class

    Public Class AircraftTrafficInput
        Public Property icao As String
        Public Property name As String
        Public Property mtow As Double          ' Max takeoff weight (lbs)
        Public Property gear As String          ' S, D, 2D, 2T, etc.
        Public Property annualDeps As Double    ' Annual departures
        Public Property mgPct As Double         ' Main gear % (default 0.95)
        Public Property tirePressure As Double  ' psi (default from library)
    End Class

End Namespace
