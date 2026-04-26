Namespace Dto

    ''' <summary>
    ''' Diagnostic request for /api/diag/gear-trace.
    ''' Captures the gear-coordinate flow for ONE aircraft on ONE pavement structure
    ''' through every analysis stage: input -> library -> ResolveGeometry -> LEAF parms
    ''' (CDF reuses) -> FEM3D pre-transform -> FEM3D post-transform.
    ''' </summary>
    Public Class GearTraceRequest
        ' Pavement structure (same shape as /api/analysis/cdf)
        Public Property layers As LayerInput()
        Public Property subgrade As SubgradeInput

        ' Single aircraft to trace (caller iterates the audit)
        Public Property icao As String
        Public Property gear As String              ' Excel/UI-supplied gear label
        Public Property mtow As Double              ' lbs
        Public Property tirePressure As Double      ' psi (0 = use library default)
        Public Property mgPct As Double             ' main-gear weight fraction (0 = use library/default 0.95)

        ' Whether to also run FEM3D PrepareAircraftForFem3d for the post-transform snapshot.
        ' Defaults true — without it stages 6/7 are blank.
        Public Property includeFem3d As Boolean = True

        ' Stage 1 fields (pure passthrough for the audit Excel — backend doesn't read these)
        Public Property annualDepartures As Double
        Public Property growth As Double
    End Class

End Namespace
