Namespace Dto

    ''' <summary>
    ''' Single (x, y) wheel coordinate, inches, in the gear/aircraft local frame.
    ''' </summary>
    Public Class WheelCoord
        Public Property x As Double
        Public Property y As Double
    End Class

    ''' <summary>
    ''' Snapshot of an in-memory LEAFACParms instance — captures exactly what
    ''' was about to be passed to LEAFClassLib.clsLEAF.GetResponses or to the
    ''' FAARFIELD FEM mesh builder. Arrays are 0-based copies of the 1-based
    ''' source arrays for ergonomic JSON output.
    ''' </summary>
    Public Class LeafParmsSnapshot
        Public Property acName As String
        Public Property libGear As String                   ' "S", "D", "2D", "2T", "3D", "N", "J", etc.
        Public Property libGearOrientation As Integer
        Public Property nTires As Integer
        Public Property gearLoad As Double                  ' lbs
        Public Property tirePressureFirst As Double         ' psi (TirePress(1) — usually all wheels equal)
        Public Property wheels As WheelCoord()              ' length = nTires (0-based)
    End Class

    ''' <summary>
    ''' Stage 1 — what the caller (Excel/UI) supplied as the aircraft input.
    ''' </summary>
    Public Class TrafficInputSnapshot
        Public Property icao As String
        Public Property gear As String
        Public Property mtow As Double
        Public Property annualDepartures As Double
        Public Property growth As Double
    End Class

    ''' <summary>
    ''' Stage 2 — raw record from combined_aircraft_library.json.
    ''' </summary>
    Public Class LibraryRecordSnapshot
        Public Property icao As String
        Public Property faarfieldName As String
        Public Property manufacturer As String
        Public Property model As String
        Public Property mtow As Double
        Public Property gear As String                      ' library's authoritative gear classification
        Public Property source As String                    ' provenance: FAARFIELD_XML, FAA_ACD, FAARFIELD_XML+FAA_ACD, existing
        Public Property hasTireGeometry As Boolean
        Public Property nWheelsPerGear As Integer
        Public Property nGear As Integer
        Public Property tirePressurePsi As Double
        Public Property tireWidthIn As Double
        Public Property tireTrackIn As Double
        Public Property mgPct As Double
        ' Raw wheel_coords from JSON (may be Nothing for FAA_ACD-only records)
        Public Property wheelCoords As WheelCoord()
        Public Property libraryFound As Boolean              ' false = this ICAO is NOT in the library
    End Class

    ''' <summary>
    ''' Stage 3 — output of AircraftLibrary.ResolveGeometry.
    ''' Captures Source classification (xml, icao_proxy, family_proxy, nearest_proxy,
    ''' gear_template, dual_fallback, proxy_override) so the audit can flag
    ''' aircraft that fell back to a template/fallback.
    ''' </summary>
    Public Class ResolvedGeometrySnapshot
        Public Property resolvedIcao As String
        Public Property faarfieldName As String
        Public Property gearType As String                   ' as resolved (from request, library, or proxy)
        Public Property libraryGearType As String            ' UNCONDITIONAL library classification
        Public Property nWheels As Integer
        Public Property tirePressure As Double               ' psi
        Public Property tireWidth As Double                  ' inches
        Public Property trackWidth As Double                 ' inches (1.6 * tireWidth)
        Public Property gearSpacing As Double                ' tire_track_in
        Public Property gearLoad As Double                   ' lbs (mtow * mgPct)
        Public Property source As String                     ' xml / icao_proxy / family_proxy / nearest_proxy / gear_template / dual_fallback / proxy_override
        Public Property wheels As WheelCoord()               ' length = nWheels
        Public Property fem3dGeometrySufficient As Boolean   ' true if Source != "dual_fallback"
        Public Property fem3dBlockReason As String           ' empty if sufficient; explanation otherwise
    End Class

    ''' <summary>
    ''' Stages 6 & 7 — FEM3D pre/post transform (PrepareAircraftForFem3d).
    ''' The transform may either preserve TireX/TireY exactly (mode = simple_native
    ''' or complex_native_family) or replace them with a synthetic dual approximation
    ''' (mode = synthetic_dual_approx). The audit uses the mode field to flag
    ''' which kind of transform fired.
    ''' </summary>
    Public Class Fem3dPrepSnapshot
        Public Property pre As LeafParmsSnapshot                 ' LEAFACParms BEFORE PrepareAircraftForFem3d
        Public Property post As LeafParmsSnapshot                ' LEAFACParms AFTER PrepareAircraftForFem3d
        Public Property mode As String                           ' simple_native, complex_native_family, synthetic_dual_approx, leaf_only_no_fem
        Public Property originalGear As String                   ' libGear before any rewrite
        Public Property finalGear As String                      ' libGear after rewrite (may equal originalGear)
        Public Property nWheelsIn As Integer
        Public Property nWheelsOut As Integer
        Public Property fem3dExecuted As Boolean                 ' true if pre/post were captured; false if includeFem3d=false
        Public Property fem3dBlockReason As String               ' empty if executed; explanation otherwise
    End Class

    ''' <summary>
    ''' Top-level response for /api/diag/gear-trace. Captures all 7 pipeline
    ''' stages for ONE (section, aircraft) pair.
    ''' </summary>
    Public Class GearTraceResponse
        Public Property trafficInput As TrafficInputSnapshot     ' Stage 1
        Public Property library As LibraryRecordSnapshot         ' Stage 2
        Public Property resolved As ResolvedGeometrySnapshot     ' Stage 3
        Public Property leafParms As LeafParmsSnapshot           ' Stage 4 (used by /api/leaf/*)
        Public Property cdfParms As LeafParmsSnapshot            ' Stage 5 (consumed by FullAnalysisWrapper — identical to Stage 4)
        Public Property fem3d As Fem3dPrepSnapshot               ' Stages 6 & 7 (Fem3dWrapper.PrepareAircraftForFem3d)

        ' Auto-classified verification flag for this aircraft.
        ' Computed by the Python audit driver from the snapshots, NOT by the backend.
        ' Backend leaves this empty; this slot reserved for round-trip if the caller
        ' chooses to write it back (not currently used).
        Public Property auditFlag As String

        ' Diagnostic notes accumulated during trace (e.g., "library record not found",
        ' "FEM3D blocked: dual_fallback geometry"). Caller may surface these in the Excel.
        Public Property notes As String()
    End Class

End Namespace
