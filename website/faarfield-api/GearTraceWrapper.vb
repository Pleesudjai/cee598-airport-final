Imports LEAFClassLib

''' <summary>
''' Diagnostic gear-coordinate trace per specs/gear-coordinate-trace-audit.md.
''' Captures the gear geometry at every analysis pipeline stage for ONE
''' (section, aircraft) pair so the audit Excel can verify that the wheel
''' coordinates from combined_aircraft_library.json flow through to LEAF/CDF/FEM3D
''' unchanged.
'''
''' Stages captured:
'''   1. Traffic input        — what the caller supplied (passthrough)
'''   2. Library record       — raw record from combined_aircraft_library.json
'''   3. ResolveGeometry      — output of AircraftLibrary.ResolveGeometry
'''   4. LEAF parms           — LEAFACParms passed to clsLEAF (and reused by CDF)
'''   5. CDF parms            — identical to Stage 4 (FullAnalysisWrapper reuses)
'''   6. FEM3D pre-transform  — LEAFACParms before PrepareAircraftForFem3d
'''   7. FEM3D post-transform — LEAFACParms after PrepareAircraftForFem3d
''' </summary>
Public Module GearTraceWrapper

    Public Function TraceAircraft(req As Dto.GearTraceRequest) As Dto.GearTraceResponse
        Dim resp As New Dto.GearTraceResponse()
        Dim notes As New List(Of String)

        ' Stage 1 — traffic input passthrough
        resp.trafficInput = New Dto.TrafficInputSnapshot With {
            .icao = req.icao,
            .gear = req.gear,
            .mtow = req.mtow,
            .annualDepartures = req.annualDepartures,
            .growth = req.growth
        }

        ' Stage 2 — raw library record
        Dim libRec As Dictionary(Of String, Object) = AircraftLibrary.GetByIcao(If(req.icao, ""))
        resp.library = SnapshotLibraryRecord(req.icao, libRec)
        If libRec Is Nothing Then
            notes.Add("Library record not found for ICAO """ & req.icao & """ — Stage 3+ resolves via proxy / gear template / dual_fallback.")
        End If

        ' Stage 3 — ResolveGeometry
        Dim geo = AircraftLibrary.ResolveGeometry(If(req.icao, ""), If(req.gear, ""), req.mtow, req.tirePressure)
        ' Apply caller's mgPct override (mirrors FullAnalysisWrapper.vb:616 behavior)
        If req.mgPct > 0 AndAlso req.mtow > 0 Then geo.GearLoad = req.mtow * req.mgPct
        resp.resolved = SnapshotGeometry(geo)

        ' Stage 4 — LEAFACParms (consumed by clsLEAF.GetResponses for stress + by FullAnalysisWrapper for CDF)
        Dim acName As String = If(String.IsNullOrWhiteSpace(geo.FaarfieldName),
                                   If(String.IsNullOrWhiteSpace(req.icao), "Aircraft", req.icao),
                                   geo.FaarfieldName)
        Dim leafParms = AircraftLibrary.BuildLeafParms(geo, acName)
        resp.leafParms = SnapshotLeafParms(leafParms)

        ' Stage 5 — CDF parms.  FullAnalysisWrapper builds a SINGLE LEAFACParms via
        ' the same AircraftLibrary.BuildLeafParms call (FullAnalysisWrapper.vb:634) and
        ' passes it to both LEAF (for stress) and the parity-port CDF math (which reads
        ' .libGear / .NTires / .GearLoad from the same struct).  By construction Stage 5
        ' is bit-identical to Stage 4 — emitting the snapshot here makes the audit
        ' independent of that code path so a future divergence would be caught.
        resp.cdfParms = SnapshotLeafParms(leafParms)

        ' Stages 6 & 7 — FEM3D PrepareAircraftForFem3d pre/post snapshots
        Dim fem3d As New Dto.Fem3dPrepSnapshot()
        If Not req.includeFem3d Then
            fem3d.fem3dExecuted = False
            fem3d.mode = "fem3d_skipped_by_request"
            fem3d.originalGear = If(leafParms.libGear, "")
            fem3d.finalGear = If(leafParms.libGear, "")
            fem3d.nWheelsIn = leafParms.NTires
            fem3d.nWheelsOut = leafParms.NTires
        ElseIf Not AircraftLibrary.IsFem3dGeometrySufficient(geo) Then
            fem3d.fem3dExecuted = False
            fem3d.fem3dBlockReason = AircraftLibrary.GetFem3dGeometryBlockReason(geo, acName)
            fem3d.mode = "leaf_only_no_fem"
            fem3d.originalGear = If(leafParms.libGear, "")
            fem3d.finalGear = If(leafParms.libGear, "")
            fem3d.nWheelsIn = leafParms.NTires
            fem3d.nWheelsOut = leafParms.NTires
            fem3d.pre = SnapshotLeafParms(leafParms)   ' record what would have been sent
            notes.Add("FEM3D blocked: " & fem3d.fem3dBlockReason)
        Else
            ' Clone the LEAFACParms so PrepareAircraftForFem3d can mutate freely
            ' without affecting Stage 4/5 snapshots above.
            Dim femParms = CloneLeafParms(leafParms)
            fem3d.pre = SnapshotLeafParms(femParms)
            Try
                Dim status As Fem3dWrapper.GearPrepStatus = Fem3dWrapper.RunPrepDiagnostic(femParms, geo)
                fem3d.post = SnapshotLeafParms(femParms)
                fem3d.mode = If(status.mode, "")
                fem3d.originalGear = If(status.originalGear, "")
                fem3d.finalGear = If(status.finalGear, "")
                fem3d.nWheelsIn = status.nWheelsIn
                fem3d.nWheelsOut = status.nWheelsOut
                fem3d.fem3dExecuted = True
                If Not String.IsNullOrWhiteSpace(status.note) Then notes.Add(status.note)
            Catch ex As Exception
                fem3d.fem3dExecuted = False
                fem3d.fem3dBlockReason = "PrepareAircraftForFem3d threw: " & ex.Message
                fem3d.mode = "error"
                notes.Add("FEM3D prep error: " & ex.Message)
            End Try
        End If
        resp.fem3d = fem3d

        resp.notes = notes.ToArray()
        Return resp
    End Function

    ' ================================================================
    ' Snapshot helpers
    ' ================================================================

    Private Function SnapshotLibraryRecord(icao As String, rec As Dictionary(Of String, Object)) As Dto.LibraryRecordSnapshot
        Dim snap As New Dto.LibraryRecordSnapshot()
        snap.icao = If(icao, "")
        If rec Is Nothing Then
            snap.libraryFound = False
            Return snap
        End If
        snap.libraryFound = True
        snap.faarfieldName = GetStr(rec, "faarfield_name")
        snap.manufacturer = GetStr(rec, "manufacturer")
        snap.model = GetStr(rec, "model")
        snap.mtow = CDbl(GetVal(rec, "mtow", 0.0))
        snap.gear = GetStr(rec, "gear")
        snap.source = GetStr(rec, "source")
        snap.hasTireGeometry = CBool(GetVal(rec, "has_tire_geometry", False))
        snap.nWheelsPerGear = CInt(GetVal(rec, "n_wheels_per_gear", 0))
        snap.nGear = CInt(GetVal(rec, "n_gear", 0))
        snap.tirePressurePsi = CDbl(GetVal(rec, "tire_pressure_psi", 0.0))
        snap.tireWidthIn = CDbl(GetVal(rec, "tire_width_in", 0.0))
        snap.tireTrackIn = CDbl(GetVal(rec, "tire_track_in", 0.0))
        snap.mgPct = CDbl(GetVal(rec, "mg_pct", 0.0))

        Dim coords = TryCast(GetVal(rec, "wheel_coords", Nothing), Object())
        If coords IsNot Nothing AndAlso coords.Length > 0 Then
            Dim list As New List(Of Dto.WheelCoord)
            For Each c As Object In coords
                Dim pt As Dictionary(Of String, Object) = TryCast(c, Dictionary(Of String, Object))
                If pt IsNot Nothing Then
                    list.Add(New Dto.WheelCoord With {
                        .x = CDbl(GetVal(pt, "x", 0.0)),
                        .y = CDbl(GetVal(pt, "y", 0.0))
                    })
                End If
            Next
            snap.wheelCoords = list.ToArray()
        End If
        Return snap
    End Function

    Private Function SnapshotGeometry(geo As AircraftLibrary.AircraftGeometry) As Dto.ResolvedGeometrySnapshot
        Dim snap As New Dto.ResolvedGeometrySnapshot()
        If geo Is Nothing Then Return snap
        snap.resolvedIcao = If(geo.ResolvedIcao, "")
        snap.faarfieldName = If(geo.FaarfieldName, "")
        snap.gearType = If(geo.GearType, "")
        snap.libraryGearType = If(geo.LibraryGearType, "")
        snap.nWheels = geo.NWheels
        snap.tirePressure = geo.TirePressure
        snap.tireWidth = geo.TireWidth
        snap.trackWidth = geo.TrackWidth
        snap.gearSpacing = geo.GearSpacing
        snap.gearLoad = geo.GearLoad
        snap.source = If(geo.Source, "")
        snap.fem3dGeometrySufficient = AircraftLibrary.IsFem3dGeometrySufficient(geo)
        snap.fem3dBlockReason = If(snap.fem3dGeometrySufficient, "", AircraftLibrary.GetFem3dGeometryBlockReason(geo, snap.faarfieldName))

        If geo.WheelX IsNot Nothing AndAlso geo.WheelY IsNot Nothing AndAlso geo.NWheels > 0 Then
            Dim wheels(geo.NWheels - 1) As Dto.WheelCoord
            For i As Integer = 0 To geo.NWheels - 1
                wheels(i) = New Dto.WheelCoord With {.x = geo.WheelX(i), .y = geo.WheelY(i)}
            Next
            snap.wheels = wheels
        End If
        Return snap
    End Function

    ' parms is a Structure (value type) — passed by value, copied on call.
    ' We snapshot fields and copy the 1-based arrays into 0-based wheel coords.
    Private Function SnapshotLeafParms(parms As clsLEAF.LEAFACParms) As Dto.LeafParmsSnapshot
        Dim snap As New Dto.LeafParmsSnapshot()
        snap.acName = If(parms.ACname, "")
        snap.libGear = If(parms.libGear, "")
        snap.libGearOrientation = parms.LibGearOrientation
        snap.nTires = parms.NTires
        snap.gearLoad = parms.GearLoad

        ' LEAFACParms arrays are 1-based with length NTires+1.  Copy slots 1..NTires
        ' into a 0-based array for ergonomic JSON output.
        If parms.NTires > 0 AndAlso parms.TireX IsNot Nothing AndAlso parms.TireY IsNot Nothing Then
            Dim wheels(parms.NTires - 1) As Dto.WheelCoord
            For i As Integer = 0 To parms.NTires - 1
                Dim slot As Integer = i + 1
                Dim wx As Double = If(slot < parms.TireX.Length, parms.TireX(slot), 0.0)
                Dim wy As Double = If(slot < parms.TireY.Length, parms.TireY(slot), 0.0)
                wheels(i) = New Dto.WheelCoord With {.x = wx, .y = wy}
            Next
            snap.wheels = wheels
        End If

        If parms.NTires > 0 AndAlso parms.TirePress IsNot Nothing AndAlso parms.TirePress.Length >= 2 Then
            snap.tirePressureFirst = parms.TirePress(1)
        End If
        Return snap
    End Function

    ''' <summary>
    ''' Deep-copy a LEAFACParms instance so PrepareAircraftForFem3d can mutate
    ''' the clone without affecting the Stage 4/5 snapshot's underlying arrays.
    ''' </summary>
    Private Function CloneLeafParms(src As clsLEAF.LEAFACParms) As clsLEAF.LEAFACParms
        Dim clone As New clsLEAF.LEAFACParms()
        clone.ACname = src.ACname
        clone.libGear = src.libGear
        clone.LibGearOrientation = src.LibGearOrientation
        clone.NTires = src.NTires
        clone.GearLoad = src.GearLoad
        If src.TireX IsNot Nothing Then
            ReDim clone.TireX(src.TireX.Length - 1)
            Array.Copy(src.TireX, clone.TireX, src.TireX.Length)
        End If
        If src.TireY IsNot Nothing Then
            ReDim clone.TireY(src.TireY.Length - 1)
            Array.Copy(src.TireY, clone.TireY, src.TireY.Length)
        End If
        If src.TirePress IsNot Nothing Then
            ReDim clone.TirePress(src.TirePress.Length - 1)
            Array.Copy(src.TirePress, clone.TirePress, src.TirePress.Length)
        End If
        Return clone
    End Function

    ' ================================================================
    ' Dictionary helpers (mirror AircraftLibrary's private GetStr/GetVal)
    ' ================================================================
    Private Function GetStr(dict As Dictionary(Of String, Object), key As String) As String
        Dim v As Object = Nothing
        If dict.TryGetValue(key, v) AndAlso v IsNot Nothing Then Return v.ToString()
        Return ""
    End Function

    Private Function GetVal(dict As Dictionary(Of String, Object), key As String, defaultVal As Object) As Object
        Dim v As Object = Nothing
        If dict.TryGetValue(key, v) AndAlso v IsNot Nothing Then Return v
        Return defaultVal
    End Function

End Module
