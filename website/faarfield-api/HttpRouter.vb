Imports System.Net
Imports System.IO
Imports System.Text
Imports System.Collections.Specialized

Public Module HttpRouter

    Public LeafAvailable As Boolean = False
    Public FemAvailable As Boolean = False
    Public Fem3dAvailable As Boolean = False
    Public AnalysisAvailable As Boolean = False
    Public Nike3dAvailable As Boolean = False
    Public AircraftCount As Integer = 0
    Public AircraftWithGeometry As Integer = 0

    ' Serialize lock for FAARFIELD globals (not thread-safe)
    Private ReadOnly analysisLock As New Object()

    Public Sub HandleRequest(ctx As HttpListenerContext)
        Dim req As HttpListenerRequest = ctx.Request
        Dim resp As HttpListenerResponse = ctx.Response

        ' CORS headers on every response
        resp.Headers.Add("Access-Control-Allow-Origin", "*")
        resp.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        resp.Headers.Add("Access-Control-Allow-Headers", "Content-Type")
        resp.ContentType = "application/json; charset=utf-8"

        ' OPTIONS preflight
        If req.HttpMethod = "OPTIONS" Then
            resp.StatusCode = 204
            resp.Close()
            Return
        End If

        Dim path As String = req.Url.AbsolutePath.TrimEnd("/"c)
        Dim method As String = req.HttpMethod

        Console.WriteLine(DateTime.Now.ToString("HH:mm:ss") & " " & method & " " & path)

        Try
            If method = "GET" AndAlso path = "/api/health" Then
                HandleHealth(resp)

            ElseIf method = "POST" AndAlso path = "/api/leaf/grid" Then
                HandleLeafGrid(ReadBody(req), resp)

            ElseIf method = "POST" AndAlso path = "/api/leaf/point" Then
                HandleLeafPoint(ReadBody(req), resp)

            ElseIf method = "GET" AndAlso path = "/api/aircraft/list" Then
                HandleAircraftList(resp)

            ElseIf method = "GET" AndAlso path.StartsWith("/api/aircraft/resolve/") Then
                Dim icao As String = path.Substring("/api/aircraft/resolve/".Length).Trim()
                HandleAircraftResolve(icao, req.QueryString, resp)

            ElseIf method = "GET" AndAlso path.StartsWith("/api/aircraft/") Then
                Dim icao As String = path.Substring("/api/aircraft/".Length).Trim()
                HandleAircraftLookup(icao, resp)

            ElseIf method = "POST" AndAlso path = "/api/analysis/cdf" Then
                HandleAnalysisCdf(ReadBody(req), resp)

            ElseIf method = "POST" AndAlso path = "/api/analysis/design" Then
                HandleAnalysisDesign(ReadBody(req), resp)

            ElseIf method = "POST" AndAlso path = "/api/fem3d/stress" Then
                HandleFem3dStress(ReadBody(req), resp)

            ElseIf method = "POST" AndAlso path = "/api/fem3d/mesh" Then
                HandleFem3dMesh(ReadBody(req), resp)

            ElseIf method = "GET" AndAlso path = "/api/diag/fem-spike" Then
                HandleFemSpike(req.QueryString, resp)

            ElseIf method = "GET" AndAlso path = "/api/diag/nodal-load-spike" Then
                HandleNodalLoadSpike(req.QueryString, resp)

            ElseIf method = "GET" AndAlso path = "/api/diag/complex-exact" Then
                HandleComplexExact(req.QueryString, resp)

            ElseIf method = "POST" AndAlso path = "/api/diag/gear-trace" Then
                HandleGearTrace(ReadBody(req), resp)

            Else
                SendJson(resp, 404, JsonHelper.Serialize(New Dto.ErrorResponse With {
                    .error = "Not Found",
                    .detail = "Unknown route: " & method & " " & path
                }))
            End If

        Catch ex As Exception
            Console.WriteLine("  ERROR: " & ex.Message)
            If ex.InnerException IsNot Nothing Then
                Console.WriteLine("  INNER: " & ex.InnerException.Message)
            End If
            SendJson(resp, 500, JsonHelper.Serialize(New Dto.ErrorResponse With {
                .error = "Internal Server Error",
                .detail = ex.Message & If(ex.InnerException IsNot Nothing, " -> " & ex.InnerException.Message, "")
            }))
        End Try
    End Sub

    ' ============================================================
    ' Diagnostic spike — Phase A of specs/fem3d-real-stress-export.md.
    ' Proves we can re-invoke FAASR3D against the populated modPG/modWorld
    ' state and reflect into clsPrintOut.st(,,,) for real per-element FEM stress.
    ' GET /api/diag/fem-spike?icao=B738
    ' ============================================================
    Private Sub HandleFemSpike(qs As NameValueCollection, resp As HttpListenerResponse)
        If Not Fem3dAvailable Then
            SendJson(resp, 503, JsonHelper.Serialize(New Dto.ErrorResponse With {
                .error = "FEM3D solver unavailable",
                .detail = "AMClassLib + FAAMeshClassLib + FEMClassLib did not load"
            }))
            Return
        End If
        Dim icao As String = If(qs("icao"), "B738").Trim().ToUpperInvariant()
        Dim writePrintout As Boolean = (qs("writePrintout") = "1" OrElse qs("writePrintout") = "true")
        Dim bypassGear As Boolean = (qs("bypassNormalization") = "1" OrElse qs("bypassNormalization") = "true")
        Console.WriteLine("  FEM-SPIKE: starting for " & icao & " writePrintout=" & writePrintout & " bypassGear=" & bypassGear)
        Dim r As Fem3dStressSpike.SpikeResult
        SyncLock analysisLock
            r = Fem3dStressSpike.RunSpike(icao, writePrintout, bypassGear)
        End SyncLock
        If r.success Then
            Console.WriteLine("  FEM-SPIKE: OK — " & r.stNonzeroCount & " nonzero st entries, peak |sigma|=" &
                              r.stPeakAbsValue.ToString("F2") & " psi at elem=" & r.stPeakLocation(0) &
                              " comp=" & r.stPeakLocation(1) & " gp=" & r.stPeakLocation(2))
        Else
            Console.WriteLine("  FEM-SPIKE: FAILED at phase=" & r.phase & " — " & r.errorMessage)
        End If
        SendJson(resp, If(r.success, 200, 500), JsonHelper.Serialize(r))
    End Sub

    ' ============================================================
    ' GET /api/diag/nodal-load-spike?icao=B77L
    ' Phase 2 pre-spike: inject the real wheel array into modAutoMesh.NodalLoad
    ' and verify that Conversion() + FAASR3D honors the extended load set.
    ' ============================================================
    Private Sub HandleNodalLoadSpike(qs As NameValueCollection, resp As HttpListenerResponse)
        If Not Fem3dAvailable Then
            SendJson(resp, 503, JsonHelper.Serialize(New Dto.ErrorResponse With {
                .error = "FEM3D solver unavailable",
                .detail = "AMClassLib + FAAMeshClassLib + FEMClassLib did not load"
            }))
            Return
        End If
        Dim icao As String = If(qs("icao"), "B77L").Trim().ToUpperInvariant()
        Console.WriteLine("  NL-SPIKE: starting for " & icao)
        Dim r As Fem3dStressSpike.NodalLoadSpikeResult
        SyncLock analysisLock
            r = Fem3dStressSpike.RunNodalLoadInjectionSpike(icao)
        End SyncLock
        If r.success Then
            Console.WriteLine("  NL-SPIKE: OK — baseline IPC.nload=" & r.baselineIpcNload &
                              " → injected IPC.nload=" & r.injectedIpcNload &
                              " (+" & r.actualInjectedCount & " wheels); st peak " &
                              r.baselineStPeakAbs.ToString("F2") & " @" & r.baselineStPeakElem &
                              " → " & r.injectedStPeakAbs.ToString("F2") & " @" & r.injectedStPeakElem)
        Else
            Console.WriteLine("  NL-SPIKE: FAILED at phase=" & r.phase & " — " & r.errorMessage)
        End If
        SendJson(resp, If(r.success, 200, 500), JsonHelper.Serialize(r))
    End Sub

    ' ============================================================
    ' GET /api/diag/complex-exact?icao=B77L[&writePrintout=1]
    ' Phase 2 Steps 9-15: real wheel NodalLoad via tributary algorithm,
    ' then second FAASR3D solve. Reports applied loads vs expected + stress peak.
    ' ============================================================
    Private Sub HandleComplexExact(qs As NameValueCollection, resp As HttpListenerResponse)
        If Not Fem3dAvailable Then
            SendJson(resp, 503, JsonHelper.Serialize(New Dto.ErrorResponse With {
                .error = "FEM3D solver unavailable",
                .detail = "AMClassLib + FAAMeshClassLib + FEMClassLib did not load"
            }))
            Return
        End If
        Dim icao As String = If(qs("icao"), "B77L").Trim().ToUpperInvariant()
        Dim writePrintout As Boolean = (qs("writePrintout") = "1" OrElse qs("writePrintout") = "true")
        Console.WriteLine("  CEM: starting for " & icao & " writePrintout=" & writePrintout)

        ' Look up MTOW from library so geo.GearLoad populates.
        Dim libRec = AircraftLibrary.Resolve(icao, "", 0)
        Dim mtow As Double = 0
        If libRec IsNot Nothing Then
            Dim m = libRec("mtow")
            If m IsNot Nothing Then mtow = CDbl(m)
        End If
        Dim geo As AircraftLibrary.AircraftGeometry = AircraftLibrary.ResolveGeometry(icao, "", mtow, 0)
        If geo Is Nothing Then
            SendJson(resp, 404, JsonHelper.Serialize(New Dto.ErrorResponse With {
                .error = "Aircraft not resolvable", .detail = icao
            }))
            Return
        End If
        Dim acParms As LEAFClassLib.clsLEAF.LEAFACParms = AircraftLibrary.BuildLeafParms(geo, icao)
        Dim layers(1) As Dto.LayerInput
        layers(0) = New Dto.LayerInput With {.type = "P-401", .h = 4.0, .E = 200000, .nu = 0.35}
        layers(1) = New Dto.LayerInput With {.type = "P-501", .h = 12.0, .E = 4000000, .nu = 0.15}
        Dim subgrade As New Dto.SubgradeInput With {.E = 12000, .nu = 0.4}

        Dim r As Fem3dWrapper.Fem3dResult
        SyncLock analysisLock
            r = Fem3dWrapper.ComputePccStressComplexExact(
                layers, subgrade, acParms, geo, "FlexOnRigid", False, False, writePrintout)
        End SyncLock
        If r.success Then
            Console.WriteLine("  CEM: OK — mode=" & r.gearPrepMode & " peak=" & r.pccBottomStress.ToString("F2") &
                              " total=" & r.computeTimeMs & "ms")
        Else
            Console.WriteLine("  CEM: FAILED — " & r.errorMessage)
        End If
        SendJson(resp, If(r.success, 200, 500), JsonHelper.Serialize(r))
    End Sub

    ' ============================================================
    ' Health
    ' ============================================================
    Private Sub HandleHealth(resp As HttpListenerResponse)
        SendJson(resp, 200, JsonHelper.Serialize(New Dto.HealthResponse With {
            .status = "ok",
            .version = "0.3.0",
            .leafAvailable = LeafAvailable,
            .femAvailable = FemAvailable,
            .fem3dAvailable = Fem3dAvailable,
            .analysisAvailable = AnalysisAvailable,
            .nike3dAvailable = Nike3dAvailable,
            .aircraftCount = AircraftCount,
            .aircraftWithGeometry = AircraftWithGeometry
        }))
    End Sub

    ' ============================================================
    ' LEAF stress endpoints (existing)
    ' ============================================================
    Private Sub HandleLeafGrid(body As String, resp As HttpListenerResponse)
        If Not LeafAvailable Then
            SendJson(resp, 503, JsonHelper.Serialize(New Dto.ErrorResponse With {
                .error = "LEAF solver unavailable", .detail = "LEAFClassLib.dll not loaded"
            }))
            Return
        End If
        Dim request As Dto.LeafGridRequest = JsonHelper.Deserialize(Of Dto.LeafGridRequest)(body)
        Dim sw As New Diagnostics.Stopwatch()
        sw.Start()
        Dim result As Dto.LeafGridResponse
        SyncLock analysisLock
            result = LeafSolverWrapper.ComputeGrid(request)
        End SyncLock
        sw.Stop()
        result.meta = New Dto.ResponseMeta With {
            .solver = "LEAF", .evalDepthIn = request.evalDepthIn, .computeTimeMs = sw.ElapsedMilliseconds
        }
        Console.WriteLine("  Grid " & request.gridPoints & "x" & request.gridPoints & " in " & sw.ElapsedMilliseconds & "ms")
        SendJson(resp, 200, JsonHelper.Serialize(result))
    End Sub

    Private Sub HandleLeafPoint(body As String, resp As HttpListenerResponse)
        If Not LeafAvailable Then
            SendJson(resp, 503, JsonHelper.Serialize(New Dto.ErrorResponse With {
                .error = "LEAF solver unavailable", .detail = "LEAFClassLib.dll not loaded"
            }))
            Return
        End If
        Dim request As Dto.LeafPointRequest = JsonHelper.Deserialize(Of Dto.LeafPointRequest)(body)
        Dim sw As New Diagnostics.Stopwatch()
        sw.Start()
        Dim result As Object
        SyncLock analysisLock
            result = LeafSolverWrapper.ComputeProfile(request)
        End SyncLock
        sw.Stop()
        Console.WriteLine("  Profile " & request.evalDepths.Length & " depths in " & sw.ElapsedMilliseconds & "ms")
        SendJson(resp, 200, JsonHelper.Serialize(result))
    End Sub

    ' ============================================================
    ' Aircraft library endpoints
    ' ============================================================
    Private Sub HandleAircraftList(resp As HttpListenerResponse)
        Dim summaries = AircraftLibrary.GetSummaryList()
        SendJson(resp, 200, JsonHelper.Serialize(summaries))
    End Sub

    Private Sub HandleAircraftLookup(icao As String, resp As HttpListenerResponse)
        Dim ac = AircraftLibrary.GetByIcao(icao)
        If ac Is Nothing Then
            SendJson(resp, 404, JsonHelper.Serialize(New Dto.ErrorResponse With {
                .error = "Aircraft not found", .detail = "No aircraft with ICAO code: " & icao
            }))
        Else
            SendJson(resp, 200, JsonHelper.Serialize(ac))
        End If
    End Sub

    ' GET /api/aircraft/resolve/{icao}?gear=&mtow=&tirePressure=
    ' Diagnostic: invokes AircraftLibrary.ResolveGeometry without solving FEM or LEAF.
    ' Returns the full AircraftGeometry including Source/ResolvedIcao provenance.
    ' Use to verify proxy/template resolution for any ICAO — built-in smoke test.
    Private Sub HandleAircraftResolve(icao As String, query As NameValueCollection, resp As HttpListenerResponse)
        If String.IsNullOrWhiteSpace(icao) Then
            SendJson(resp, 400, JsonHelper.Serialize(New Dto.ErrorResponse With {
                .error = "Missing ICAO", .detail = "Path form: /api/aircraft/resolve/{icao}"
            }))
            Return
        End If

        Dim gear As String = If(query("gear"), "")
        Dim mtow As Double = 0 : Double.TryParse(If(query("mtow"), ""), mtow)
        Dim tirePressure As Double = 0 : Double.TryParse(If(query("tirePressure"), ""), tirePressure)

        Dim geo = AircraftLibrary.ResolveGeometry(icao, gear, mtow, tirePressure)

        Dim coords As New List(Of Dictionary(Of String, Object))
        If geo IsNot Nothing AndAlso geo.WheelX IsNot Nothing AndAlso geo.WheelY IsNot Nothing Then
            For i As Integer = 0 To geo.NWheels - 1
                Dim pt As New Dictionary(Of String, Object)
                pt("x") = geo.WheelX(i)
                pt("y") = geo.WheelY(i)
                coords.Add(pt)
            Next
        End If

        Dim response As New Dictionary(Of String, Object)
        response("icao") = icao
        response("inputs") = New Dictionary(Of String, Object) From {
            {"gear", gear}, {"mtow", mtow}, {"tirePressure", tirePressure}
        }
        response("geometrySource") = geo.Source
        response("resolvedIcao") = geo.ResolvedIcao
        response("faarfieldName") = geo.FaarfieldName
        response("gearType") = geo.GearType
        response("libraryGearType") = geo.LibraryGearType   ' unconditional library value (e.g., C-17 = "2T")
        response("nWheels") = geo.NWheels
        response("tirePressure") = geo.TirePressure
        response("tireWidth") = geo.TireWidth
        response("trackWidth") = geo.TrackWidth
        response("gearSpacing") = geo.GearSpacing
        response("gearLoad") = geo.GearLoad
        response("fem3dSufficient") = AircraftLibrary.IsFem3dGeometrySufficient(geo)
        response("wheelCoords") = coords.ToArray()

        SendJson(resp, 200, JsonHelper.Serialize(response))
    End Sub

    ' ============================================================
    ' Full analysis endpoints (CDF, thickness design)
    ' ============================================================
    Private Sub HandleAnalysisCdf(body As String, resp As HttpListenerResponse)
        If Not AnalysisAvailable Then
            SendJson(resp, 503, JsonHelper.Serialize(New Dto.ErrorResponse With {
                .error = "Analysis engine unavailable", .detail = "FaarFieldAnalysis.dll not loaded"
            }))
            Return
        End If
        Dim request As Dto.FullAnalysisRequest = JsonHelper.Deserialize(Of Dto.FullAnalysisRequest)(body)
        Dim sw As New Diagnostics.Stopwatch()
        sw.Start()
        Dim result As Dto.FullAnalysisResponse
        SyncLock analysisLock
            result = FullAnalysisWrapper.RunCdfAnalysis(request)
        End SyncLock
        sw.Stop()
        result.computeTimeMs = sw.ElapsedMilliseconds
        Console.WriteLine("  CDF analysis: " & result.cdf_max.ToString("E4") & " (" & result.controlling & ") in " & sw.ElapsedMilliseconds & "ms")
        SendJson(resp, 200, JsonHelper.Serialize(result))
    End Sub

    Private Sub HandleAnalysisDesign(body As String, resp As HttpListenerResponse)
        If Not AnalysisAvailable Then
            SendJson(resp, 503, JsonHelper.Serialize(New Dto.ErrorResponse With {
                .error = "Analysis engine unavailable", .detail = "FaarFieldAnalysis.dll not loaded"
            }))
            Return
        End If
        Dim request As Dto.FullAnalysisRequest = JsonHelper.Deserialize(Of Dto.FullAnalysisRequest)(body)
        Dim sw As New Diagnostics.Stopwatch()
        sw.Start()
        Dim result As Dto.FullAnalysisResponse
        SyncLock analysisLock
            result = FullAnalysisWrapper.RunDesign(request)
        End SyncLock
        sw.Stop()
        result.computeTimeMs = sw.ElapsedMilliseconds
        Console.WriteLine("  Design: required=" & result.requiredThickness.ToString("F2") & " in " & sw.ElapsedMilliseconds & "ms")
        SendJson(resp, 200, JsonHelper.Serialize(result))
    End Sub

    ' ============================================================
    ' FEM3D probe endpoint — Phase 1
    ' ============================================================
    Private Sub HandleFem3dStress(body As String, resp As HttpListenerResponse)
        If Not Fem3dAvailable Then
            SendJson(resp, 503, JsonHelper.Serialize(New Dto.ErrorResponse With {
                .error = "FEM3D solver unavailable",
                .detail = "AMClassLib + FAAMeshClassLib + FEMClassLib did not load"
            }))
            Return
        End If

        ' Reuse LeafGridRequest shape — layers, subgrade, one aircraft
        Dim request As Dto.LeafGridRequest = JsonHelper.Deserialize(Of Dto.LeafGridRequest)(body)

        ' Resolve aircraft geometry via library
        Dim acParms As LEAFClassLib.clsLEAF.LEAFACParms
        Dim geo As AircraftLibrary.AircraftGeometry = Nothing
        If Not String.IsNullOrEmpty(request.aircraft.icao) Then
            geo = AircraftLibrary.ResolveGeometry(
                request.aircraft.icao, If(request.aircraft.gear, ""),
                If(request.aircraft.mtow > 0, request.aircraft.mtow, request.aircraft.gearLoad / 0.95),
                request.aircraft.tirePressure)
            If request.aircraft.gearLoad > 0 Then geo.GearLoad = request.aircraft.gearLoad
            If Not AircraftLibrary.IsFem3dGeometrySufficient(geo) Then
                Dim acLabel As String = If(request.aircraft.name, request.aircraft.icao)
                SendJson(resp, 422, JsonHelper.Serialize(New Dto.ErrorResponse With {
                    .error = "Insufficient FEM3D geometry",
                    .detail = AircraftLibrary.GetFem3dGeometryBlockReason(geo, acLabel)
                }))
                Return
            End If
            acParms = AircraftLibrary.BuildLeafParms(geo, If(request.aircraft.name, request.aircraft.icao))
        Else
            ' Fallback: build from raw fields
            acParms = New LEAFClassLib.clsLEAF.LEAFACParms()
            acParms.ACname = If(request.aircraft.name, "Aircraft")
            acParms.GearLoad = request.aircraft.gearLoad
            acParms.NTires = request.aircraft.nTires
            acParms.libGear = If(request.aircraft.gear, If(request.aircraft.nTires = 2, "D", ""))
            acParms.LibGearOrientation = 0
            ReDim acParms.TirePress(request.aircraft.nTires)
            ReDim acParms.TireX(request.aircraft.nTires)
            ReDim acParms.TireY(request.aircraft.nTires)
            Dim halfSpacing As Double = request.aircraft.tireSpacingIn / 2.0
            For i As Integer = 1 To request.aircraft.nTires
                acParms.TirePress(i) = If(request.aircraft.tirePressure > 0, request.aircraft.tirePressure, 200.0)
                acParms.TireX(i) = If(i = 1, -halfSpacing, halfSpacing)
                acParms.TireY(i) = 0.0
            Next
        End If

        ' Run under analysis lock (FEM is not thread-safe).
        ' gridPoints field is repurposed here as optional mesh element size in inches (0 or unset = desktop parity 5").
        Dim meshSizeIn As Integer = request.gridPoints
        Dim wantMesh As Boolean = request.includeMesh
        Dim wantFull As Boolean = request.highDetail
        Dim wantFilter As Boolean = request.filterCoarse
        Console.WriteLine("  FEM3D: starting ComputeResponse for " & acParms.ACname & " (gearLoad=" & acParms.GearLoad.ToString("F0") & " lbs, meshSize=" & If(meshSizeIn > 0, meshSizeIn & """", "5"" desktop parity") & ", includeMesh=" & wantMesh & ", highDetail=" & wantFull & ", filterCoarse=" & wantFilter & ")")
        Dim result As Fem3dWrapper.Fem3dResult
        ' Auto-dispatch complex gears to the exact-manual path (Phase 2/3).
        ' Simple gears (S, D) keep using ComputePccStress — Phase D validated.
        Dim isComplexGear As Boolean = IsComplexGearType(geo, acParms)
        SyncLock analysisLock
            If isComplexGear AndAlso geo IsNot Nothing AndAlso geo.NWheels >= 3 Then
                Console.WriteLine("  FEM3D: complex gear (" & geo.GearType & ", " & geo.NWheels & " wheels) — dispatching to ComputePccStressComplexExact")
                result = Fem3dWrapper.ComputePccStressComplexExact(request.layers, request.subgrade, acParms, geo, "FlexOnRigid", wantMesh, False, False)
            Else
                result = Fem3dWrapper.ComputePccStress(request.layers, request.subgrade, acParms, "FlexOnRigid", meshSizeIn, wantMesh, wantFull, wantFilter, False, False, geo)
            End If
        End SyncLock

        If geo IsNot Nothing Then
            result.geometrySource = geo.Source
            result.resolvedIcao = geo.ResolvedIcao
            result.faarfieldName = geo.FaarfieldName
        End If

        If result.success Then
            Dim meshInfo As String = ""
            If result.mesh IsNot Nothing Then
                meshInfo = ", mesh: " & result.mesh.surfaceTriCount & " tris / " & result.mesh.totalElementCount & " bricks (" & result.mesh.renderMode & ")"
            End If
            Console.WriteLine("  FEM3D: OK, PCC bottom stress=" & result.pccBottomStress.ToString("F2") & " psi in " & result.computeTimeMs & "ms" & meshInfo)
            SendJson(resp, 200, JsonHelper.Serialize(result))
        Else
            Console.WriteLine("  FEM3D: FAILED — " & result.errorMessage)
            SendJson(resp, 500, JsonHelper.Serialize(New Dto.ErrorResponse With {
                .error = "FEM3D computation failed",
                .detail = result.errorMessage
            }))
        End If
    End Sub

    ''' <summary>
    ''' Returns True if the gear type is complex (3D, 2D, 2D/2D2, 2S, 2T, etc.)
    ''' and should be routed to ComputePccStressComplexExact. Simple gears (S, D)
    ''' return False and stay on the native ComputePccStress path.
    ''' </summary>
    Private Function IsComplexGearType(geo As AircraftLibrary.AircraftGeometry,
                                         acParms As LEAFClassLib.clsLEAF.LEAFACParms) As Boolean
        Dim g As String = ""
        If geo IsNot Nothing AndAlso Not String.IsNullOrWhiteSpace(geo.GearType) Then
            g = geo.GearType.Trim().ToUpperInvariant()
        ElseIf Not String.IsNullOrWhiteSpace(acParms.libGear) Then
            g = acParms.libGear.Trim().ToUpperInvariant()
        End If
        If g = "" OrElse g = "S" OrElse g = "D" Then Return False
        Return True
    End Function

    ' ============================================================
    ' FEM3D mesh-only endpoint — Phase 1 of mesh visualization.
    ' Same workload as /api/fem3d/stress but forces includeMesh=true.
    ' Frontend uses this for the 3D mesh panel.
    ' ============================================================
    Private Sub HandleFem3dMesh(body As String, resp As HttpListenerResponse)
        If Not Fem3dAvailable Then
            SendJson(resp, 503, JsonHelper.Serialize(New Dto.ErrorResponse With {
                .error = "FEM3D solver unavailable",
                .detail = "AMClassLib + FAAMeshClassLib + FEMClassLib did not load"
            }))
            Return
        End If

        Dim request As Dto.LeafGridRequest = JsonHelper.Deserialize(Of Dto.LeafGridRequest)(body)

        Dim acParms As LEAFClassLib.clsLEAF.LEAFACParms
        Dim geo As AircraftLibrary.AircraftGeometry = Nothing
        If Not String.IsNullOrEmpty(request.aircraft.icao) Then
            geo = AircraftLibrary.ResolveGeometry(
                request.aircraft.icao, If(request.aircraft.gear, ""),
                If(request.aircraft.mtow > 0, request.aircraft.mtow, request.aircraft.gearLoad / 0.95),
                request.aircraft.tirePressure)
            If request.aircraft.gearLoad > 0 Then geo.GearLoad = request.aircraft.gearLoad
            If Not AircraftLibrary.IsFem3dGeometrySufficient(geo) Then
                Dim acLabel As String = If(request.aircraft.name, request.aircraft.icao)
                SendJson(resp, 422, JsonHelper.Serialize(New Dto.ErrorResponse With {
                    .error = "Insufficient FEM3D geometry",
                    .detail = AircraftLibrary.GetFem3dGeometryBlockReason(geo, acLabel)
                }))
                Return
            End If
            acParms = AircraftLibrary.BuildLeafParms(geo, If(request.aircraft.name, request.aircraft.icao))
        Else
            acParms = New LEAFClassLib.clsLEAF.LEAFACParms()
            acParms.ACname = If(request.aircraft.name, "Aircraft")
            acParms.GearLoad = request.aircraft.gearLoad
            acParms.NTires = request.aircraft.nTires
            acParms.libGear = If(request.aircraft.gear, If(request.aircraft.nTires = 2, "D", ""))
            acParms.LibGearOrientation = 0
            ReDim acParms.TirePress(request.aircraft.nTires)
            ReDim acParms.TireX(request.aircraft.nTires)
            ReDim acParms.TireY(request.aircraft.nTires)
            Dim halfSpacing As Double = request.aircraft.tireSpacingIn / 2.0
            For i As Integer = 1 To request.aircraft.nTires
                acParms.TirePress(i) = If(request.aircraft.tirePressure > 0, request.aircraft.tirePressure, 200.0)
                acParms.TireX(i) = If(i = 1, -halfSpacing, halfSpacing)
                acParms.TireY(i) = 0.0
            Next
        End If

        Dim meshSizeIn As Integer = request.gridPoints
        Dim wantFull As Boolean = request.highDetail
        Dim wantFilter As Boolean = request.filterCoarse
        Dim wantStress As Boolean = request.includeStressField
        Dim stressAggregation As String = If(request.stressAggregation, "mean")
        Console.WriteLine("  FEM3D mesh: " & acParms.ACname & ", highDetail=" & wantFull &
                          ", filterCoarse=" & wantFilter & ", stressField=" & wantStress &
                          ", aggregation=" & stressAggregation)
        Dim result As Fem3dWrapper.Fem3dResult
        Dim isComplexGear As Boolean = IsComplexGearType(geo, acParms)
        SyncLock analysisLock
            If isComplexGear AndAlso geo IsNot Nothing AndAlso geo.NWheels >= 3 Then
                Console.WriteLine("  FEM3D mesh: complex gear (" & geo.GearType & ", " & geo.NWheels & " wheels) — dispatching to ComputePccStressComplexExact")
                result = Fem3dWrapper.ComputePccStressComplexExact(request.layers, request.subgrade, acParms, geo, "FlexOnRigid", True, wantStress, False, stressAggregation)
            Else
                result = Fem3dWrapper.ComputePccStress(request.layers, request.subgrade, acParms, "FlexOnRigid",
                                                        meshSizeIn, True, wantFull, wantFilter, wantStress, False, geo, stressAggregation)
            End If
        End SyncLock

        If geo IsNot Nothing Then
            result.geometrySource = geo.Source
            result.resolvedIcao = geo.ResolvedIcao
            result.faarfieldName = geo.FaarfieldName
        End If

        If result.success Then
            If result.mesh IsNot Nothing Then
                Console.WriteLine("  FEM3D mesh OK: " & result.mesh.surfaceTriCount & " tris / " & result.mesh.totalElementCount & " bricks, " & result.mesh.nodeCount & " nodes in " & result.computeTimeMs & "ms")
            End If
            SendJson(resp, 200, JsonHelper.Serialize(result))
        Else
            Console.WriteLine("  FEM3D mesh FAILED: " & result.errorMessage)
            SendJson(resp, 500, JsonHelper.Serialize(New Dto.ErrorResponse With {
                .error = "FEM3D mesh computation failed",
                .detail = result.errorMessage
            }))
        End If
    End Sub

    ' ============================================================
    ' Helpers
    ' ============================================================
    Private Function ReadBody(req As HttpListenerRequest) As String
        Using reader As New StreamReader(req.InputStream, req.ContentEncoding)
            Return reader.ReadToEnd()
        End Using
    End Function

    Private Sub SendJson(resp As HttpListenerResponse, statusCode As Integer, json As String)
        resp.StatusCode = statusCode
        Dim buffer() As Byte = Encoding.UTF8.GetBytes(json)
        resp.ContentLength64 = buffer.Length
        resp.OutputStream.Write(buffer, 0, buffer.Length)
        resp.Close()
    End Sub

    ' ============================================================
    ' Gear-coordinate trace audit endpoint.
    ' POST /api/diag/gear-trace  (body: Dto.GearTraceRequest JSON)
    ' Captures wheel coords at every pipeline stage for ONE aircraft on ONE
    ' pavement structure.  Used by scripts/audit_gear_coordinate_trace.py
    ' to build the methodology Excel (specs/gear-coordinate-trace-audit.md).
    ' ============================================================
    Private Sub HandleGearTrace(body As String, resp As HttpListenerResponse)
        Dim request As Dto.GearTraceRequest
        Try
            request = JsonHelper.Deserialize(Of Dto.GearTraceRequest)(body)
        Catch ex As Exception
            SendJson(resp, 400, JsonHelper.Serialize(New Dto.ErrorResponse With {
                .error = "Invalid request body", .detail = ex.Message
            }))
            Return
        End Try

        If request Is Nothing OrElse String.IsNullOrWhiteSpace(request.icao) Then
            SendJson(resp, 400, JsonHelper.Serialize(New Dto.ErrorResponse With {
                .error = "Missing ICAO", .detail = "request.icao is required"
            }))
            Return
        End If

        Dim sw As New Diagnostics.Stopwatch()
        sw.Start()
        Dim result As Dto.GearTraceResponse
        SyncLock analysisLock
            result = GearTraceWrapper.TraceAircraft(request)
        End SyncLock
        sw.Stop()
        Console.WriteLine("  gear-trace: " & request.icao & " (" & request.gear & ") in " & sw.ElapsedMilliseconds & "ms")
        SendJson(resp, 200, JsonHelper.Serialize(result))
    End Sub

End Module
