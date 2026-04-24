Imports LEAFClassLib
Imports FAAMeshClassLib
Imports System.Reflection
Imports System.Threading

''' <summary>
''' Phase A spike for specs/fem3d-real-stress-export.md.
''' Goal: prove we can extract real FEM stress (clsPrintOut.st(,,,)) by re-invoking
''' FAASR3D with our own retained clsFEM instance after clsAM.ComputeResponse has
''' populated modPG.IPC (the FEM input struct) and the modWorld globals.
'''
''' Pipeline:
'''   1. Run Fem3dWrapper.ComputePccStress (current path) to populate modPG state.
'''   2. Reflect:
'''        AMClassLib.modPG.IPC          (Public Static — FEMClassLib.clsFEM.InputCards)
'''        AMClassLib.modWorld.gDesignType (Public Static Integer)
'''        AMClassLib.modWorld.iSymCase    (Public Static Short)
'''   3. Create new FEMClassLib.clsFEM(), hold the reference.
'''   4. Call femRunner.FAASR3D(IPC, ...) with the reflected globals.
'''   5. After the call returns, reflect:
'''        femRunner.objSolve              (Public)
'''        objSolve.objPrintout            (Private)
'''        objPrintout.st                  (Public, Double(,,,))
'''   6. Report dimensions, nonzero count, peak magnitude, and sample values.
'''
''' If this spike returns a populated st(,,,) array with sane stress magnitudes,
''' Phase B (full backend wiring) is unblocked. If it returns null/empty st, we
''' fall back to Path B (fork ComputeResponse) per the spec's risk register.
'''
''' Not thread-safe — caller MUST hold analysisLock.
''' </summary>
Public Module Fem3dStressSpike

    Public Class SpikeResult
        Public Property success As Boolean
        Public Property phase As String                ' which step we reached
        Public Property errorMessage As String
        Public Property firstPassMs As Long            ' ComputePccStress duration
        Public Property secondPassMs As Long           ' our FAASR3D duration
        Public Property pccBottomStressFirstPass As Double  ' from ComputePccStress
        Public Property aircraftIcao As String
        Public Property aircraftName As String
        Public Property printoutDir As String          ' Where FAARFIELD wrote files (when modelOut=1)
        Public Property printoutFile As String         ' Full path to Output-Hexahedron Element-Step 1.txt
        Public Property modelOut As Integer            ' 0 = no files, 1 = write printout

        ' Reflected globals
        Public Property modPgIpcType As String
        Public Property modPgIpcNumelh As Integer
        Public Property modPgIpcNumnp As Integer
        Public Property modPgIpcNtime As Integer
        Public Property gDesignTypeValue As Integer
        Public Property iSymCaseValue As Short

        ' st(,,,) array description
        Public Property stTypeName As String
        Public Property stRank As Integer
        Public Property stDim0 As Integer              ' numelh
        Public Property stDim1 As Integer              ' 7 components
        Public Property stDim2 As Integer              ' 8 Gauss points
        Public Property stDim3 As Integer              ' ntime
        Public Property stNonzeroCount As Integer
        Public Property stPeakAbsValue As Double       ' over ALL slots including count column
        Public Property stPeakLocation As Integer()    ' [elem, comp, gp, time]

        ' Peak in the REAL stress slots only (components 1-6, all Gauss pts, last time)
        Public Property stPeakAbsStressOnly As Double
        Public Property stPeakStressLocation As Integer()  ' [elem, comp, gp, time]
        Public Property stPeakStressLabel As String

        ' Stress1/Stress8 — FAARFIELD's primary FEM peak outputs (passed by ref to FAASR3D).
        ' Same units as st(,,,) — used as a sanity check that we're reading the right field.
        Public Property stress1MaxAbs As Double
        Public Property stress8MaxAbs As Double
        Public Property stress1NonzeroCount As Integer
        Public Property stress8NonzeroCount As Integer

        ' Sample values: (elem, comp, gp, time) -> value
        Public Property samples As List(Of SampleEntry)

        ' Aggregated per-element magnitude (max of σ1 across 8 Gauss pts at last time step)
        ' First 5 elements only — proves the aggregation pipeline works end-to-end.
        Public Property elementSamples As List(Of ElementSample)
    End Class

    Public Class SampleEntry
        Public Property elem As Integer
        Public Property comp As Integer
        Public Property gp As Integer
        Public Property time As Integer
        Public Property value As Double
        Public Property componentLabel As String
    End Class

    Public Class ElementSample
        Public Property elementId As Integer
        Public Property sigmaX As Double
        Public Property sigmaY As Double
        Public Property sigmaZ As Double
        Public Property tauXY As Double
        Public Property tauYZ As Double
        Public Property tauXZ As Double
        Public Property mises As Double
    End Class

    ''' <summary>
    ''' Run the spike. Builds a hardcoded HMA-overlay-on-rigid section + the given
    ''' aircraft from the library, runs ComputePccStress, then re-invokes FAASR3D
    ''' against the populated globals and reflects the stress array.
    ''' </summary>
    Public Function RunSpike(icao As String,
                              Optional writePrintout As Boolean = False,
                              Optional bypassGearNormalization As Boolean = False) As SpikeResult
        Dim r As New SpikeResult()
        r.aircraftIcao = If(icao, "B738")
        r.samples = New List(Of SampleEntry)()
        r.elementSamples = New List(Of ElementSample)()
        r.modelOut = If(writePrintout, 1, 0)

        Try
            ' --- 1. Build hardcoded test inputs ---
            r.phase = "build_inputs"
            Dim layers As Dto.LayerInput() = BuildTestLayers()
            Dim subgrade As New Dto.SubgradeInput With {.E = 12000, .nu = 0.4}

            Dim geo As AircraftLibrary.AircraftGeometry =
                AircraftLibrary.ResolveGeometry(r.aircraftIcao, "", 0, 0)
            If geo Is Nothing OrElse Not AircraftLibrary.IsFem3dGeometrySufficient(geo) Then
                r.success = False
                r.errorMessage = "Aircraft " & r.aircraftIcao & " not resolvable for FEM3D"
                Return r
            End If
            Dim acParms As clsLEAF.LEAFACParms =
                AircraftLibrary.BuildLeafParms(geo, r.aircraftIcao)
            r.aircraftName = acParms.ACname

            ' --- 2. First pass: existing wrapper, no mesh extraction ---
            r.phase = "first_pass"
            Console.WriteLine("    [spike] phase=first_pass starting ComputePccStress for " & acParms.ACname)
            Dim sw1 As New Diagnostics.Stopwatch()
            sw1.Start()
            Dim firstResult As Fem3dWrapper.Fem3dResult =
                Fem3dWrapper.ComputePccStress(layers, subgrade, acParms, "FlexOnRigid", 0, False, False, True, False, bypassGearNormalization)
            sw1.Stop()
            r.firstPassMs = sw1.ElapsedMilliseconds
            Console.WriteLine("    [spike] phase=first_pass DONE in " & r.firstPassMs & "ms, success=" & firstResult.success)
            If Not firstResult.success Then
                r.success = False
                r.errorMessage = "First-pass ComputePccStress failed: " & firstResult.errorMessage
                Return r
            End If
            r.pccBottomStressFirstPass = firstResult.pccBottomStress

            ' --- 3. Reflect modPG.IPC and modWorld globals ---
            r.phase = "reflect_globals"
            Console.WriteLine("    [spike] phase=reflect_globals")
            Dim amAsm As Assembly = GetType(AMClassLib.clsAM).Assembly
            ' modPG.vb actually declares "Module modAutoMesh" (same module the
            ' existing Fem3dWrapper already uses to grab Nd/BrickElement).
            Dim modPgType As Type = amAsm.GetType("AMClassLib.modAutoMesh")
            Dim modWorldType As Type = amAsm.GetType("AMClassLib.modWorld")
            If modPgType Is Nothing OrElse modWorldType Is Nothing Then
                r.success = False
                r.errorMessage = "modAutoMesh/modWorld types not found via reflection"
                Return r
            End If

            Dim ipcField As FieldInfo = modPgType.GetField("IPC", BindingFlags.Public Or BindingFlags.Static)
            Dim gdtField As FieldInfo = modWorldType.GetField("gDesignType", BindingFlags.Public Or BindingFlags.Static)
            Dim symField As FieldInfo = modWorldType.GetField("iSymCase", BindingFlags.Public Or BindingFlags.Static)
            If ipcField Is Nothing OrElse gdtField Is Nothing OrElse symField Is Nothing Then
                r.success = False
                r.errorMessage = "Required fields not found: IPC=" & (ipcField IsNot Nothing) &
                                 " gDesignType=" & (gdtField IsNot Nothing) &
                                 " iSymCase=" & (symField IsNot Nothing)
                Return r
            End If

            Dim ipcBoxed As Object = ipcField.GetValue(Nothing)
            Dim gDesignType As Integer = CInt(gdtField.GetValue(Nothing))
            Dim iSymCase As Short = CShort(symField.GetValue(Nothing))
            r.gDesignTypeValue = gDesignType
            r.iSymCaseValue = iSymCase
            r.modPgIpcType = If(ipcBoxed Is Nothing, "<null>", ipcBoxed.GetType().FullName)

            If ipcBoxed Is Nothing Then
                r.success = False
                r.errorMessage = "modPG.IPC is null after first pass — Conversion() did not run or was reset"
                Return r
            End If

            ' Read a few struct fields out of the boxed IPC for sanity
            Dim ipcType As Type = ipcBoxed.GetType()
            Dim numelhField As FieldInfo = ipcType.GetField("numelh", BindingFlags.Public Or BindingFlags.Instance)
            Dim numnpField As FieldInfo = ipcType.GetField("numnp", BindingFlags.Public Or BindingFlags.Instance)
            Dim ntimeField As FieldInfo = ipcType.GetField("ntime", BindingFlags.Public Or BindingFlags.Instance)
            If numelhField IsNot Nothing Then r.modPgIpcNumelh = CInt(numelhField.GetValue(ipcBoxed))
            If numnpField IsNot Nothing Then r.modPgIpcNumnp = CInt(numnpField.GetValue(ipcBoxed))
            If ntimeField IsNot Nothing Then r.modPgIpcNtime = CInt(ntimeField.GetValue(ipcBoxed))

            ' --- 4. Build new clsFEM and re-call FAASR3D ---
            r.phase = "second_pass_faasr3d"
            Console.WriteLine("    [spike] phase=second_pass_faasr3d — IPC.numelh=" & r.modPgIpcNumelh &
                              " numnp=" & r.modPgIpcNumnp & " ntime=" & r.modPgIpcNtime &
                              " gDesignType=" & r.gDesignTypeValue & " iSymCase=" & r.iSymCaseValue)
            Dim femRunner As New FEMClassLib.clsFEM()
            Dim ipcStruct As FEMClassLib.clsFEM.InputCards = CType(ipcBoxed, FEMClassLib.clsFEM.InputCards)
            Dim Stress1(80) As Double
            Dim Stress8(80) As Double
            Dim StopFEDFAA As Short = 0
            Dim FEDFAAStopped As Short = 0
            Dim ctSrc As New CancellationTokenSource()
            Dim ct As CancellationToken = ctSrc.Token
            Dim spikeJobName As String = "fem_spike_" & Guid.NewGuid().ToString("N").Substring(0, 8)
            Dim spikeWorkDir As String = IO.Path.GetTempPath()  ' ModelOut=0 means no files actually written

            ' Re-call Conversion() so IPC is freshly rebuilt from modAutoMesh.NodalLoad
            ' before the second FAASR3D solve. The first FAASR3D consumed/normalized
            ' load state — without re-rebuilding IPC, the second solve sees zero loads
            ' and Stress1/Stress8 come back ~0.
            Console.WriteLine("    [spike] re-calling Conversion() to refresh IPC")
            Dim convMethod As MethodInfo = modPgType.GetMethod("Conversion",
                BindingFlags.Public Or BindingFlags.NonPublic Or BindingFlags.Static)
            If convMethod IsNot Nothing Then
                convMethod.Invoke(Nothing, Nothing)
                ' Re-read IPC after Conversion to pass the refreshed struct
                ipcBoxed = ipcField.GetValue(Nothing)
                ipcStruct = CType(ipcBoxed, FEMClassLib.clsFEM.InputCards)
                Console.WriteLine("    [spike] Conversion() OK, IPC.nload=" &
                    ipcStruct.nload & " IPC.numelh=" & ipcStruct.numelh)
            Else
                Console.WriteLine("    [spike] WARN: Conversion() method not found")
            End If

            ' If writePrintout=true, FAASR3D writes the per-element Gauss-point
            ' stress table to:
            '   <spikeWorkDir>/PrintOut-<spikeJobName>/Output-Hexahedron Element-Step 1.txt
            ' This file is byte-identical to what desktop FAARFIELD would produce
            ' for the same inputs (same DLLs, same code path).
            If writePrintout Then
                Dim pdir As String = IO.Path.Combine(spikeWorkDir, "PrintOut-" & spikeJobName)
                IO.Directory.CreateDirectory(pdir)
                r.printoutDir = pdir
                r.printoutFile = IO.Path.Combine(pdir, "Output-Hexahedron Element-Step 1.txt")
            End If

            Console.WriteLine("    [spike] calling FAASR3D - workdir=" & spikeWorkDir &
                              " job=" & spikeJobName & " modelOut=" & r.modelOut)
            Dim sw2 As New Diagnostics.Stopwatch()
            sw2.Start()
            femRunner.FAASR3D(ipcStruct, Stress1, Stress8, StopFEDFAA, FEDFAAStopped,
                              CShort(gDesignType), iSymCase, spikeWorkDir, spikeJobName, r.modelOut, ct)
            sw2.Stop()
            r.secondPassMs = sw2.ElapsedMilliseconds
            Console.WriteLine("    [spike] FAASR3D returned in " & r.secondPassMs & "ms")

            ' Capture Stress1/Stress8 — FAARFIELD's own published peak values
            For i As Integer = 0 To Stress1.Length - 1
                If Stress1(i) <> 0 Then r.stress1NonzeroCount += 1
                If Math.Abs(Stress1(i)) > r.stress1MaxAbs Then r.stress1MaxAbs = Math.Abs(Stress1(i))
            Next
            For i As Integer = 0 To Stress8.Length - 1
                If Stress8(i) <> 0 Then r.stress8NonzeroCount += 1
                If Math.Abs(Stress8(i)) > r.stress8MaxAbs Then r.stress8MaxAbs = Math.Abs(Stress8(i))
            Next
            Console.WriteLine("    [spike] Stress1 max=" & r.stress1MaxAbs.ToString("F2") &
                              " psi (" & r.stress1NonzeroCount & " nonzero), Stress8 max=" &
                              r.stress8MaxAbs.ToString("F2") & " psi (" & r.stress8NonzeroCount & " nonzero)")

            ' --- 5. Reflect into objSolve.objPrintout.st(,,,) ---
            r.phase = "reflect_stress"
            Console.WriteLine("    [spike] phase=reflect_stress")
            Dim objSolve As Object = femRunner.objSolve
            If objSolve Is Nothing Then
                r.success = False
                r.errorMessage = "femRunner.objSolve is null after FAASR3D"
                Return r
            End If

            Dim solveType As Type = objSolve.GetType()
            Dim printoutField As FieldInfo = solveType.GetField("objPrintout",
                BindingFlags.NonPublic Or BindingFlags.Instance)
            If printoutField Is Nothing Then
                r.success = False
                r.errorMessage = "objPrintout field not found on " & solveType.FullName
                Return r
            End If

            Dim objPrintout As Object = printoutField.GetValue(objSolve)
            If objPrintout Is Nothing Then
                r.success = False
                r.errorMessage = "objPrintout is null"
                Return r
            End If

            Dim stField As FieldInfo = objPrintout.GetType().GetField("st",
                BindingFlags.Public Or BindingFlags.Instance)
            If stField Is Nothing Then
                r.success = False
                r.errorMessage = "st field not found on " & objPrintout.GetType().FullName
                Return r
            End If

            Dim stArr As Array = TryCast(stField.GetValue(objPrintout), Array)
            If stArr Is Nothing Then
                r.success = False
                r.errorMessage = "st field present but value is null/not an array"
                Return r
            End If

            r.stTypeName = stArr.GetType().FullName
            r.stRank = stArr.Rank
            If stArr.Rank <> 4 Then
                r.success = False
                r.errorMessage = "st has unexpected rank " & stArr.Rank
                Return r
            End If
            r.stDim0 = stArr.GetLength(0)
            r.stDim1 = stArr.GetLength(1)
            r.stDim2 = stArr.GetLength(2)
            r.stDim3 = stArr.GetLength(3)

            ' --- 6. Scan st for nonzero count and peak magnitude ---
            r.phase = "scan_stress"
            Dim nonzero As Integer = 0
            Dim peakAbs As Double = 0
            Dim peakLoc(3) As Integer
            Dim stTyped As Double(,,,) = CType(stArr, Double(,,,))
            For e As Integer = 0 To r.stDim0 - 1
                For c As Integer = 0 To r.stDim1 - 1
                    For g As Integer = 0 To r.stDim2 - 1
                        For t As Integer = 0 To r.stDim3 - 1
                            Dim v As Double = stTyped(e, c, g, t)
                            If v <> 0 Then nonzero += 1
                            If Math.Abs(v) > peakAbs Then
                                peakAbs = Math.Abs(v)
                                peakLoc(0) = e : peakLoc(1) = c : peakLoc(2) = g : peakLoc(3) = t
                            End If
                        Next
                    Next
                Next
            Next
            r.stNonzeroCount = nonzero
            r.stPeakAbsValue = peakAbs
            r.stPeakLocation = peakLoc

            ' --- 6b. Scan ONLY the real stress slots (components 1-6, all Gauss pts, last time step) ---
            ' Component 7 is a count/padding column per cls.prtrs.vb — exclude it from "stress peak".
            Dim peakAbsStress As Double = 0
            Dim peakStressLoc(3) As Integer
            Dim labels As String() = {"<idx0>", "sigmaX", "sigmaY", "sigmaZ", "tauXY", "tauYZ", "tauXZ", "<count>"}
            Dim lastT As Integer = r.stDim3 - 1
            For e As Integer = 1 To r.stDim0 - 1
                For c As Integer = 1 To Math.Min(6, r.stDim1 - 1)
                    For g As Integer = 1 To Math.Min(8, r.stDim2 - 1)
                        Dim v As Double = stTyped(e, c, g, lastT)
                        If Math.Abs(v) > peakAbsStress Then
                            peakAbsStress = Math.Abs(v)
                            peakStressLoc(0) = e : peakStressLoc(1) = c : peakStressLoc(2) = g : peakStressLoc(3) = lastT
                        End If
                    Next
                Next
            Next
            r.stPeakAbsStressOnly = peakAbsStress
            r.stPeakStressLocation = peakStressLoc
            r.stPeakStressLabel = labels(peakStressLoc(1))
            Console.WriteLine("    [spike] st REAL-STRESS peak |sigma|=" & peakAbsStress.ToString("F2") &
                              " psi at elem=" & peakStressLoc(0) & " comp=" & r.stPeakStressLabel &
                              " gp=" & peakStressLoc(2))

            ' --- 7. Sample at REAL-STRESS peak location for all 6 components, last time step ---
            Dim lastTime As Integer = r.stDim3 - 1
            Dim peakElem As Integer = peakStressLoc(0)
            Dim peakGp As Integer = peakStressLoc(2)
            For c As Integer = 1 To Math.Min(6, r.stDim1 - 1)
                r.samples.Add(New SampleEntry With {
                    .elem = peakElem,
                    .comp = c,
                    .gp = peakGp,
                    .time = lastTime,
                    .value = stTyped(peakElem, c, peakGp, lastTime),
                    .componentLabel = labels(c)
                })
            Next

            ' --- 8. Per-element aggregate (first 5 elements at last time step) ---
            Dim elemsToSample As Integer = Math.Min(5, r.stDim0 - 1)
            For e As Integer = 1 To elemsToSample  ' FAARFIELD st is 1-based for elements
                Dim sx As Double = 0, sy As Double = 0, sz As Double = 0
                Dim txy As Double = 0, tyz As Double = 0, txz As Double = 0
                ' Aggregate by mean across 8 Gauss points
                For g As Integer = 1 To Math.Min(8, r.stDim2 - 1)
                    sx += stTyped(e, 1, g, lastTime)
                    sy += stTyped(e, 2, g, lastTime)
                    sz += stTyped(e, 3, g, lastTime)
                    txy += stTyped(e, 4, g, lastTime)
                    tyz += stTyped(e, 5, g, lastTime)
                    txz += stTyped(e, 6, g, lastTime)
                Next
                Dim n As Double = Math.Min(8, r.stDim2 - 1)
                If n > 0 Then
                    sx /= n : sy /= n : sz /= n
                    txy /= n : tyz /= n : txz /= n
                End If
                Dim mises As Double = Math.Sqrt(0.5 * ((sx - sy) ^ 2 + (sy - sz) ^ 2 + (sz - sx) ^ 2 +
                                                       6 * (txy * txy + tyz * tyz + txz * txz)))
                r.elementSamples.Add(New ElementSample With {
                    .elementId = e,
                    .sigmaX = sx, .sigmaY = sy, .sigmaZ = sz,
                    .tauXY = txy, .tauYZ = tyz, .tauXZ = txz,
                    .mises = mises
                })
            Next

            r.phase = "done"
            r.success = True
            Return r

        Catch ex As Exception
            r.success = False
            r.errorMessage = ex.Message & If(ex.InnerException IsNot Nothing,
                                             " | inner: " & ex.InnerException.Message, "") &
                             vbCrLf & ex.StackTrace
            Return r
        End Try
    End Function

    ' Hardcoded test section: 4" P-401 AC overlay over 12" P-501 PCC over subgrade.
    ' Subgrade passed separately to ComputePccStress, NOT included in this array.
    ' Standard FAARFIELD HMA-overlay-on-rigid case.
    Private Function BuildTestLayers() As Dto.LayerInput()
        Dim layers(1) As Dto.LayerInput
        layers(0) = New Dto.LayerInput With {.type = "P-401", .h = 4.0, .E = 200000, .nu = 0.35}
        layers(1) = New Dto.LayerInput With {.type = "P-501", .h = 12.0, .E = 4000000, .nu = 0.15}
        Return layers
    End Function

    ''' <summary>
    ''' Phase 2 pre-spike (per note_x/codex-claude-actual-complex-gear-fem-step-by-step.md).
    '''
    ''' Goal: prove we can extend modAutoMesh.NodalLoad in place, re-run Conversion(),
    ''' and get FAASR3D to honor the extended load set.
    '''
    ''' Pattern:
    '''   1. Run Fem3dWrapper.ComputePccStress (synthetic-D collapse) → populates mesh +
    '''      modAutoMesh.NodalLoad(1) with the baseline 2-wheel allocation.
    '''   2. Conversion() + FAASR3D (pass A) → baseline stress.
    '''   3. Reflect modAutoMesh.{NodalLoad, Nd}; for each of geo's real wheels
    '''      (all 12 for B77L, 8 for B748, etc.), find nearest top-surface node and
    '''      append a (Node, Load) entry to NodalLoad(1). Load magnitude = mean of
    '''      existing baseline loads (keeps order of magnitude sensible; load
    '''      conservation can be validated in Phase 2 proper).
    '''   4. Conversion() + FAASR3D (pass B) → injected stress.
    '''   5. Compare baseline vs injected. Report IPC.nload before/after, Stress1
    '''      before/after, st(,,,) peak before/after.
    '''
    ''' Success criteria (user's): IPC.nload increased AND Stress1 has multiple
    ''' nonzero entries in the injected pass.
    ''' Bonus: if the peak element location changes between baseline and injected
    ''' passes, that's strong evidence the injected wheels actually perturbed the
    ''' stress field.
    '''
    ''' Not thread-safe — caller MUST hold analysisLock.
    ''' </summary>

    Public Class NodalLoadSpikeResult
        Public Property success As Boolean
        Public Property phase As String
        Public Property errorMessage As String
        Public Property aircraftIcao As String
        Public Property aircraftName As String

        ' Geo (all wheels, pre-collapse)
        Public Property geoSource As String
        Public Property geoGearType As String
        Public Property geoNWheels As Integer
        Public Property geoGearLoad As Double
        Public Property geoTirePressure As Double

        ' Mesh metadata
        Public Property zmax As Double
        Public Property numnp As Integer
        Public Property numelh As Integer
        Public Property gDesignTypeValue As Integer
        Public Property iSymCaseValue As Short

        ' BASELINE pass (synthetic-D via ComputePccStress + our Conversion + FAASR3D)
        Public Property baselineNNodalLoad As Integer
        Public Property baselineIpcNload As Integer
        Public Property baselineStress1MaxAbs As Double
        Public Property baselineStress1NonzeroCount As Integer
        Public Property baselineStPeakAbs As Double
        Public Property baselineStPeakElem As Integer
        Public Property baselineFaasr3dMs As Long

        ' INJECTION details
        Public Property injectedWheels As List(Of InjectedWheel)
        Public Property loadPerInjectedWheel As Double
        Public Property actualInjectedCount As Integer

        ' INJECTED pass (baseline + real wheel array, our Conversion + FAASR3D)
        Public Property injectedNNodalLoad As Integer
        Public Property injectedIpcNload As Integer
        Public Property injectedStress1MaxAbs As Double
        Public Property injectedStress1NonzeroCount As Integer
        Public Property injectedStPeakAbs As Double
        Public Property injectedStPeakElem As Integer
        Public Property injectedFaasr3dMs As Long

        ' Success flags (per Phase 2 pre-spike criteria)
        Public Property ipcNloadIncreased As Boolean
        Public Property stress1MultipleNonzero As Boolean
        Public Property peakLocationChanged As Boolean
    End Class

    Public Class InjectedWheel
        Public Property wheelIdx As Integer
        Public Property tireX As Double
        Public Property tireY As Double
        Public Property nearestNodeIdx As Integer
        Public Property nearestNodeX As Double
        Public Property nearestNodeY As Double
        Public Property distanceInches As Double
        Public Property insideMesh As Boolean
    End Class

    Public Function RunNodalLoadInjectionSpike(icao As String) As NodalLoadSpikeResult
        Dim r As New NodalLoadSpikeResult()
        r.aircraftIcao = If(icao, "B77L").Trim().ToUpperInvariant()
        r.injectedWheels = New List(Of InjectedWheel)()

        Try
            ' --- 1. Build test inputs + resolve full geometry (all wheels preserved) ---
            r.phase = "build_inputs"
            Dim layers As Dto.LayerInput() = BuildTestLayers()
            Dim subgrade As New Dto.SubgradeInput With {.E = 12000, .nu = 0.4}

            Dim geo As AircraftLibrary.AircraftGeometry =
                AircraftLibrary.ResolveGeometry(r.aircraftIcao, "", 0, 0)
            If geo Is Nothing Then
                r.success = False
                r.errorMessage = "Cannot resolve geometry for " & r.aircraftIcao
                Return r
            End If
            r.geoSource = geo.Source
            r.geoGearType = geo.GearType
            r.geoNWheels = geo.NWheels
            r.geoGearLoad = geo.GearLoad
            r.geoTirePressure = geo.TirePressure

            Dim acParms As clsLEAF.LEAFACParms =
                AircraftLibrary.BuildLeafParms(geo, r.aircraftIcao)
            r.aircraftName = acParms.ACname
            Console.WriteLine("    [nl-spike] icao=" & r.aircraftIcao &
                              " geo.NWheels=" & geo.NWheels & " gear=" & geo.GearType &
                              " source=" & geo.Source)

            ' --- 2. First pass via ComputePccStress: populates mesh + synthetic-D NodalLoad ---
            r.phase = "first_compute_pcc_stress"
            Dim firstResult As Fem3dWrapper.Fem3dResult =
                Fem3dWrapper.ComputePccStress(layers, subgrade, acParms, "FlexOnRigid",
                                               0, False, False, True, False, False)
            If Not firstResult.success Then
                r.success = False
                r.errorMessage = "ComputePccStress failed: " & firstResult.errorMessage
                Return r
            End If

            ' --- 3. Reflect modAutoMesh + modWorld globals ---
            r.phase = "reflect_globals"
            Dim amAsm As Assembly = GetType(AMClassLib.clsAM).Assembly
            Dim modAmType As Type = amAsm.GetType("AMClassLib.modAutoMesh")
            Dim modWorldType As Type = amAsm.GetType("AMClassLib.modWorld")
            If modAmType Is Nothing OrElse modWorldType Is Nothing Then
                r.success = False
                r.errorMessage = "modAutoMesh/modWorld reflection types not found"
                Return r
            End If

            Dim nodalLoadField As FieldInfo = modAmType.GetField("NodalLoad",
                BindingFlags.Public Or BindingFlags.Static)
            Dim ndField As FieldInfo = modAmType.GetField("Nd",
                BindingFlags.Public Or BindingFlags.Static)
            Dim ipcField As FieldInfo = modAmType.GetField("IPC",
                BindingFlags.Public Or BindingFlags.Static)
            Dim gdtField As FieldInfo = modWorldType.GetField("gDesignType",
                BindingFlags.Public Or BindingFlags.Static)
            Dim symField As FieldInfo = modWorldType.GetField("iSymCase",
                BindingFlags.Public Or BindingFlags.Static)
            Dim convMethod As MethodInfo = modAmType.GetMethod("Conversion",
                BindingFlags.Public Or BindingFlags.NonPublic Or BindingFlags.Static)
            If nodalLoadField Is Nothing OrElse ndField Is Nothing OrElse
               ipcField Is Nothing OrElse gdtField Is Nothing OrElse
               symField Is Nothing OrElse convMethod Is Nothing Then
                r.success = False
                r.errorMessage = "Required modAutoMesh fields/methods not found via reflection"
                Return r
            End If

            r.gDesignTypeValue = CInt(gdtField.GetValue(Nothing))
            r.iSymCaseValue = CShort(symField.GetValue(Nothing))

            ' Read IPC
            Dim ipcBoxed As Object = ipcField.GetValue(Nothing)
            Dim ipcStruct As FEMClassLib.clsFEM.InputCards = CType(ipcBoxed, FEMClassLib.clsFEM.InputCards)
            r.numnp = ipcStruct.numnp
            r.numelh = ipcStruct.numelh

            ' Read NodalLoad(1) via DIRECT TYPED ACCESS (no struct boxing).
            ' VB.NET struct-array indexing returns a reference — modifying
            ' nlTyped(1).field assigns directly into the array element.
            Dim nlTyped As clsMesh.NodalLoadCharacteristics() =
                CType(nodalLoadField.GetValue(Nothing), clsMesh.NodalLoadCharacteristics())
            If nlTyped Is Nothing OrElse nlTyped.Length < 2 Then
                r.success = False
                r.errorMessage = "modAutoMesh.NodalLoad array empty/too small (Length=" &
                                 If(nlTyped Is Nothing, 0, nlTyped.Length) & ")"
                Return r
            End If

            r.baselineNNodalLoad = nlTyped(1).NNodalLoad
            Dim baselineNodes As Integer() = nlTyped(1).Node
            Dim baselineLoads As Double() = nlTyped(1).Load
            Console.WriteLine("    [nl-spike] POST-ComputePccStress modAutoMesh.NodalLoad.Length=" & nlTyped.Length &
                              "  NodalLoad(1).NNodalLoad=" & r.baselineNNodalLoad &
                              "  Node.Length=" & If(baselineNodes Is Nothing, -1, baselineNodes.Length) &
                              "  Load.Length=" & If(baselineLoads Is Nothing, -1, baselineLoads.Length))
            ' Dump first few baseline entries (if any)
            If r.baselineNNodalLoad > 0 Then
                Dim preview As String = "  Baseline Node/Load entries: "
                For j As Integer = 1 To Math.Min(5, r.baselineNNodalLoad)
                    preview &= "(n=" & baselineNodes(j) & ",L=" & baselineLoads(j).ToString("F2") & ") "
                Next
                Console.WriteLine("    [nl-spike]" & preview)
            End If
            ' Also check IPC.nload BEFORE we call Conversion — does ComputePccStress leave IPC populated?
            Dim ipcStructPre As FEMClassLib.clsFEM.InputCards = CType(ipcField.GetValue(Nothing), FEMClassLib.clsFEM.InputCards)
            Console.WriteLine("    [nl-spike] PRE-Conversion IPC.nload=" & ipcStructPre.nload &
                              "  IPC.ntime=" & ipcStructPre.ntime &
                              "  IPC.numnp=" & ipcStructPre.numnp &
                              "  IPC.numelh=" & ipcStructPre.numelh)
            ' Check ACLoad
            Dim acLoadField As FieldInfo = modAmType.GetField("ACLoad", BindingFlags.Public Or BindingFlags.Static)
            If acLoadField IsNot Nothing Then
                Dim acArr As Array = TryCast(acLoadField.GetValue(Nothing), Array)
                Console.WriteLine("    [nl-spike] modAutoMesh.ACLoad.Length=" & If(acArr Is Nothing, -1, acArr.Length))
            End If

            ' --- 4. Baseline Conversion + FAASR3D ---
            r.phase = "baseline_faasr3d"
            convMethod.Invoke(Nothing, Nothing)
            ipcBoxed = ipcField.GetValue(Nothing)
            ipcStruct = CType(ipcBoxed, FEMClassLib.clsFEM.InputCards)
            r.baselineIpcNload = ipcStruct.nload

            Dim workDir As String = IO.Path.GetTempPath()
            Dim jobBase As String = "nl_base_" & Guid.NewGuid().ToString("N").Substring(0, 8)
            Dim ctSrc As New CancellationTokenSource()

            Dim Stress1a(80) As Double
            Dim Stress8a(80) As Double
            Dim stop1 As Short = 0, stopped1 As Short = 0
            Dim femRunner1 As New FEMClassLib.clsFEM()
            Dim sw1 As New Diagnostics.Stopwatch()
            sw1.Start()
            femRunner1.FAASR3D(ipcStruct, Stress1a, Stress8a, stop1, stopped1,
                               CShort(r.gDesignTypeValue), r.iSymCaseValue,
                               workDir, jobBase, 0, ctSrc.Token)
            sw1.Stop()
            r.baselineFaasr3dMs = sw1.ElapsedMilliseconds

            For i As Integer = 0 To Stress1a.Length - 1
                If Stress1a(i) <> 0 Then r.baselineStress1NonzeroCount += 1
                If Math.Abs(Stress1a(i)) > r.baselineStress1MaxAbs Then r.baselineStress1MaxAbs = Math.Abs(Stress1a(i))
            Next

            Dim basePeak As Double = 0, baseElem As Integer = 0
            ExtractStPeak(femRunner1, basePeak, baseElem)
            r.baselineStPeakAbs = basePeak
            r.baselineStPeakElem = baseElem
            Console.WriteLine("    [nl-spike] baseline: IPC.nload=" & r.baselineIpcNload &
                              " Stress1.max=" & r.baselineStress1MaxAbs.ToString("F2") &
                              " nonzero=" & r.baselineStress1NonzeroCount &
                              " st.peak=" & r.baselineStPeakAbs.ToString("F2") &
                              " @elem=" & r.baselineStPeakElem & " " & r.baselineFaasr3dMs & "ms")

            ' --- 5. Inject real wheels via nearest-node on top slab surface ---
            r.phase = "inject_wheels"

            ' Scan Nd() for ZMax (slab top). Also capture the field handles.
            Dim ndArr As Array = CType(ndField.GetValue(Nothing), Array)
            Dim ndLen As Integer = ndArr.Length
            Dim ndType As Type = Nothing
            Dim xF As FieldInfo = Nothing, yF As FieldInfo = Nothing, zF As FieldInfo = Nothing
            Dim zmax As Double = Double.MinValue
            For k As Integer = 1 To ndLen - 1
                Dim ndObj As Object = ndArr.GetValue(k)
                If ndObj Is Nothing Then Continue For
                If ndType Is Nothing Then
                    ndType = ndObj.GetType()
                    xF = ndType.GetField("X", BindingFlags.Public Or BindingFlags.Instance)
                    yF = ndType.GetField("Y", BindingFlags.Public Or BindingFlags.Instance)
                    zF = ndType.GetField("Z", BindingFlags.Public Or BindingFlags.Instance)
                    If xF Is Nothing OrElse yF Is Nothing OrElse zF Is Nothing Then
                        r.success = False
                        r.errorMessage = "NodeCharacteristics X/Y/Z fields not found"
                        Return r
                    End If
                End If
                Dim zv As Double = CDbl(zF.GetValue(ndObj))
                If zv > zmax Then zmax = zv
            Next
            r.zmax = zmax
            Console.WriteLine("    [nl-spike] zmax=" & zmax.ToString("F3") & " Nd.Length=" & ndLen)

            ' Load magnitude: mean of baseline loads (keeps order of magnitude).
            Dim avgLoad As Double = 0
            For j As Integer = 1 To r.baselineNNodalLoad
                avgLoad += baselineLoads(j)
            Next
            If r.baselineNNodalLoad > 0 Then avgLoad /= r.baselineNNodalLoad
            r.loadPerInjectedWheel = If(avgLoad > 0, avgLoad, 1000.0)

            Dim nWheels As Integer = geo.NWheels
            Dim extSize As Integer = r.baselineNNodalLoad + nWheels
            Dim newNodes(extSize) As Integer
            Dim newLoads(extSize) As Double
            ' Copy baseline entries (1-based; slot 0 unused per VB convention)
            For j As Integer = 0 To r.baselineNNodalLoad
                If j < baselineNodes.Length Then newNodes(j) = baselineNodes(j)
                If j < baselineLoads.Length Then newLoads(j) = baselineLoads(j)
            Next

            Dim errTol As Double = 0.05
            Dim injectIdx As Integer = r.baselineNNodalLoad
            For w As Integer = 0 To nWheels - 1
                Dim xw As Double = geo.WheelX(w)
                Dim yw As Double = geo.WheelY(w)
                Dim nearestK As Integer = -1
                Dim nearestDist As Double = Double.MaxValue
                Dim nearestX As Double = 0, nearestY As Double = 0
                For k As Integer = 1 To ndLen - 1
                    Dim ndObj As Object = ndArr.GetValue(k)
                    If ndObj Is Nothing Then Continue For
                    Dim zv As Double = CDbl(zF.GetValue(ndObj))
                    If Math.Abs(zv - zmax) > errTol Then Continue For
                    Dim xv As Double = CDbl(xF.GetValue(ndObj))
                    Dim yv As Double = CDbl(yF.GetValue(ndObj))
                    Dim dx As Double = xv - xw
                    Dim dy As Double = yv - yw
                    Dim d As Double = Math.Sqrt(dx * dx + dy * dy)
                    If d < nearestDist Then
                        nearestDist = d : nearestK = k : nearestX = xv : nearestY = yv
                    End If
                Next
                If nearestK > 0 Then
                    injectIdx += 1
                    newNodes(injectIdx) = nearestK
                    newLoads(injectIdx) = r.loadPerInjectedWheel
                    r.injectedWheels.Add(New InjectedWheel With {
                        .wheelIdx = w,
                        .tireX = xw, .tireY = yw,
                        .nearestNodeIdx = nearestK,
                        .nearestNodeX = nearestX, .nearestNodeY = nearestY,
                        .distanceInches = nearestDist,
                        .insideMesh = nearestDist < 12.0
                    })
                End If
            Next
            r.actualInjectedCount = injectIdx - r.baselineNNodalLoad
            r.injectedNNodalLoad = r.baselineNNodalLoad + r.actualInjectedCount

            ' Direct typed write — no struct boxing. nlTyped(1).field = value
            ' modifies the array slot in place.
            nlTyped(1).Node = newNodes
            nlTyped(1).Load = newLoads
            nlTyped(1).NNodalLoad = r.injectedNNodalLoad

            Console.WriteLine("    [nl-spike] injected " & r.actualInjectedCount &
                              " wheels at load=" & r.loadPerInjectedWheel.ToString("F1") &
                              " each, new NN=" & r.injectedNNodalLoad)

            ' VERIFY the injection persisted by re-reading modAutoMesh.NodalLoad
            Dim verifyTyped As clsMesh.NodalLoadCharacteristics() =
                CType(nodalLoadField.GetValue(Nothing), clsMesh.NodalLoadCharacteristics())
            Dim verifyNN As Integer = verifyTyped(1).NNodalLoad
            Dim verifyNodes As Integer() = verifyTyped(1).Node
            Console.WriteLine("    [nl-spike] POST-injection VERIFY: NodalLoad(1).NNodalLoad=" & verifyNN &
                              "  Node.Length=" & If(verifyNodes Is Nothing, -1, verifyNodes.Length) &
                              "  first-new-slot: Node=" & verifyNodes(r.baselineNNodalLoad + 1) &
                              "  Load=" & verifyTyped(1).Load(r.baselineNNodalLoad + 1).ToString("F1"))

            ' --- 6. Injected Conversion + FAASR3D ---
            r.phase = "injected_faasr3d"
            convMethod.Invoke(Nothing, Nothing)
            ipcBoxed = ipcField.GetValue(Nothing)
            ipcStruct = CType(ipcBoxed, FEMClassLib.clsFEM.InputCards)
            r.injectedIpcNload = ipcStruct.nload

            Dim Stress1b(80) As Double
            Dim Stress8b(80) As Double
            Dim stop2 As Short = 0, stopped2 As Short = 0
            Dim femRunner2 As New FEMClassLib.clsFEM()
            Dim jobInj As String = "nl_inj_" & Guid.NewGuid().ToString("N").Substring(0, 8)
            Dim sw2 As New Diagnostics.Stopwatch()
            sw2.Start()
            femRunner2.FAASR3D(ipcStruct, Stress1b, Stress8b, stop2, stopped2,
                               CShort(r.gDesignTypeValue), r.iSymCaseValue,
                               workDir, jobInj, 0, ctSrc.Token)
            sw2.Stop()
            r.injectedFaasr3dMs = sw2.ElapsedMilliseconds

            For i As Integer = 0 To Stress1b.Length - 1
                If Stress1b(i) <> 0 Then r.injectedStress1NonzeroCount += 1
                If Math.Abs(Stress1b(i)) > r.injectedStress1MaxAbs Then r.injectedStress1MaxAbs = Math.Abs(Stress1b(i))
            Next

            Dim injPeak As Double = 0, injElem As Integer = 0
            ExtractStPeak(femRunner2, injPeak, injElem)
            r.injectedStPeakAbs = injPeak
            r.injectedStPeakElem = injElem
            Console.WriteLine("    [nl-spike] injected: IPC.nload=" & r.injectedIpcNload &
                              " Stress1.max=" & r.injectedStress1MaxAbs.ToString("F2") &
                              " nonzero=" & r.injectedStress1NonzeroCount &
                              " st.peak=" & r.injectedStPeakAbs.ToString("F2") &
                              " @elem=" & r.injectedStPeakElem & " " & r.injectedFaasr3dMs & "ms")

            ' --- 7. Success criteria ---
            ' The mechanism is proven if:
            '   (a) IPC.nload increased after Conversion (our writes persisted)
            '   (b) the stress field magnitude changed substantially between passes
            '       (FAASR3D honored the injected loads).
            ' stress1MultipleNonzero is NOT a valid criterion at ntime=1 — Stress1
            ' is FAARFIELD's per-time-step peak output, so only one slot is ever
            ' populated for a single-shot solve. Kept in the result for diagnostic
            ' visibility but excluded from the success gate.
            r.ipcNloadIncreased = r.injectedIpcNload > r.baselineIpcNload
            r.stress1MultipleNonzero = r.injectedStress1NonzeroCount > 1
            Dim stressDiff As Double = Math.Abs(r.injectedStPeakAbs - r.baselineStPeakAbs)
            Dim stressFieldChanged As Boolean =
                stressDiff > 0.5 AndAlso (stressDiff / Math.Max(r.baselineStPeakAbs, 1.0)) > 0.05
            r.peakLocationChanged = (r.injectedStPeakElem <> r.baselineStPeakElem) AndAlso
                                    (r.injectedStPeakAbs > 0)

            r.success = r.ipcNloadIncreased AndAlso stressFieldChanged
            r.phase = If(r.success, "done", "failed_criteria")
            Return r

        Catch ex As Exception
            r.success = False
            r.errorMessage = ex.Message & If(ex.InnerException IsNot Nothing,
                                             " | inner: " & ex.InnerException.Message, "") &
                             vbCrLf & ex.StackTrace
            Return r
        End Try
    End Function

    Private Sub ExtractStPeak(femRunner As FEMClassLib.clsFEM,
                               ByRef peakAbs As Double,
                               ByRef peakElem As Integer)
        peakAbs = 0 : peakElem = 0
        If femRunner Is Nothing Then Return
        Dim objSolve As Object = femRunner.objSolve
        If objSolve Is Nothing Then Return
        Dim printoutField As FieldInfo = objSolve.GetType().GetField("objPrintout",
            BindingFlags.NonPublic Or BindingFlags.Instance)
        If printoutField Is Nothing Then Return
        Dim objPrintout As Object = printoutField.GetValue(objSolve)
        If objPrintout Is Nothing Then Return
        Dim stField As FieldInfo = objPrintout.GetType().GetField("st",
            BindingFlags.Public Or BindingFlags.Instance)
        If stField Is Nothing Then Return
        Dim stArr As Array = TryCast(stField.GetValue(objPrintout), Array)
        If stArr Is Nothing OrElse stArr.Rank <> 4 Then Return
        Dim stTyped As Double(,,,) = CType(stArr, Double(,,,))
        Dim lastT As Integer = stArr.GetLength(3) - 1
        For e As Integer = 1 To stArr.GetLength(0) - 1
            For c As Integer = 1 To Math.Min(6, stArr.GetLength(1) - 1)
                For g As Integer = 1 To Math.Min(8, stArr.GetLength(2) - 1)
                    Dim v As Double = stTyped(e, c, g, lastT)
                    If Math.Abs(v) > peakAbs Then
                        peakAbs = Math.Abs(v) : peakElem = e
                    End If
                Next
            Next
        Next
    End Sub

End Module
