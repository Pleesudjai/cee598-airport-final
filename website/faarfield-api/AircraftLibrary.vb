Imports System.IO
Imports System.Text.RegularExpressions
Imports System.Web.Script.Serialization

''' <summary>
''' Loads the combined aircraft library JSON (built from FAARFIELD XML + FAA ACD)
''' and provides lookup by ICAO code for tire geometry, MTOW, gear config.
'''
''' v2: stores ALL records per ICAO, resolves best match by gear+MTOW+geometry,
'''     gear-type fallback templates replace universal dual-wheel.
''' </summary>
Public Module AircraftLibrary

    ' All records keyed by ICAO (multiple records possible per ICAO)
    Private _byIcao As New Dictionary(Of String, List(Of Dictionary(Of String, Object)))(StringComparer.OrdinalIgnoreCase)
    Private _allAircraft As New List(Of Dictionary(Of String, Object))

    ' Manual proxy overrides for aircraft where the automatic nearest-MTOW + family
    ' scoring picks a geometrically poor donor (e.g. auto-picking a single-piston
    ' Saratoga for a twin-jet Phenom). Keyed on target ICAO (case-insensitive);
    ' value is the preferred donor ICAO, which must have exact XML geometry.
    ' Source label when an override fires: "proxy_override".
    Private ReadOnly _proxyOverrides As New Dictionary(Of String, String)(StringComparer.OrdinalIgnoreCase) From {
        {"E55P", "C650"},
        {"E50P", "BE40"},
        {"GALX", "C650"},
        {"G280", "CL60"}
    }

    Public ReadOnly Property TotalCount As Integer
        Get
            Return _allAircraft.Count
        End Get
    End Property

    Public ReadOnly Property CountWithGeometry As Integer
        Get
            Dim n As Integer = 0
            For Each a As Dictionary(Of String, Object) In _allAircraft
                If CBool(GetVal(a, "has_tire_geometry", False)) Then n += 1
            Next
            Return n
        End Get
    End Property

    Public Sub LoadLibrary(path As String)
        If Not File.Exists(path) Then
            Console.WriteLine("  Aircraft library not found: " & path)
            Return
        End If

        Dim json As String = File.ReadAllText(path)
        Dim serializer As New JavaScriptSerializer() With {.MaxJsonLength = Integer.MaxValue}
        Dim rawList = serializer.Deserialize(Of Object())(json)

        _byIcao.Clear()
        _allAircraft.Clear()

        For Each item As Object In rawList
            Dim dict As Dictionary(Of String, Object) = DirectCast(item, Dictionary(Of String, Object))
            _allAircraft.Add(dict)
            Dim icao = GetStr(dict, "icao")
            If Not String.IsNullOrEmpty(icao) Then
                If Not _byIcao.ContainsKey(icao) Then
                    _byIcao(icao) = New List(Of Dictionary(Of String, Object))
                End If
                _byIcao(icao).Add(dict)
            End If
        Next
    End Sub

    ''' <summary>
    ''' Get raw first record by ICAO (backwards compatibility for simple lookups).
    ''' </summary>
    Public Function GetByIcao(icao As String) As Dictionary(Of String, Object)
        Dim records As List(Of Dictionary(Of String, Object)) = Nothing
        If _byIcao.TryGetValue(icao, records) AndAlso records.Count > 0 Then
            Return records(0)
        End If
        Return Nothing
    End Function

    ''' <summary>
    ''' Resolve the best library record for a given ICAO + gear + MTOW.
    ''' Ranking: exact gear match -> closest MTOW -> has XML geometry -> first record.
    ''' Returns Nothing if ICAO not in library.
    ''' </summary>
    Public Function Resolve(icao As String, gearHint As String, mtowHint As Double) As Dictionary(Of String, Object)
        Dim records As List(Of Dictionary(Of String, Object)) = Nothing
        If Not _byIcao.TryGetValue(icao, records) OrElse records.Count = 0 Then
            Return Nothing
        End If

        If records.Count = 1 Then Return records(0)

        ' Score each candidate
        Dim bestScore As Integer = -1
        Dim bestMtowDist As Double = Double.MaxValue
        Dim bestRec As Dictionary(Of String, Object) = records(0)

        For Each rec As Dictionary(Of String, Object) In records
            Dim score As Integer = 0
            Dim recGear As String = GetStr(rec, "gear")
            Dim recMtow As Double = CDbl(GetVal(rec, "mtow", 0.0))
            Dim hasGeo As Boolean = CBool(GetVal(rec, "has_tire_geometry", False))

            ' +4 for exact gear match
            If Not String.IsNullOrEmpty(gearHint) AndAlso Not String.IsNullOrEmpty(recGear) Then
                If recGear.Equals(gearHint, StringComparison.OrdinalIgnoreCase) Then score += 4
            End If

            ' +2 for having XML geometry
            If hasGeo Then score += 2

            ' +1 for having MTOW data
            If recMtow > 0 Then score += 1

            Dim mtowDist As Double = If(recMtow > 0 AndAlso mtowHint > 0, Math.Abs(recMtow - mtowHint), Double.MaxValue)

            If score > bestScore OrElse (score = bestScore AndAlso mtowDist < bestMtowDist) Then
                bestScore = score
                bestMtowDist = mtowDist
                bestRec = rec
            End If
        Next

        Return bestRec
    End Function

    Public Function GetSummaryList() As Object()
        Dim summaries As New List(Of Object)
        For Each ac As Dictionary(Of String, Object) In _allAircraft
            Dim icao As String = GetStr(ac, "icao")
            If String.IsNullOrEmpty(icao) Then Continue For
            summaries.Add(New Dictionary(Of String, Object) From {
                {"icao", icao},
                {"manufacturer", GetStr(ac, "manufacturer")},
                {"model", GetStr(ac, "model")},
                {"mtow", GetVal(ac, "mtow", Nothing)},
                {"gear", GetStr(ac, "gear")},
                {"has_tire_geometry", GetVal(ac, "has_tire_geometry", False)}
            })
        Next
        Return summaries.ToArray()
    End Function

    ' ================================================================
    ' SHARED GEOMETRY RESOLUTION — used by both LeafSolverWrapper and
    ' FullAnalysisWrapper to get consistent wheel coords.
    ' ================================================================

    ''' <summary>
    ''' Resolved aircraft geometry, returned by ResolveGeometry().
    ''' </summary>
    Public Class AircraftGeometry
        Public WheelX() As Double        ' 0-based wheel X coords (inches)
        Public WheelY() As Double        ' 0-based wheel Y coords (inches)
        Public NWheels As Integer
        Public TirePressure As Double    ' psi
        Public TireWidth As Double       ' inches
        Public TrackWidth As Double      ' inches (TireWidth * 1.6)
        Public GearSpacing As Double     ' tire_track_in from XML
        Public GearLoad As Double        ' lbs (MTOW * mgPct)
        Public Source As String          ' "xml", "icao_proxy", "family_proxy", "nearest_proxy", "gear_template", "dual_fallback"
        Public FaarfieldName As String   ' library faarfield_name if matched
        Public ResolvedIcao As String    ' ICAO of the record that supplied the wheel layout
        Public GearType As String        ' S, D, 2D, 2T, 3D, etc. — initialised from the REQUEST's gear (Excel/UI value)
        Public LibraryGearType As String ' UNCONDITIONAL library gear classification (e.g. C-17 = "2T", regardless of the request's gear).  Use this in UI to expose Excel-vs-library mismatches.
    End Class

    ''' <summary>
    ''' Full geometry resolution pipeline:
    '''   1. Try library XML wheel_coords (exact FAARFIELD geometry)
    '''   2. Try a nearby real-aircraft proxy from the library (same ICAO/family/gear)
    '''   3. Fall back to gear-type template (S, D, 2D, 2T, 3D, 2D/2D2, 5D)
    '''   4. Last resort: generic dual-wheel (-17, +17)
    ''' </summary>
    Public Function ResolveGeometry(icao As String, gear As String, mtow As Double, tirePressureOverride As Double) As AircraftGeometry
        Dim geo As New AircraftGeometry()
        Dim mgPct As Double = 0.95
        geo.GearLoad = mtow * mgPct
        geo.GearType = NormalizeGearType(If(gear, ""))

        ' Step 1: Try library
        Dim libAc = Resolve(icao, gear, mtow)
        Dim targetManufacturer As String = ""
        Dim targetFamily As String = ""
        If libAc IsNot Nothing Then
            geo.FaarfieldName = GetStr(libAc, "faarfield_name")
            geo.ResolvedIcao = GetStr(libAc, "icao")
            targetManufacturer = NormalizeText(GetStr(libAc, "manufacturer"))
            targetFamily = GetFamilyKey(libAc)
            ' LibraryGearType: UNCONDITIONAL — captures library's authoritative
            ' gear classification (e.g. C-17 = "2T") regardless of any request-supplied
            ' value, so the UI can flag Excel-vs-library mismatches.
            geo.LibraryGearType = NormalizeGearType(GetStr(libAc, "gear"))
            If String.IsNullOrWhiteSpace(geo.GearType) Then
                geo.GearType = NormalizeGearType(GetStr(libAc, "gear"))
            End If
            Dim libTp As Double = CDbl(GetVal(libAc, "tire_pressure_psi", 0.0))
            Dim libMgPct As Double = CDbl(GetVal(libAc, "mg_pct", 0.0))
            If libMgPct > 0 Then mgPct = libMgPct : geo.GearLoad = mtow * mgPct
            If libTp > 0 AndAlso tirePressureOverride <= 0 Then tirePressureOverride = libTp

            If PopulateGeometryFromRecord(libAc, geo, tirePressureOverride, "xml") Then
                Return geo
            End If
        End If

        ' Step 1.5: Manual override — if this ICAO has a curated donor, use it.
        ' Covers the 4 cases the automatic scorer picks poorly (Phenoms, Galaxy, G280).
        If Not String.IsNullOrWhiteSpace(icao) AndAlso _proxyOverrides.ContainsKey(icao) Then
            Dim overrideIcao As String = _proxyOverrides(icao)
            Dim overrideAc = Resolve(overrideIcao, "", 0)
            If overrideAc IsNot Nothing Then
                If String.IsNullOrWhiteSpace(geo.LibraryGearType) Then
                    geo.LibraryGearType = NormalizeGearType(GetStr(overrideAc, "gear"))
                End If
                If String.IsNullOrWhiteSpace(geo.GearType) Then
                    geo.GearType = NormalizeGearType(GetStr(overrideAc, "gear"))
                End If
                If PopulateGeometryFromRecord(overrideAc, geo, tirePressureOverride, "proxy_override") Then
                    Return geo
                End If
            End If
        End If

        ' Step 2: Borrow geometry from the closest real aircraft in the library.
        Dim proxyAc = FindProxyGeometryRecord(icao, geo.GearType, mtow, targetManufacturer, targetFamily)
        If proxyAc IsNot Nothing Then
            If String.IsNullOrWhiteSpace(geo.LibraryGearType) Then
                geo.LibraryGearType = NormalizeGearType(GetStr(proxyAc, "gear"))
            End If
            If String.IsNullOrWhiteSpace(geo.GearType) Then
                geo.GearType = NormalizeGearType(GetStr(proxyAc, "gear"))
            End If
            Dim proxySource As String = ClassifyProxySource(icao, targetManufacturer, targetFamily, proxyAc)
            If PopulateGeometryFromRecord(proxyAc, geo, tirePressureOverride, proxySource) Then
                Return geo
            End If
        End If

        ' Step 3: Gear-type template
        geo.TirePressure = If(tirePressureOverride > 0, tirePressureOverride, 200.0)
        geo.GearSpacing = 0
        ApplyGearTemplate(geo)

        Return geo
    End Function

    ''' <summary>
    ''' Apply gear-type based wheel layout templates.
    ''' Spacings based on typical aircraft in each category (FAA AC 150/5320-6).
    ''' </summary>
    Private Sub ApplyGearTemplate(geo As AircraftGeometry)
        Dim g As String = If(geo.GearType, "S").ToUpper().Trim()
        Select Case g
            Case "D1", "D2", "Q2"
                g = "D"
            Case "2S"
                g = "2D"
            Case "2D/D1"
                g = "2T"
            Case "2D/2D1"
                g = "2D/2D2"
            Case "2D/3D2"
                g = "5D"
        End Select

        Select Case g
            Case "S"
                ' Single wheel
                geo.NWheels = 1
                ReDim geo.WheelX(0) : ReDim geo.WheelY(0)
                geo.WheelX(0) = 0 : geo.WheelY(0) = 0
                geo.Source = "gear_template"

            Case "D"
                ' Dual wheel — typical spacing ~34" (17" each side)
                geo.NWheels = 2
                ReDim geo.WheelX(1) : ReDim geo.WheelY(1)
                geo.WheelX(0) = -17.0 : geo.WheelX(1) = 17.0
                geo.WheelY(0) = 0 : geo.WheelY(1) = 0
                geo.Source = "gear_template"

            Case "2D"
                ' Dual tandem — 2 wheels across, 2 along (4 total)
                ' Typical: X spacing ~22", Y spacing ~55" (B757-like)
                geo.NWheels = 4
                ReDim geo.WheelX(3) : ReDim geo.WheelY(3)
                geo.WheelX(0) = -22.0 : geo.WheelY(0) = -27.5
                geo.WheelX(1) = 22.0 : geo.WheelY(1) = -27.5
                geo.WheelX(2) = -22.0 : geo.WheelY(2) = 27.5
                geo.WheelX(3) = 22.0 : geo.WheelY(3) = 27.5
                geo.Source = "gear_template"

            Case "2T"
                ' Dual tridem — 2 wheels across, 3 along (6 total)
                ' Typical: X spacing ~26", Y spacing ~58" (DC-10-like)
                geo.NWheels = 6
                ReDim geo.WheelX(5) : ReDim geo.WheelY(5)
                For row As Integer = 0 To 2
                    Dim yOff As Double = (row - 1) * 58.0
                    geo.WheelX(row * 2) = -26.0 : geo.WheelY(row * 2) = yOff
                    geo.WheelX(row * 2 + 1) = 26.0 : geo.WheelY(row * 2 + 1) = yOff
                Next
                geo.Source = "gear_template"

            Case "3D"
                ' Triple dual — 3 wheels across, 2 along (6 total)
                ' Typical: X spacing ~26", Y spacing ~55" (B777-like)
                geo.NWheels = 6
                ReDim geo.WheelX(5) : ReDim geo.WheelY(5)
                For row As Integer = 0 To 1
                    Dim yOff As Double = (row * 2 - 1) * 27.5
                    geo.WheelX(row * 3) = -26.0 : geo.WheelY(row * 3) = yOff
                    geo.WheelX(row * 3 + 1) = 0.0 : geo.WheelY(row * 3 + 1) = yOff
                    geo.WheelX(row * 3 + 2) = 26.0 : geo.WheelY(row * 3 + 2) = yOff
                Next
                geo.Source = "gear_template"

            Case "2D/2D2"
                ' Twin body dual tandem — 4 wheels per gear, 2 gears
                ' Same as 2D but with wider track (A380-like body gear)
                geo.NWheels = 4
                ReDim geo.WheelX(3) : ReDim geo.WheelY(3)
                geo.WheelX(0) = -22.0 : geo.WheelY(0) = -27.5
                geo.WheelX(1) = 22.0 : geo.WheelY(1) = -27.5
                geo.WheelX(2) = -22.0 : geo.WheelY(2) = 27.5
                geo.WheelX(3) = 22.0 : geo.WheelY(3) = 27.5
                geo.Source = "gear_template"

            Case "5D"
                ' Five dual (A380-like) — 2 wheels across, 5 along (10 total)
                geo.NWheels = 10
                ReDim geo.WheelX(9) : ReDim geo.WheelY(9)
                For row As Integer = 0 To 4
                    Dim yOff As Double = (row - 2) * 55.0
                    geo.WheelX(row * 2) = -26.0 : geo.WheelY(row * 2) = yOff
                    geo.WheelX(row * 2 + 1) = 26.0 : geo.WheelY(row * 2 + 1) = yOff
                Next
                geo.Source = "gear_template"

            Case Else
                ' Unknown gear type — default to dual wheel
                geo.NWheels = 2
                ReDim geo.WheelX(1) : ReDim geo.WheelY(1)
                geo.WheelX(0) = -17.0 : geo.WheelX(1) = 17.0
                geo.WheelY(0) = 0 : geo.WheelY(1) = 0
                geo.Source = "dual_fallback"
        End Select

        ComputeTireWidthsFromLoad(geo)
    End Sub

    Private Function PopulateGeometryFromRecord(rec As Dictionary(Of String, Object),
                                                ByRef geo As AircraftGeometry,
                                                ByRef tirePressureOverride As Double,
                                                source As String) As Boolean
        If rec Is Nothing OrElse Not CBool(GetVal(rec, "has_tire_geometry", False)) Then
            Return False
        End If

        Dim coords = TryCast(GetVal(rec, "wheel_coords", Nothing), Object())
        If coords Is Nothing OrElse coords.Length = 0 Then
            Return False
        End If

        geo.ResolvedIcao = GetStr(rec, "icao")
        Dim ffName As String = GetStr(rec, "faarfield_name")
        If Not String.IsNullOrWhiteSpace(ffName) Then
            geo.FaarfieldName = ffName
        End If
        If String.IsNullOrWhiteSpace(geo.GearType) Then
            geo.GearType = NormalizeGearType(GetStr(rec, "gear"))
        End If

        geo.NWheels = coords.Length
        ReDim geo.WheelX(coords.Length - 1)
        ReDim geo.WheelY(coords.Length - 1)
        For j As Integer = 0 To coords.Length - 1
            Dim pt = DirectCast(coords(j), Dictionary(Of String, Object))
            geo.WheelX(j) = CDbl(pt("x"))
            geo.WheelY(j) = CDbl(pt("y"))
        Next

        Dim libTp As Double = CDbl(GetVal(rec, "tire_pressure_psi", 0.0))
        If tirePressureOverride <= 0 AndAlso libTp > 0 Then
            tirePressureOverride = libTp
        End If
        geo.TirePressure = If(tirePressureOverride > 0, tirePressureOverride, 200.0)
        geo.GearSpacing = CDbl(GetVal(rec, "tire_track_in", 0.0))

        Dim xmlTW As Double = CDbl(GetVal(rec, "tire_width_in", 0.0))
        If xmlTW > 0 Then
            geo.TireWidth = xmlTW
            geo.TrackWidth = xmlTW * 1.6
        Else
            ComputeTireWidthsFromLoad(geo)
        End If
        geo.Source = source
        Return True
    End Function

    Private Function FindProxyGeometryRecord(targetIcao As String,
                                             targetGear As String,
                                             targetMtow As Double,
                                             targetManufacturer As String,
                                             targetFamily As String) As Dictionary(Of String, Object)
        Dim bestTier As Integer = -1
        Dim bestScore As Integer = Integer.MinValue
        Dim bestMtowDist As Double = Double.MaxValue
        Dim bestRec As Dictionary(Of String, Object) = Nothing

        Dim gearNorm As String = NormalizeGearType(targetGear)
        Dim gearGroup As String = GetGearGroup(gearNorm)
        Dim wantedManufacturer As String = NormalizeText(targetManufacturer)
        Dim wantedFamily As String = NormalizeText(targetFamily)

        For Each rec As Dictionary(Of String, Object) In _allAircraft
            If rec Is Nothing OrElse Not CBool(GetVal(rec, "has_tire_geometry", False)) Then Continue For

            Dim donorIcao As String = GetStr(rec, "icao")
            If donorIcao.StartsWith("FF_", StringComparison.OrdinalIgnoreCase) Then Continue For

            Dim donorGear As String = NormalizeGearType(GetStr(rec, "gear"))
            Dim donorGearGroup As String = GetGearGroup(donorGear)
            Dim donorManufacturer As String = NormalizeText(GetStr(rec, "manufacturer"))
            Dim donorFamily As String = GetFamilyKey(rec)

            Dim sameIcao As Boolean = Not String.IsNullOrWhiteSpace(targetIcao) AndAlso
                donorIcao.Equals(targetIcao, StringComparison.OrdinalIgnoreCase)
            Dim sameManufacturer As Boolean = Not String.IsNullOrWhiteSpace(wantedManufacturer) AndAlso donorManufacturer = wantedManufacturer
            Dim sameFamily As Boolean = Not String.IsNullOrWhiteSpace(wantedFamily) AndAlso donorFamily = wantedFamily
            Dim exactGear As Boolean = Not String.IsNullOrWhiteSpace(gearNorm) AndAlso donorGear = gearNorm

            Dim compatibleGear As Boolean = False
            If String.IsNullOrWhiteSpace(gearNorm) Then
                compatibleGear = True
            ElseIf exactGear Then
                compatibleGear = True
            ElseIf Not String.IsNullOrWhiteSpace(gearGroup) AndAlso gearGroup = donorGearGroup Then
                compatibleGear = True
            End If

            Dim tier As Integer = -1
            If sameIcao AndAlso compatibleGear Then
                tier = 6
            ElseIf exactGear AndAlso sameManufacturer AndAlso sameFamily Then
                tier = 5
            ElseIf exactGear AndAlso sameManufacturer Then
                tier = 4
            ElseIf exactGear Then
                tier = 3
            ElseIf compatibleGear AndAlso sameManufacturer AndAlso sameFamily Then
                tier = 2
            ElseIf compatibleGear Then
                tier = 1
            ElseIf String.IsNullOrWhiteSpace(gearNorm) AndAlso sameManufacturer AndAlso sameFamily Then
                tier = 0
            Else
                Continue For
            End If

            Dim score As Integer = 0
            If sameIcao Then score += 30
            If exactGear Then
                score += 20
            ElseIf compatibleGear Then
                score += 10
            End If
            If sameManufacturer Then score += 8
            If sameFamily Then score += 5

            Dim donorMtow As Double = CDbl(GetVal(rec, "mtow", 0.0))
            Dim mtowDist As Double
            If targetMtow > 0 AndAlso donorMtow > 0 Then
                mtowDist = Math.Abs(targetMtow - donorMtow)
            ElseIf donorMtow > 0 Then
                ' Target MTOW unknown — prefer the smallest donor. A small-aircraft
                ' wheel layout applied to an unknown target produces conservative
                ' stresses (over-reports), whereas a large-aircraft layout produces
                ' misleading low stresses with wildly wrong tire spacing. Without
                ' this, every donor ties at Double.MaxValue and iteration order
                ' decides — in practice that makes F18S the universal proxy.
                mtowDist = donorMtow
            Else
                mtowDist = Double.MaxValue
            End If

            If tier > bestTier OrElse
               (tier = bestTier AndAlso score > bestScore) OrElse
               (tier = bestTier AndAlso score = bestScore AndAlso mtowDist < bestMtowDist) Then
                bestTier = tier
                bestScore = score
                bestMtowDist = mtowDist
                bestRec = rec
            End If
        Next

        Return bestRec
    End Function

    Private Function ClassifyProxySource(targetIcao As String,
                                         targetManufacturer As String,
                                         targetFamily As String,
                                         proxyRec As Dictionary(Of String, Object)) As String
        If proxyRec Is Nothing Then Return "nearest_proxy"

        Dim donorIcao As String = GetStr(proxyRec, "icao")
        If Not String.IsNullOrWhiteSpace(targetIcao) AndAlso donorIcao.Equals(targetIcao, StringComparison.OrdinalIgnoreCase) Then
            Return "icao_proxy"
        End If

        Dim donorManufacturer As String = NormalizeText(GetStr(proxyRec, "manufacturer"))
        Dim donorFamily As String = GetFamilyKey(proxyRec)
        If Not String.IsNullOrWhiteSpace(targetManufacturer) AndAlso
           Not String.IsNullOrWhiteSpace(targetFamily) AndAlso
           donorManufacturer = NormalizeText(targetManufacturer) AndAlso
           donorFamily = NormalizeText(targetFamily) Then
            Return "family_proxy"
        End If

        Return "nearest_proxy"
    End Function

    Private Sub ComputeTireWidthsFromLoad(geo As AircraftGeometry)
        If geo.NWheels <= 0 OrElse geo.TirePressure <= 0 Then
            geo.TireWidth = 12.0 : geo.TrackWidth = 19.2 : Return
        End If
        Dim contactArea As Double = geo.GearLoad / geo.NWheels / geo.TirePressure
        geo.TireWidth = 2.0 * Math.Sqrt(contactArea / (1.6 * 3.14159265359))
        geo.TrackWidth = geo.TireWidth * 1.6
    End Sub

    ''' <summary>
    ''' Build LEAFACParms from a resolved AircraftGeometry.
    ''' Used by both LeafSolverWrapper (stress endpoints) and FullAnalysisWrapper (CDF).
    ''' </summary>
    Public Function BuildLeafParms(geo As AircraftGeometry, acName As String) As LEAFClassLib.clsLEAF.LEAFACParms
        Dim parms As New LEAFClassLib.clsLEAF.LEAFACParms()
        parms.ACname = If(acName, "Aircraft")
        parms.GearLoad = geo.GearLoad
        parms.libGear = If(geo.GearType, "")
        parms.LibGearOrientation = 0
        parms.NTires = geo.NWheels

        ReDim parms.TirePress(geo.NWheels)
        ReDim parms.TireX(geo.NWheels)
        ReDim parms.TireY(geo.NWheels)

        For i As Integer = 0 To geo.NWheels - 1
            parms.TirePress(i + 1) = geo.TirePressure
            parms.TireX(i + 1) = geo.WheelX(i)
            parms.TireY(i + 1) = geo.WheelY(i)
        Next

        Return parms
    End Function

    ''' <summary>
    ''' Legacy: Build LEAFACParms from ICAO code only (for backwards compat with stress endpoints).
    ''' Now delegates to ResolveGeometry + BuildLeafParms.
    ''' </summary>
    Public Function BuildLeafAircraftParms(icao As String, gearLoad As Double, evalPoints() As LEAFClassLib.clsLEAF.LEAFACParms) As LEAFClassLib.clsLEAF.LEAFACParms
        ' Estimate MTOW from gearLoad (gearLoad = MTOW * 0.95)
        Dim estimatedMtow As Double = gearLoad / 0.95
        Dim geo = ResolveGeometry(icao, "", estimatedMtow, 0)
        geo.GearLoad = gearLoad  ' Use caller's gear load directly
        Return BuildLeafParms(geo, icao)
    End Function

    ''' <summary>
    ''' 3D FEM is only allowed when geometry is better than the generic
    ''' dual-wheel default. Exact XML, proxy, and gear-template layouts are OK;
    ''' dual_fallback is not.
    ''' </summary>
    Public Function IsFem3dGeometrySufficient(geo As AircraftGeometry) As Boolean
        If geo Is Nothing Then Return False
        Return Not String.Equals(geo.Source, "dual_fallback", StringComparison.OrdinalIgnoreCase)
    End Function

    Public Function GetFem3dGeometryBlockReason(geo As AircraftGeometry, aircraftLabel As String) As String
        Dim label As String = If(String.IsNullOrWhiteSpace(aircraftLabel), "Aircraft", aircraftLabel)
        If geo Is Nothing Then
            Return label & ": FEM3D blocked because landing-gear geometry could not be resolved"
        End If

        If String.Equals(geo.Source, "dual_fallback", StringComparison.OrdinalIgnoreCase) Then
            Return label & ": FEM3D blocked because only generic dual-wheel fallback geometry is available"
        End If

        Return label & ": FEM3D geometry is sufficient"
    End Function

    ' ---- helpers ----
    Private Function GetStr(dict As Dictionary(Of String, Object), key As String) As String
        Dim val As Object = Nothing
        If dict.TryGetValue(key, val) AndAlso val IsNot Nothing Then
            Return val.ToString()
        End If
        Return ""
    End Function

    Private Function GetVal(dict As Dictionary(Of String, Object), key As String, defaultVal As Object) As Object
        Dim val As Object = Nothing
        If dict.TryGetValue(key, val) AndAlso val IsNot Nothing Then
            Return val
        End If
        Return defaultVal
    End Function

    Private Function NormalizeGearType(gear As String) As String
        Return NormalizeText(gear)
    End Function

    Private Function GetGearGroup(gear As String) As String
        Dim g As String = NormalizeGearType(gear)
        Select Case g
            Case "S", "S1", "S2"
                Return "SINGLE"
            Case "D", "D1", "D2", "Q2"
                Return "DUAL"
            Case "2D", "2S"
                Return "TANDEM"
            Case "2T", "2D/D1"
                Return "TRIDEM"
            Case "3D"
                Return "TRIPLE_DUAL"
            Case "2D/2D1", "2D/2D2"
                Return "BODY_DUAL_TANDEM"
            Case "2D/3D2", "5D"
                Return "HEAVY_MULTI_TRUCK"
            Case Else
                Return g
        End Select
    End Function

    Private Function GetFamilyKey(rec As Dictionary(Of String, Object)) As String
        If rec Is Nothing Then Return ""

        Dim candidates() As String = {
            GetStr(rec, "model"),
            GetStr(rec, "faarfield_name"),
            GetStr(rec, "icao")
        }

        For Each raw As String In candidates
            If String.IsNullOrWhiteSpace(raw) Then Continue For
            Dim upper As String = raw.ToUpperInvariant()
            Dim m As Match = Regex.Match(upper, "([A-Z]{0,3}\d{2,4}[A-Z]?)")
            If m.Success Then
                Return NormalizeText(m.Groups(1).Value)
            End If

            Dim fallback As String = Regex.Replace(upper, "[^A-Z0-9]", "")
            If fallback.Length > 0 Then
                Return If(fallback.Length <= 4, fallback, fallback.Substring(0, 4))
            End If
        Next

        Return ""
    End Function

    Private Function NormalizeText(value As String) As String
        If String.IsNullOrWhiteSpace(value) Then Return ""
        Return value.Trim().ToUpperInvariant()
    End Function

End Module
