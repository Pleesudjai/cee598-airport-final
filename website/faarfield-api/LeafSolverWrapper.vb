Imports LEAFClassLib

Public Module LeafSolverWrapper

    Private leafSolver As New clsLEAF()

    ''' <summary>
    ''' Build LEAFStrParms from request layers + subgrade.
    ''' All arrays are 1-based (VB.NET convention used by LEAF).
    ''' </summary>
    Private Function BuildStructure(layers() As Dto.LayerInput, subgrade As Dto.SubgradeInput, evalDepthIn As Double) As clsLEAF.LEAFStrParms
        ' Total layers = pavement layers + subgrade
        Dim nLay As Integer = layers.Length + 1
        Dim str As New clsLEAF.LEAFStrParms()
        str.NLayers = nLay

        ReDim str.Thick(nLay)
        ReDim str.Modulus(nLay)
        ReDim str.Poisson(nLay)
        ReDim str.InterfaceParm(nLay)

        ' Pavement layers (1-based)
        For i As Integer = 0 To layers.Length - 1
            str.Thick(i + 1) = layers(i).h
            str.Modulus(i + 1) = layers(i).E
            str.Poisson(i + 1) = layers(i).nu
        Next

        ' Subgrade as last layer (semi-infinite)
        str.Thick(nLay) = 999.0
        str.Modulus(nLay) = subgrade.E
        str.Poisson(nLay) = subgrade.nu

        ' Interface parameters for FlexOnRigid:
        ' InterfaceParm(1) = 1.0 (bonded AC-PCC)
        ' InterfaceParm(2) = 0.0 (unbonded PCC-base/subgrade)
        ' InterfaceParm(3+) = 1.0 (bonded below)
        For i As Integer = 1 To nLay
            If i = 1 Then
                str.InterfaceParm(i) = 1.0  ' Bonded AC to PCC
            ElseIf i = 2 Then
                str.InterfaceParm(i) = 0.0  ' Unbonded PCC to base/subgrade
            Else
                str.InterfaceParm(i) = 1.0  ' Bonded
            End If
        Next

        ' Evaluation depth and layer
        str.EvalDepth = evalDepthIn

        ' Determine which layer contains the eval depth
        Dim cumDepth As Double = 0.0
        str.EvalLayer = nLay  ' default to subgrade
        For i As Integer = 1 To layers.Length
            cumDepth += layers(i - 1).h
            If evalDepthIn <= cumDepth Then
                str.EvalLayer = i
                Exit For
            End If
        Next

        Return str
    End Function

    ''' <summary>
    ''' Build LEAFACParms from AircraftInput.
    ''' v2: If ICAO is provided, uses AircraftLibrary.ResolveGeometry for exact wheel coords.
    '''     Falls back to nTires/tireSpacingIn for raw requests (backwards compat).
    ''' </summary>
    Private Function BuildAircraftParms(ac As Dto.AircraftInput) As clsLEAF.LEAFACParms
        ' Try library resolution first (when ICAO is available)
        If Not String.IsNullOrEmpty(ac.icao) Then
            Dim geo = AircraftLibrary.ResolveGeometry(
                ac.icao, If(ac.gear, ""), If(ac.mtow > 0, ac.mtow, ac.gearLoad / 0.95), ac.tirePressure)
            ' Override gear load if caller specified it directly
            If ac.gearLoad > 0 Then geo.GearLoad = ac.gearLoad
            Return AircraftLibrary.BuildLeafParms(geo, If(ac.name, ac.icao))
        End If

        ' Legacy path: build from nTires + tireSpacingIn
        Dim parms As New clsLEAF.LEAFACParms()
        parms.ACname = If(ac.name, "Aircraft")
        parms.GearLoad = ac.gearLoad
        parms.NTires = ac.nTires
        parms.libGear = ""
        parms.LibGearOrientation = 0

        ReDim parms.TirePress(ac.nTires)
        ReDim parms.TireX(ac.nTires)
        ReDim parms.TireY(ac.nTires)

        Dim halfSpacing As Double = ac.tireSpacingIn / 2.0
        For i As Integer = 1 To ac.nTires
            parms.TirePress(i) = ac.tirePressure
            If ac.nTires = 1 Then
                parms.TireX(i) = 0.0
                parms.TireY(i) = 0.0
            ElseIf ac.nTires = 2 Then
                parms.TireX(i) = If(i = 1, -halfSpacing, halfSpacing)
                parms.TireY(i) = 0.0
            Else
                Dim frac As Double = (i - 1) / Math.Max(ac.nTires - 1, 1)
                parms.TireX(i) = -halfSpacing + frac * ac.tireSpacingIn
                parms.TireY(i) = 0.0
            End If
        Next

        Return parms
    End Function

    ''' <summary>
    ''' Compute a 2D stress field grid using the LEAF solver.
    ''' </summary>
    Public Function ComputeGrid(req As Dto.LeafGridRequest) As Dto.LeafGridResponse
        Dim str As clsLEAF.LEAFStrParms = BuildStructure(req.layers, req.subgrade, req.evalDepthIn)
        Dim acParms As clsLEAF.LEAFACParms = BuildAircraftParms(req.aircraft)

        ' Add evaluation grid
        Dim n As Integer = req.gridPoints
        Dim totalPts As Integer = n * n
        acParms.NEvalPoints = totalPts
        ReDim acParms.EvalX(totalPts)
        ReDim acParms.EvalY(totalPts)

        Dim step_size As Double = If(n > 1, 2.0 * req.gridExtentIn / (n - 1), 0.0)
        Dim idx As Integer = 1
        For iy As Integer = 0 To n - 1
            For ix As Integer = 0 To n - 1
                acParms.EvalX(idx) = -req.gridExtentIn + ix * step_size
                acParms.EvalY(idx) = -req.gridExtentIn + iy * step_size
                idx += 1
            Next
        Next

        Dim nAC As Integer = 1
        Dim aircraft(1) As clsLEAF.LEAFACParms  ' 1-based
        aircraft(1) = acParms

        Dim responseType As clsLEAF.LEAFoptions = clsLEAF.LEAFoptions.AllResponses
        Dim response(1, totalPts) As Double
        Dim allResps(1, totalPts) As clsLEAF.LEAFAllResponses

        ' Call the real FAARFIELD LEAF solver
        leafSolver.ComputeResponse(responseType, nAC, aircraft, str, response, allResps)

        ' Build response: reshape 1D results into 2D grid
        Dim xCoords(n - 1) As Double
        Dim yCoords(n - 1) As Double

        For i As Integer = 0 To n - 1
            xCoords(i) = -req.gridExtentIn + i * step_size
            yCoords(i) = -req.gridExtentIn + i * step_size
        Next

        ' Allocate jagged arrays for JSON serialization
        Dim sX(n - 1)() As Double
        Dim sY(n - 1)() As Double
        Dim sZ(n - 1)() As Double
        Dim eZ(n - 1)() As Double
        Dim dZ(n - 1)() As Double
        Dim sMs(n - 1)() As Double

        For iy As Integer = 0 To n - 1
            ReDim sX(iy)(n - 1)
            ReDim sY(iy)(n - 1)
            ReDim sZ(iy)(n - 1)
            ReDim eZ(iy)(n - 1)
            ReDim dZ(iy)(n - 1)
            ReDim sMs(iy)(n - 1)

            For ix As Integer = 0 To n - 1
                Dim ridx As Integer = iy * n + ix + 1  ' 1-based index into LEAF results
                Dim r As clsLEAF.LEAFAllResponses = allResps(1, ridx)
                sX(iy)(ix) = r.StressX
                sY(iy)(ix) = r.StressY
                sZ(iy)(ix) = r.StressZ
                eZ(iy)(ix) = r.StrainZ
                dZ(iy)(ix) = r.DeflZ
                sMs(iy)(ix) = r.StressMaxShear
            Next
        Next

        Return New Dto.LeafGridResponse With {
            .xCoords = xCoords,
            .yCoords = yCoords,
            .stressX = sX,
            .stressY = sY,
            .stressZ = sZ,
            .strainZ = eZ,
            .deflZ = dZ,
            .stressMaxShear = sMs
        }
    End Function

    ''' <summary>
    ''' Compute stress profile at multiple depths through the pavement.
    ''' </summary>
    Public Function ComputeProfile(req As Dto.LeafPointRequest) As Dto.LeafPointResponse
        Dim nDepths As Integer = req.evalDepths.Length

        Dim depths(nDepths - 1) As Double
        Dim resStressX(nDepths - 1) As Double
        Dim resStressY(nDepths - 1) As Double
        Dim resStressZ(nDepths - 1) As Double
        Dim resStrainX(nDepths - 1) As Double
        Dim resStrainY(nDepths - 1) As Double
        Dim resStrainZ(nDepths - 1) As Double
        Dim resDeflZ(nDepths - 1) As Double
        Dim resMaxShear(nDepths - 1) As Double

        For d As Integer = 0 To nDepths - 1
            Dim evalDepth As Double = req.evalDepths(d)
            depths(d) = evalDepth

            ' Rebuild acParms each iteration — LEAF may mutate internal state
            Dim acParms As clsLEAF.LEAFACParms = BuildAircraftParms(req.aircraft)
            acParms.NEvalPoints = 1
            ReDim acParms.EvalX(1)
            ReDim acParms.EvalY(1)
            acParms.EvalX(1) = req.evalX
            acParms.EvalY(1) = req.evalY

            Dim str As clsLEAF.LEAFStrParms = BuildStructure(req.layers, req.subgrade, evalDepth)

            Dim nAC As Integer = 1
            Dim aircraft(1) As clsLEAF.LEAFACParms
            aircraft(1) = acParms

            Dim responseType As clsLEAF.LEAFoptions = clsLEAF.LEAFoptions.AllResponses
            Dim response(1, 1) As Double
            Dim allResps(1, 1) As clsLEAF.LEAFAllResponses

            Try
                leafSolver.ComputeResponse(responseType, nAC, aircraft, str, response, allResps)
            Catch ex As Exception
                ' Skip problematic depth but continue — set zeros
                resStressX(d) = 0 : resStressY(d) = 0 : resStressZ(d) = 0
                resStrainX(d) = 0 : resStrainY(d) = 0 : resStrainZ(d) = 0
                resDeflZ(d) = 0 : resMaxShear(d) = 0
                Continue For
            End Try

            Dim r As clsLEAF.LEAFAllResponses = allResps(1, 1)
            resStressX(d) = r.StressX
            resStressY(d) = r.StressY
            resStressZ(d) = r.StressZ
            resStrainX(d) = r.StrainX
            resStrainY(d) = r.StrainY
            resStrainZ(d) = r.StrainZ
            resDeflZ(d) = r.DeflZ
            resMaxShear(d) = r.StressMaxShear
        Next

        Return New Dto.LeafPointResponse With {
            .depths = depths,
            .stressX = resStressX,
            .stressY = resStressY,
            .stressZ = resStressZ,
            .strainX = resStrainX,
            .strainY = resStrainY,
            .strainZ = resStrainZ,
            .deflZ = resDeflZ,
            .stressMaxShear = resMaxShear,
            .meta = New Dto.ResponseMeta With {
                .solver = "LEAF",
                .evalDepthIn = 0,
                .computeTimeMs = 0
            }
        }
    End Function

End Module
