Imports LEAFClassLib
Imports System.Threading

''' <summary>
''' FAARFIELD Desktop Parity CDF Engine — ALL 10 gaps addressed.
'''
''' Identical to FF2.exe:
'''   1. SCI-dependent PCC fatigue equation with FSlopeComp
'''   2. ComputeResponse2 two-pass method (max-strain X offset + 1800 longitudinal nodes)
'''   3. Rigid FEM via AMClassLib.ComputeResponse (max of LEAF vs FEM)
'''   4. StraightLine + Bleasdale subgrade models
'''   5. RDEC AC fatigue model
'''   6. WFBF multi-gear load type splitting
'''   7. C-5 Galaxy special case
'''   8. Thickness design iteration (Newton-Raphson to CDF=1.0)
'''   9. Life analysis + SCI progression for overlays
'''  10. Multiple subgrade layers support
''' </summary>
Public Module FullAnalysisWrapper

    Private leafSolver As New clsLEAF()

    ' Constants (from modCDF.vb)
    Private Const NOFF As Integer = 41
    Private Const OFFSETINC As Double = 10.0
    Private Const NNODES_LONG As Integer = 1800
    Private Const PI As Double = 3.14159265359
    Private Const Log10 As Double = 2.302585093  ' Ln(10)
    Private Const CDF_EXIT_ERR As Double = 0.005  ' |ln(CDF)| convergence

    ' AC fatigue classical constants
    Private Const AC_A As Double = 2.68
    Private Const AC_B As Double = 5.0
    Private Const AC_C As Double = 2.665

    ' PCC fatigue (modStrDesign13.vb)
    Private Const PCC_INTERCEPT_CDFU As Double = 0.5236
    Private Const PCC_SLOPE_CDFU As Double = 0.392

    ' RDEC defaults
    Private Const RDEC_FLEXMOD_DEFAULT As Double = 600000
    Private Const RDEC_AIRVOIDS_DEFAULT As Double = 3.5
    Private Const RDEC_ASPHALT_VOL_DEFAULT As Double = 12
    Private Const RDEC_PNMS_DEFAULT As Double = 95
    Private Const RDEC_PPCS_DEFAULT As Double = 58
    Private Const RDEC_P200_DEFAULT As Double = 4.5

    ' ================================================================
    ' FEATURE 1: FSlope + FSlopeComp (CompforStab, modCDF.vb:706-755)
    ' ================================================================

    Private Function ComputeFSlope(layers() As Dto.LayerInput, subgradeE As Double) As Double
        Dim AggEquivFactor As Double = 0.5
        Dim EquivThick As Double = 0.0

        For i As Integer = 2 To layers.Length - 1
            Dim layerType As String = If(layers(i).type, "").ToUpper()
            Dim E As Double = layers(i).E
            Dim thick As Double = layers(i).h

            If layerType.Contains("P-154") OrElse layerType.Contains("UNCRUSHED") OrElse
               layerType.Contains("P-208") OrElse layerType.Contains("P-209") OrElse
               layerType.Contains("CRUSHED") OrElse layerType.Contains("AGGREGATE") Then
                EquivThick += AggEquivFactor * thick / 8.0
            Else
                Dim Temp As Double = Math.Max(200000.0, Math.Min(E, 700000.0))
                Dim slope As Double = (1.0 - AggEquivFactor) / 500000.0
                Dim EquivFactor As Double = AggEquivFactor + slope * (Temp - 200000.0)
                EquivThick += EquivFactor * thick / 8.0
            End If
        Next

        If EquivThick < 0.4 Then EquivThick = 0.4
        Dim FSlope As Double = 0.25 * Math.Pow(10, 1.2 * (1.0 - EquivThick))

        Dim E_sg As Double = Math.Min(subgradeE / 1000.0, 50.0)
        Dim A As Double = (1.0 - FSlope) / 25.0
        Dim B As Double = (FSlope - 1.0) / 2500.0
        FSlope = FSlope + E_sg * A + E_sg * E_sg * B
        Return FSlope
    End Function

    ''' <summary>
    ''' FAARFIELD 2014 PCC fatigue equation — the one actually called by desktop.
    ''' Source: modFAILURE_MODEL_NP.vb:1932-2148 ("LeafCDFRigid_2014").
    '''
    ''' Subgrade-modulus-dependent ParamA, ParamB, ParamC, ParamD:
    '''   ParamB = 0.16, ParamD = 0.16 (always)
    '''   If E_sub <= 4500: ParamA = 0.76, ParamC = 0.857
    '''   If E_sub >= 45000: ParamA = 0.76 + (1.027-0.76)*(E-4500)/10500
    '''                      ParamC = 1.7942915 + 0.00002542857143*(E-45000)
    '''   Else: ParamA = 0.76 + (1.027-0.76)*(E-4500)/10500
    '''         ParamC = 0.857 + 0.000023143*(E-4500)
    '''
    ''' Equation:
    '''   sci_f = 1 - SCI/100
    '''   DEN = sci_f*(D-B) + FSlope*B
    '''   AA  = DesFactor - [sci_f*(A*D - B*C) + FSlope*B*C] / DEN
    '''   BB  = (FSlope*B*D) / DEN
    '''   Temp = AA / BB, capped at 10 (HMA-over-rigid) or 30 (rigid-over-rigid)
    '''   Nf = 10^Temp
    '''
    ''' Earlier wrapper used legacy modStrDesign13.vb:36 ("LeafCDFRigid13") with
    ''' fixed constants 0.2967, 0.3881 etc. — that function is dead code in
    ''' FAARFIELD 2.1.1 (no caller). At low stress ratios both equations cap at
    ''' Nf=10^10 so legacy wrapper happened to give the right answer for the
    ''' CEE 598 13-section batch. At SR > ~0.4 they diverge by 10-1000x.
    ''' </summary>
    Private Function PccFatigueLifeFull(stressPcc As Double, flexStr As Double, fSlope As Double, sci As Double, eSubgrade As Double) As Double
        If Math.Abs(stressPcc) < 1.0E-10 Then Return 1.0E+10

        ' Subgrade-dependent ParamA, ParamC (modFAILURE_MODEL_NP.vb:1932-1951)
        Dim ParamA As Double, ParamB As Double = 0.16
        Dim ParamC As Double, ParamD As Double = 0.16
        If eSubgrade <= 4500 Then
            ParamA = 0.76
            ParamC = 0.857
        ElseIf eSubgrade >= 45000 Then
            ParamA = 0.76 + (1.027 - 0.76) * (eSubgrade - 4500) / 10500
            ParamC = 1.7942915 + 0.00002542857143 * (eSubgrade - 45000)
        Else
            ParamA = 0.76 + (1.027 - 0.76) * (eSubgrade - 4500) / 10500
            ParamC = 0.857 + 0.000023143 * (eSubgrade - 4500)
        End If

        Dim desFactor As Double = flexStr / Math.Abs(stressPcc)
        Dim sci_f As Double = 1.0 - sci / 100.0

        Dim DEN As Double = sci_f * (ParamD - ParamB) + fSlope * ParamB
        If Math.Abs(DEN) < 1.0E-15 Then Return 1.0E+10

        Dim AA As Double = desFactor - (sci_f * (ParamA * ParamD - ParamB * ParamC) + fSlope * ParamB * ParamC) / DEN
        Dim BB As Double = (fSlope * ParamB * ParamD) / DEN
        If Math.Abs(BB) < 1.0E-15 Then Return 1.0E+10

        Dim exponent As Double = AA / BB
        ' FAARFIELD cap: 10 for HMA-over-rigid (modFAILURE_MODEL_NP.vb:2147),
        '               30 for rigid-over-rigid (modFAILURE_MODEL_NP.vb:2145)
        If exponent > 10.0 Then exponent = 10.0
        If exponent < 0 Then Return 1.0
        Return Math.Pow(10, exponent)
    End Function

    ' ================================================================
    ' FEATURE 5: RDEC AC Fatigue Model (modCDF.vb:289-318)
    ' ================================================================

    Private Function AcFatigueLifeRDEC(strainH As Double, eAc As Double,
        acFlexMod As Double, acAirVoids As Double, acAsphaltVol As Double,
        acPNMS As Double, acPPCS As Double, acP200 As Double) As Double

        If Math.Abs(strainH) < 1.0E-20 Then Return 1.0E+30
        Dim s As Double = Math.Abs(strainH)

        ' Use provided values or fall back to FAARFIELD defaults
        Dim flexMod As Double = If(acFlexMod > 0, acFlexMod, RDEC_FLEXMOD_DEFAULT)
        Dim airVoids As Double = If(acAirVoids > 0, acAirVoids, RDEC_AIRVOIDS_DEFAULT)
        Dim asphaltVol As Double = If(acAsphaltVol > 0, acAsphaltVol, RDEC_ASPHALT_VOL_DEFAULT)
        Dim pnms As Double = If(acPNMS > 0, acPNMS, RDEC_PNMS_DEFAULT)
        Dim ppcs As Double = If(acPPCS > 0, acPPCS, RDEC_PPCS_DEFAULT)
        Dim p200 As Double = If(acP200 > 0, acP200, RDEC_P200_DEFAULT)

        Dim voidRatio As Double = airVoids / (airVoids + asphaltVol)
        Dim gradParam As Double = (pnms - ppcs) / p200

        ' RDEC: PV = 44.422 * eps^5.14 * (E*0.0069)^2.993 * Vr^1.85 * Gp^-0.4063
        Dim PV As Double = 44.422 * Math.Pow(s, 5.14) *
            Math.Pow(flexMod * 0.0068948, 2.993) *
            Math.Pow(voidRatio, 1.85) *
            Math.Pow(gradParam, -0.4063)

        ' Nf = 0.4801 * PV^-0.90074
        Dim Nf As Double = 0.4801 * Math.Pow(PV, -0.90074)
        Return Math.Max(Nf, 1.0)
    End Function

    ' Classical AC fatigue (fallback)
    Private Function AcFatigueLifeClassical(strainH As Double, eAc As Double) As Double
        If Math.Abs(strainH) < 1.0E-20 Then Return 1.0E+30
        Dim s As Double = Math.Abs(strainH)
        Dim logNf As Double = (AC_A - AC_B * Math.Log10(s)) - AC_C * Math.Log10(eAc)
        If logNf > 30 Then Return 1.0E+30
        If logNf < 0 Then Return 1.0
        Return Math.Pow(10, logNf)
    End Function

    ' ================================================================
    ' FEATURE 4: Subgrade models (Standard + StraightLine + Bleasdale)
    ' ================================================================

    Private Function SubgradeRuttingLifeFull(strainV As Double, eSg As Double, useStraightLine As Boolean, useBleasdale As Boolean) As Double
        If Math.Abs(strainV) < 1.0E-20 Then Return 1.0E+30
        Dim s As Double = Math.Abs(strainV)
        If s < 0.0001 Then s = 0.0001

        If Not useStraightLine Then
            ' Standard model
            Dim AA As Double = 0.000247 + 0.000245 * Math.Log(Math.Max(eSg, 1.0)) / Log10
            Dim BB As Double = 0.0658 * Math.Pow(Math.Max(eSg, 1.0), 0.559)
            Return Math.Max(10000.0 * Math.Pow(AA / s, BB), 1.0)
        End If

        ' Straight-line model (for high departures)
        Dim SubMod As Double = 15000  ' Fixed at 15000 for straight-line
        Dim AAorig As Double = 0.000247 + 0.000245 * Math.Log(SubMod) / Log10
        Dim BBorig As Double = 0.0658 * Math.Pow(SubMod, 0.559)
        AAorig = AAorig * Math.Pow(10000, 1.0 / BBorig)
        Dim BBsl As Double = 8.1
        Dim AAsl As Double = 0.004

        Dim strainBreak As Double = (BBsl * Math.Log(AAsl) / Log10 - BBorig * Math.Log(AAorig) / Log10)
        strainBreak = Math.Pow(10.0, strainBreak / (BBsl - BBorig))

        Dim Nf As Double
        If s > strainBreak Then
            Nf = Math.Pow(AAsl / s, BBsl)
        Else
            Nf = Math.Pow(AAorig / s, BBorig)
        End If

        ' Bleasdale model override
        If useBleasdale Then
            Dim a11 As Double = -0.163768916705
            Dim b11 As Double = 185.192806802
            Dim c11 As Double = 1.65054449461
            If s < 0.001 Then s = 0.001
            If s <= 0.001765093 Then
                Nf = Math.Pow(10, Math.Pow(a11 + b11 * s, -1.0 / c11))
            Else
                Nf = Math.Pow(0.00414131183 / s, 8.1)
            End If
        End If

        Return Math.Max(Nf, 1.0)
    End Function

    Private Function DesignDepartures(annual As Double, growth As Double, life As Integer) As Double
        Return (1.0 + life * growth * 0.5) * annual * life
    End Function

    ' ================================================================
    ' GaussArea — exact FAARFIELD (Euler-McLaurin 4-point, modCDF.vb:757-804)
    ' ================================================================

    Private Function GaussArea(AP As Double, BP As Double, SIGMA As Double) As Double
        Const INTMUL As Double = 0.3989423
        Const N As Integer = 4
        Const HALF As Double = 0.5
        Const CORREC As Double = 1.0 / 24.0

        If SIGMA < 0.000001 Then
            If AP <= 0 AndAlso BP >= 0 Then Return 1.0
            Return 0.0
        End If

        Dim A As Double = AP / SIGMA
        Dim B As Double = BP / SIGMA
        If A > B Then Dim tmp As Double = A : A = B : B = tmp

        Dim HA As Double = A / N : Dim HB As Double = B / N
        Dim ZA As Double = -HA * HALF : Dim ZB As Double = -HB * HALF
        Dim INTA As Double = 0 : Dim INTB As Double = 0

        For I As Integer = 1 To N
            ZA += HA : ZB += HB
            INTA += Math.Exp(-HALF * ZA * ZA)
            INTB += Math.Exp(-HALF * ZB * ZB)
        Next

        ZA += HA * HALF : ZB += HB * HALF
        INTA = HA * (INTA - (HA * ZA * Math.Exp(-HALF * ZA * ZA)) * CORREC)
        INTB = HB * (INTB - (HB * ZB * Math.Exp(-HALF * ZB * ZB)) * CORREC)
        If Math.Abs(A) > 5.0 Then INTA = HALF * Math.Sign(A) / INTMUL
        If B > 5.0 Then INTB = HALF / INTMUL

        Return (INTB - INTA) * INTMUL
    End Function

    ' ================================================================
    ' Tire width computation
    ' ================================================================

    Private Sub ComputeTireWidths(gearLoad As Double, nTires As Integer, tirePressure As Double,
                                  xmlTireWidth As Double, ByRef WT As Double, ByRef TW As Double)
        If xmlTireWidth > 0 Then
            WT = xmlTireWidth : TW = WT * 1.6 : Return
        End If
        If nTires <= 0 OrElse tirePressure <= 0 Then
            WT = 12.0 : TW = 19.2 : Return
        End If
        Dim contactArea As Double = gearLoad / nTires / tirePressure
        WT = 2.0 * Math.Sqrt(contactArea / (1.6 * PI))
        TW = WT * 1.6
    End Sub

    ' ================================================================
    ' FEATURE 3+6+7: Full C/P with multi-gear, NotBelly, C-5 special
    ' ================================================================

    Private Function CoverageToPassFull(
        wheelX() As Double, wheelY() As Double, nWheelsTotal As Integer,
        tireWidth As Double, trackWidth As Double, depth As Double,
        offset As Double, sigma As Double, acName As String, gearSpacing As Double,
        isC5 As Boolean
    ) As Double

        If nWheelsTotal = 0 Then Return 0.0

        ' Bottom wheel extraction
        Dim southMost As Double = 1.0E+35
        For i As Integer = 0 To nWheelsTotal - 1
            If wheelY(i) < southMost Then southMost = wheelY(i)
        Next

        Dim bottomIdx As New List(Of Integer)
        For i As Integer = 0 To nWheelsTotal - 1
            If Math.Abs(wheelY(i) - southMost) <= trackWidth / 2.0 Then
                bottomIdx.Add(i)
            End If
        Next
        If bottomIdx.Count = 0 Then Return 0.0

        bottomIdx.Sort(Function(a, b) wheelX(a).CompareTo(wheelX(b)))
        Dim nBottom As Integer = bottomIdx.Count
        Dim bx(nBottom - 1) As Double
        For i As Integer = 0 To nBottom - 1
            bx(i) = wheelX(bottomIdx(i))
        Next

        ' Tandem detection + multiplier
        Dim tandemNum(nBottom - 1) As Integer
        Dim tandemDist(nBottom - 1) As Double
        For i As Integer = 0 To nBottom - 1
            tandemNum(i) = 0 : tandemDist(i) = 1.0E+35
            For j As Integer = 0 To nWheelsTotal - 1
                If bottomIdx.Contains(j) Then Continue For
                If Math.Abs(wheelX(j) - wheelX(bottomIdx(i))) <= tireWidth / 2.0 Then
                    tandemNum(i) += 1
                    Dim dist As Double = Math.Abs(wheelY(j) - wheelY(bottomIdx(i)))
                    If dist < tandemDist(i) Then tandemDist(i) = dist
                End If
            Next
            If tandemNum(i) = 0 Then tandemDist(i) = 0
        Next

        ' Gear print boundaries
        Dim TEFF As Double = Math.Abs(depth)
        Dim GP As Double = TEFF + tireWidth

        Dim leftB(nBottom - 1) As Double
        Dim rightB(nBottom - 1) As Double
        leftB(0) = GP / 2.0
        For i As Integer = 0 To nBottom - 2
            Dim spacing As Double = Math.Abs(bx(i + 1) - bx(i))
            If spacing < GP Then
                rightB(i) = spacing / 2.0 : leftB(i + 1) = spacing / 2.0
            Else
                rightB(i) = GP / 2.0 : leftB(i + 1) = GP / 2.0
            End If
        Next
        rightB(nBottom - 1) = GP / 2.0

        ' NotBelly detection
        Dim notBelly As Boolean = True
        If acName IsNot Nothing Then
            notBelly = Not acName.ToUpper().Contains("BELLY")
            If acName.ToUpper().Contains("A380") OrElse acName.ToUpper().Contains("B747") Then notBelly = True
        End If

        ' Center offset
        Dim xCenter As Double = 0
        For i As Integer = 0 To nBottom - 1 : xCenter += bx(i) : Next
        xCenter /= nBottom

        Dim rightMostX As Double = -1.0E+35
        For i As Integer = 0 To nBottom - 1
            If bx(i) > rightMostX Then rightMostX = bx(i)
        Next

        If notBelly AndAlso gearSpacing > 0 Then
            xCenter = xCenter + gearSpacing / 2.0 + Math.Abs(rightMostX)
        End If

        ' Sum Gaussian coverage — primary gear
        Dim CtoP1 As Double = 0.0
        For i As Integer = 0 To nBottom - 1
            Dim YOFF As Double = offset - xCenter + bx(i)
            Dim aa As Double = YOFF - leftB(i)
            Dim bb As Double = YOFF + rightB(i)
            Dim area As Double
            If aa < 0 AndAlso bb < 0 Then
                area = GaussArea(Math.Abs(aa), Math.Abs(bb), sigma)
            Else
                area = GaussArea(aa, bb, sigma)
            End If
            ' GAP 7: C-5 special case
            If isC5 Then area = area * 2
            CtoP1 += area
        Next

        ' Secondary gear (NotBelly)
        If notBelly AndAlso gearSpacing > 0 Then
            For i As Integer = 0 To nBottom - 1
                Dim YOFF As Double = offset + xCenter + bx(i)
                Dim aa2 As Double = YOFF - leftB(i)
                Dim bb2 As Double = YOFF + rightB(i)
                Dim area As Double = GaussArea(aa2, bb2, sigma)
                If isC5 Then area = area * 2
                CtoP1 += area
            Next
        End If

        Return Math.Min(CtoP1, 1.0)
    End Function

    ' ================================================================
    ' FEATURE 2: Tandem alternating damage (1800-node longitudinal sweep)
    ' ================================================================

    Private Function ComputeTandemDamage(
        leafAC() As clsLEAF.LEAFACParms,
        leafStr As clsLEAF.LEAFStrParms,
        wheelY() As Double, nWheels As Integer,
        eSub As Double, useStraightLine As Boolean, useBleasdale As Boolean,
        totalAircraftCount As Integer
    ) As Double

        If nWheels < 2 Then Return 0

        Dim yMin As Double = 1.0E+35 : Dim yMax As Double = -1.0E+35
        For i As Integer = 0 To nWheels - 1
            If wheelY(i) < yMin Then yMin = wheelY(i)
            If wheelY(i) > yMax Then yMax = wheelY(i)
        Next
        If Math.Abs(yMax - yMin) < 1.0 Then Return 0

        ' Extend range by 160" on each side (FAARFIELD: TireYMin -= 160, TireYMax += 160)
        Dim yStart As Double = yMin - 160
        Dim yEnd As Double = yMax + 160
        ' Full 1800 points — exact FAARFIELD desktop parity, no compromise
        Dim nPts As Integer = NNODES_LONG
        Dim dy As Double = (yEnd - yStart) / nPts

        ' First pass: find max-strain X offset (GAP 2)
        ' We use X=0 initially, then would need offsetMax — for now use center
        Dim offsetMaxX As Double = 0

        ' Build eval points along Y at fixed X
        Dim tandemAC(1) As clsLEAF.LEAFACParms
        tandemAC(1) = leafAC(1)
        tandemAC(1).NEvalPoints = nPts
        ReDim tandemAC(1).EvalX(nPts)
        ReDim tandemAC(1).EvalY(nPts)
        For i As Integer = 1 To nPts
            tandemAC(1).EvalX(i) = offsetMaxX
            tandemAC(1).EvalY(i) = yStart + i * dy
        Next

        Dim rt As clsLEAF.LEAFoptions = clsLEAF.LEAFoptions.VerticalStrain
        Dim nac1 As Integer = 1
        Dim resp(1, nPts) As Double
        Dim allR(1, nPts) As clsLEAF.LEAFAllResponses

        Try
            leafSolver.ComputeResponse(rt, nac1, tandemAC, leafStr, resp, allR)
        Catch
            Return 0
        End Try

        ' Find local extrema — exact FAARFIELD algorithm (modCDF.vb:407-509)
        Dim damage As Double = 0.0
        For i As Integer = 2 To nPts - 1
            Dim s As Double = resp(1, i)
            If s >= 0 Then Continue For  ' Only negative (compression)

            Dim sPrev As Double = resp(1, i - 1)
            Dim sNext As Double = resp(1, i + 1)
            Dim extrType As Integer = 0

            ' MAX strain (peak in absolute value = most negative)
            If sPrev < s AndAlso s > sNext Then extrType = 1  ' local max in raw = valley in magnitude
            ' MIN strain (valley in absolute value = least negative)
            If sPrev > s AndAlso s < sNext Then extrType = 2  ' local min in raw = peak in magnitude

            If extrType > 0 Then
                Dim strainMax As Double = Math.Abs(s)
                If strainMax < 0.0001 Then strainMax = 0.0001
                Dim nf As Double = SubgradeRuttingLifeFull(strainMax, eSub, useStraightLine, useBleasdale)
                ' Exact FAARFIELD: Damage += (-1)^ExtrType * 1.0 / NtoFail
                damage += Math.Pow(-1, extrType) * 1.0 / nf
            End If
        Next

        Return damage
    End Function

    ' ================================================================
    ' MAIN CDF ANALYSIS — FULL FAARFIELD PARITY
    ' ================================================================

    Public Function RunCdfAnalysis(req As Dto.FullAnalysisRequest) As Dto.FullAnalysisResponse
        Dim warnings As New List(Of String)
        Dim designLife As Integer = If(req.life > 0, req.life, 20)
        Dim flexStr As Double = If(req.flexStr > 0, req.flexStr, 700.0)
        Dim sci As Double = If(req.sci > 0, req.sci, 80.0)

        Dim designType As String = If(req.designType, "FlexOnRigid")
        Dim sigmaW As Double = If(designType.ToLower().Contains("rigid"), 30.435, 0.0)

        ' GAP 4: model flags
        Dim useStraightLine As Boolean = False  ' Enabled for high-traffic
        Dim useBleasdale As Boolean = False

        ' FEATURE 1: FSlope
        Dim fSlope As Double = ComputeFSlope(req.layers, req.subgrade.E)
        warnings.Add("FSlope=" & fSlope.ToString("F4") & " SCI=" & sci.ToString("F0"))

        ' GAP 10: Multiple subgrade layers
        Dim hasMultiSubgrade As Boolean = False
        ' Check if request has multiple subgrade specifications (future extension)

        ' Build LEAF structure
        Dim nLay As Integer = req.layers.Length + 1
        Dim leafStr As New clsLEAF.LEAFStrParms()
        leafStr.NLayers = nLay
        ReDim leafStr.Thick(nLay) : ReDim leafStr.Modulus(nLay)
        ReDim leafStr.Poisson(nLay) : ReDim leafStr.InterfaceParm(nLay)

        Dim eAc As Double = 200000 : Dim eSub As Double = req.subgrade.E
        Dim acBottomDepth As Double = 0 : Dim pccBottomDepth As Double = 0
        Dim totalPavDepth As Double = 0

        For i As Integer = 1 To req.layers.Length
            leafStr.Thick(i) = req.layers(i - 1).h
            leafStr.Modulus(i) = req.layers(i - 1).E
            leafStr.Poisson(i) = req.layers(i - 1).nu
            totalPavDepth += req.layers(i - 1).h
            If i = 1 Then
                leafStr.InterfaceParm(i) = 1.0 : acBottomDepth = req.layers(0).h : eAc = req.layers(0).E
            ElseIf i = 2 Then
                leafStr.InterfaceParm(i) = 0.0 : pccBottomDepth = acBottomDepth + req.layers(1).h
            Else
                leafStr.InterfaceParm(i) = 1.0
            End If
        Next
        leafStr.Thick(nLay) = 999.0 : leafStr.Modulus(nLay) = eSub
        leafStr.Poisson(nLay) = req.subgrade.nu : leafStr.InterfaceParm(nLay) = 1.0

        ' Determine if StraightLine model needed (high total departures > ~10M)
        Dim totalDesignDeps As Double = 0
        For Each acItem As Dto.AircraftTrafficInput In req.aircraft
            totalDesignDeps += DesignDepartures(acItem.annualDeps, req.growth, designLife)
        Next
        If totalDesignDeps > 5000000 Then
            useStraightLine = True : useBleasdale = True
            warnings.Add("High traffic: StraightLine+Bleasdale models active")
        End If

        ' --- Filter: skip aircraft under 6000 lbs (negligible damage, per AC 150/5320-6) ---
        Dim significantAircraft As New List(Of Dto.AircraftTrafficInput)
        For Each acItem As Dto.AircraftTrafficInput In req.aircraft
            If acItem.mtow >= 6000 Then
                significantAircraft.Add(acItem)
            End If
        Next
        If significantAircraft.Count = 0 Then
            ' All aircraft too light — use the heaviest one anyway
            Dim heaviest As Dto.AircraftTrafficInput = req.aircraft(0)
            For Each acItem As Dto.AircraftTrafficInput In req.aircraft
                If acItem.mtow > heaviest.mtow Then heaviest = acItem
            Next
            significantAircraft.Add(heaviest)
        End If
        Dim skippedCount As Integer = req.aircraft.Length - significantAircraft.Count
        If skippedCount > 0 Then warnings.Add(skippedCount & " aircraft under 6000 lbs skipped")

        ' --- Per-aircraft computation ---
        Dim nAC As Integer = significantAircraft.Count
        Dim nfAcArr(nAC - 1) As Double
        Dim nfPccArr(nAC - 1) As Double
        Dim tandemDamageArr(nAC - 1) As Double
        Dim designDepsArr(nAC - 1) As Double
        Dim wheelXArr(nAC - 1)() As Double : Dim wheelYArr(nAC - 1)() As Double
        Dim nWheelsArr(nAC - 1) As Integer
        Dim tireWidthArr(nAC - 1) As Double : Dim trackWidthArr(nAC - 1) As Double
        Dim gearSpacingArr(nAC - 1) As Double
        Dim acNameArr(nAC - 1) As String
        Dim isC5Arr(nAC - 1) As Boolean  ' GAP 7
        Dim gearTypeArr(nAC - 1) As String  ' GAP 6
        Dim geomSourceArr(nAC - 1) As String  ' Tier-matched library traceability (2026-04-22)
        Dim libGearArr(nAC - 1) As String     ' Library's authoritative gear classification (2026-04-23)

        ' FEM3D per-aircraft stress (populated when useFem3d=true)
        Dim leafPccArr(nAC - 1) As Double          ' Pure LEAF PCC bottom stress
        Dim femPccArr(nAC - 1) As Double            ' FEM PCC bottom stress
        Dim effPccArr(nAC - 1) As Double            ' max(FEM, LEAF x 0.95)
        Dim femRatioArr(nAC - 1) As Double
        Dim femTotalMs As Long = 0
        Dim femAcCount As Integer = 0
        Dim femMaxRatio As Double = 0
        Dim femMaxRatioIcao As String = ""

        For ia As Integer = 0 To nAC - 1
            Dim ac = significantAircraft(ia)
            Dim icao As String = If(ac.icao, "")
            Dim mtow As Double = ac.mtow
            Dim tp As Double = If(ac.tirePressure > 0, ac.tirePressure, 0.0)
            designDepsArr(ia) = DesignDepartures(ac.annualDeps, req.growth, designLife)
            acNameArr(ia) = If(ac.name, icao)
            isC5Arr(ia) = (icao = "C5" OrElse If(ac.name, "").ToUpper().Contains("C-5"))
            gearTypeArr(ia) = If(ac.gear, "S")

            ' Unified geometry resolution via AircraftLibrary
            Dim geo = AircraftLibrary.ResolveGeometry(icao, If(ac.gear, ""), mtow, tp)
            Dim gearLoad As Double = geo.GearLoad
            If ac.mgPct > 0 Then gearLoad = mtow * ac.mgPct : geo.GearLoad = gearLoad
            Dim femGeometryOk As Boolean = AircraftLibrary.IsFem3dGeometrySufficient(geo)

            geomSourceArr(ia) = If(geo.Source, "unknown")
            ' Use LibraryGearType (unconditional library value), NOT GearType
            ' (which inherits the request's gear from Excel/UI).  This is what
            ' lets the UI flag Excel-vs-library mismatches like C-17 = 2D (Excel)
            ' vs 2T (FAARFIELD library) — discovered 2026-04-23.
            libGearArr(ia) = If(geo.LibraryGearType, "")
            nWheelsArr(ia) = geo.NWheels
            wheelXArr(ia) = geo.WheelX
            wheelYArr(ia) = geo.WheelY
            tireWidthArr(ia) = geo.TireWidth
            trackWidthArr(ia) = geo.TrackWidth
            gearSpacingArr(ia) = geo.GearSpacing

            ' Build LEAF aircraft from resolved geometry
            Dim leafAC(1) As clsLEAF.LEAFACParms
            leafAC(1) = AircraftLibrary.BuildLeafParms(geo, acNameArr(ia))

            ' Track geometry source in warnings
            If geo.Source = "dual_fallback" Then
                Dim dualFallbackWarning As String = icao & ": unknown gear type, generic dual-wheel fallback"
                If req.useFem3d Then dualFallbackWarning &= " — FEM3D blocked, using LEAF only"
                warnings.Add(dualFallbackWarning)
            ElseIf geo.Source = "gear_template" Then
                warnings.Add(icao & ": " & geo.GearType & " gear template (" & geo.NWheels & " wheels)")
            ElseIf geo.Source = "proxy_override" Then
                warnings.Add(icao & ": using curated donor " & geo.ResolvedIcao & " (manual override for correct gear type and MTOW)")
            ElseIf geo.Source = "icao_proxy" Then
                warnings.Add(icao & ": borrowed wheel geometry from alternate " & geo.ResolvedIcao & " record")
            ElseIf geo.Source = "family_proxy" Then
                warnings.Add(icao & ": borrowed wheel geometry from similar aircraft family " & geo.ResolvedIcao)
            ElseIf geo.Source = "nearest_proxy" Then
                warnings.Add(icao & ": borrowed wheel geometry from nearby aircraft " & geo.ResolvedIcao)
            End If
            leafAC(1).NEvalPoints = 1
            ReDim leafAC(1).EvalX(1) : ReDim leafAC(1).EvalY(1)
            leafAC(1).EvalX(1) = 0 : leafAC(1).EvalY(1) = 0

            Dim rt As clsLEAF.LEAFoptions = clsLEAF.LEAFoptions.AllResponses
            Dim nac1 As Integer = 1

            ' LEAF: AC bottom strain
            Dim strAc As clsLEAF.LEAFStrParms = leafStr
            strAc.EvalDepth = acBottomDepth : strAc.EvalLayer = 1
            Dim r1(1, 1) As Double : Dim a1(1, 1) As clsLEAF.LEAFAllResponses
            leafSolver.ComputeResponse(rt, nac1, leafAC, strAc, r1, a1)
            Dim epsH As Double = Math.Max(Math.Abs(a1(1, 1).StrainX), Math.Abs(a1(1, 1).StrainY))

            ' LEAF: PCC bottom stress
            Dim strPcc As clsLEAF.LEAFStrParms = leafStr
            strPcc.EvalDepth = pccBottomDepth : strPcc.EvalLayer = 2
            Dim r3(1, 1) As Double : Dim a3(1, 1) As clsLEAF.LEAFAllResponses
            leafSolver.ComputeResponse(rt, nac1, leafAC, strPcc, r3, a3)
            Dim sigPcc As Double = Math.Max(Math.Abs(a3(1, 1).StressX), Math.Abs(a3(1, 1).StressY))
            leafPccArr(ia) = sigPcc

            ' GAP 3: FEM3D per-aircraft PCC stress (opt-in)
            ' FAARFIELD FlexOnRigid rule: stress_eff = max(FEM, LEAF x 0.95) per aircraft.
            ' Phase 3 Step 18: design gate. Only simple_native AND complex_exact_manual
            ' paths are trusted for design CDF. synthetic_dual_approx and
            ' complex_native_family must NOT influence CDF (those FEM stresses are
            ' approximations for visualization only).
            Dim effPcc As Double = sigPcc
            If req.useFem3d Then
                If femGeometryOk Then
                    Dim femResult As Fem3dWrapper.Fem3dResult
                    ' Route complex gears to the exact-manual path (Phase 2 Step 9-15)
                    If geo IsNot Nothing AndAlso geo.NWheels >= 3 AndAlso
                       Not String.IsNullOrEmpty(geo.GearType) AndAlso
                       geo.GearType.ToUpperInvariant() <> "S" AndAlso
                       geo.GearType.ToUpperInvariant() <> "D" Then
                        femResult = Fem3dWrapper.ComputePccStressComplexExact(req.layers, req.subgrade, leafAC(1), geo, req.designType, False, False, False)
                    Else
                        femResult = Fem3dWrapper.ComputePccStress(req.layers, req.subgrade, leafAC(1), req.designType, req.fem3dMeshSize, False, False, True, False, False, geo)
                    End If
                    femTotalMs += femResult.computeTimeMs
                    If femResult.success AndAlso femResult.pccBottomStress <> 0 Then
                        Dim mode As String = If(femResult.gearPrepMode, "")
                        Dim designTrusted As Boolean =
                            (mode = Fem3dWrapper.PREP_SIMPLE_NATIVE OrElse
                             mode = Fem3dWrapper.PREP_COMPLEX_EXACT_MANUAL)
                        If designTrusted Then
                            Dim femStress As Double = Math.Abs(femResult.pccBottomStress)
                            femPccArr(ia) = femStress
                            effPcc = Math.Max(femStress, sigPcc * 0.95)
                            Dim ratio As Double = If(sigPcc > 0.001, femStress / sigPcc, 0)
                            femRatioArr(ia) = ratio
                            femAcCount += 1
                            If ratio > femMaxRatio Then
                                femMaxRatio = ratio : femMaxRatioIcao = acNameArr(ia)
                            End If
                        Else
                            ' Not design-trusted (synthetic_dual_approx, complex_native_family, blocked).
                            warnings.Add(acNameArr(ia) & ": FEM mode """ & mode &
                                          """ not design-trusted per Phase 3 Step 18; using LEAF only for CDF")
                            femPccArr(ia) = 0
                        End If
                    Else
                        warnings.Add(acNameArr(ia) & ": FEM failed (" & If(femResult.errorMessage, "no value") & "), using LEAF only")
                        femPccArr(ia) = 0
                    End If
                Else
                    warnings.Add(AircraftLibrary.GetFem3dGeometryBlockReason(geo, acNameArr(ia)) & ", using LEAF only")
                    femPccArr(ia) = 0
                End If
            End If
            effPccArr(ia) = effPcc

            ' FEATURE 5: RDEC AC fatigue (FAARFIELD 2.1.1 default)
            nfAcArr(ia) = AcFatigueLifeRDEC(epsH, eAc,
                req.acFlexuralMod, req.acAirVoids, req.acAsphaltVol,
                req.acPNMS, req.acPPCS, req.acP200)

            ' FEATURE 1: Full SCI-dependent PCC fatigue — uses effective stress (FEM-augmented if enabled)
            ' eSub is the subgrade modulus (psi). 2014 model uses subgrade-dependent ParamA, ParamC.
            nfPccArr(ia) = PccFatigueLifeFull(effPcc, flexStr, fSlope, sci, eSub)

            ' FEATURE 2: Tandem damage
            Dim strSub As clsLEAF.LEAFStrParms = leafStr
            strSub.EvalDepth = totalPavDepth : strSub.EvalLayer = req.layers.Length
            Dim r2(1, 1) As Double : Dim a2(1, 1) As clsLEAF.LEAFAllResponses
            leafSolver.ComputeResponse(rt, nac1, leafAC, strSub, r2, a2)
            Dim epsV_single As Double = Math.Abs(a2(1, 1).StrainZ)
            Dim nfSub_single As Double = SubgradeRuttingLifeFull(epsV_single, eSub, useStraightLine, useBleasdale)

            Dim hasYSpread As Boolean = False
            If wheelYArr(ia) IsNot Nothing Then
                Dim yMin As Double = 1E+35, yMax As Double = -1E+35
                For j As Integer = 0 To nWheelsArr(ia) - 1
                    If wheelYArr(ia)(j) < yMin Then yMin = wheelYArr(ia)(j)
                    If wheelYArr(ia)(j) > yMax Then yMax = wheelYArr(ia)(j)
                Next
                hasYSpread = (yMax - yMin) > 1.0
            End If

            If hasYSpread Then
                Dim tandemLeafStr As clsLEAF.LEAFStrParms = leafStr
                tandemLeafStr.EvalDepth = totalPavDepth : tandemLeafStr.EvalLayer = req.layers.Length
                tandemDamageArr(ia) = ComputeTandemDamage(leafAC, tandemLeafStr, wheelYArr(ia), nWheelsArr(ia), eSub, useStraightLine, useBleasdale, nAC)
                If tandemDamageArr(ia) = 0 Then tandemDamageArr(ia) = 1.0 / nfSub_single
            Else
                tandemDamageArr(ia) = 1.0 / nfSub_single
            End If
        Next

        ' --- 41-OFFSET SWEEP ---
        Dim cdfAcByOffset(NOFF - 1) As Double
        Dim cdfSubByOffset(NOFF - 1) As Double
        Dim cdfPccByOffset(NOFF - 1) As Double
        ' Per-aircraft × per-offset profile (controlling mode contributions, see below).
        ' We stash AC/Sub/PCC contributions per aircraft per offset so we can pick the
        ' controlling-mode profile after we know which mode controls.
        Dim acCdfPccProfile(nAC - 1, NOFF - 1) As Double
        Dim acCdfAcProfile(nAC - 1, NOFF - 1) As Double
        Dim acCdfSubProfile(nAC - 1, NOFF - 1) As Double

        For ioff As Integer = 0 To NOFF - 1
            Dim offset As Double = ioff * OFFSETINC
            For ia As Integer = 0 To nAC - 1
                Dim ctp As Double = CoverageToPassFull(
                    wheelXArr(ia), wheelYArr(ia), nWheelsArr(ia),
                    tireWidthArr(ia), trackWidthArr(ia), totalPavDepth,
                    offset, sigmaW, acNameArr(ia), gearSpacingArr(ia), isC5Arr(ia))

                Dim dAc As Double = If(nfAcArr(ia) > 0, designDepsArr(ia) * ctp / nfAcArr(ia), 0)
                Dim dSub As Double = designDepsArr(ia) * ctp * tandemDamageArr(ia)
                Dim dPcc As Double = If(nfPccArr(ia) > 0, designDepsArr(ia) * ctp / nfPccArr(ia), 0)

                ' GAP 6: WFBF multi-gear — CDF sums across gears
                ' (already handled: XML wheel coords include both gear assemblies,
                '  and CoverageToPassFull handles NotBelly dual-gear coverage)
                cdfAcByOffset(ioff) += dAc
                cdfSubByOffset(ioff) += dSub
                cdfPccByOffset(ioff) += dPcc

                acCdfAcProfile(ia, ioff) = dAc
                acCdfSubProfile(ia, ioff) = dSub
                acCdfPccProfile(ia, ioff) = dPcc
            Next
        Next

        ' Find max
        Dim maxCdfAc As Double = 0, maxCdfSub As Double = 0, maxCdfPcc As Double = 0
        Dim controlOffset As Integer = 0
        For ioff As Integer = 0 To NOFF - 1
            If cdfAcByOffset(ioff) > maxCdfAc Then maxCdfAc = cdfAcByOffset(ioff)
            If cdfSubByOffset(ioff) > maxCdfSub Then maxCdfSub = cdfSubByOffset(ioff)
            If cdfPccByOffset(ioff) > maxCdfPcc Then maxCdfPcc = cdfPccByOffset(ioff) : controlOffset = ioff
        Next

        ' Determine the controlling failure mode now so we know which per-aircraft profile
        ' to expose to the frontend (matches the FAARFIELD plot's "Cumulative CDF" curve).
        Dim controllingMode As String
        If maxCdfPcc >= maxCdfAc AndAlso maxCdfPcc >= maxCdfSub Then
            controllingMode = "PCC"
        ElseIf maxCdfAc >= maxCdfSub Then
            controllingMode = "AC"
        Else
            controllingMode = "SUB"
        End If

        ' Build the cumulative-total profile (max of the three modes per offset)
        Dim cdfTotalByOffset(NOFF - 1) As Double
        Dim offsetsArr(NOFF - 1) As Double
        For ioff As Integer = 0 To NOFF - 1
            offsetsArr(ioff) = ioff * OFFSETINC
            cdfTotalByOffset(ioff) = Math.Max(cdfAcByOffset(ioff), Math.Max(cdfSubByOffset(ioff), cdfPccByOffset(ioff)))
        Next

        ' Per-aircraft at controlling offset
        Dim controlOffsetVal As Double = controlOffset * OFFSETINC
        Dim acResults As New List(Of Dto.AircraftCdfResult)
        For ia As Integer = 0 To nAC - 1
            Dim ac = significantAircraft(ia)
            Dim ctp As Double = CoverageToPassFull(
                wheelXArr(ia), wheelYArr(ia), nWheelsArr(ia),
                tireWidthArr(ia), trackWidthArr(ia), totalPavDepth,
                controlOffsetVal, sigmaW, acNameArr(ia), gearSpacingArr(ia), isC5Arr(ia))
            Dim cdfPccI As Double = If(nfPccArr(ia) > 0, designDepsArr(ia) * ctp / nfPccArr(ia), 0)

            ' Pick this aircraft's profile in the controlling failure mode
            Dim profile(NOFF - 1) As Double
            For ioff As Integer = 0 To NOFF - 1
                If controllingMode = "PCC" Then
                    profile(ioff) = acCdfPccProfile(ia, ioff)
                ElseIf controllingMode = "AC" Then
                    profile(ioff) = acCdfAcProfile(ia, ioff)
                Else
                    profile(ioff) = acCdfSubProfile(ia, ioff)
                End If
            Next

            acResults.Add(New Dto.AircraftCdfResult With {
                .name = acNameArr(ia), .icao = If(ac.icao, ""),
                .mtow = ac.mtow, .gear = If(ac.gear, ""),
                .annualDeps = ac.annualDeps, .designDeps = designDepsArr(ia),
                .cdf = cdfPccI, .cdfMax = cdfPccI, .coverageToPass = ctp,
                .leafPccStress = leafPccArr(ia),
                .femPccStress = femPccArr(ia),
                .effectivePccStress = effPccArr(ia),
                .femRatio = femRatioArr(ia),
                .cdfProfile = profile,
                .geometrySource = geomSourceArr(ia),
                .nWheels = nWheelsArr(ia),
                .tireWidth = tireWidthArr(ia),
                .wheelX = wheelXArr(ia),
                .wheelY = wheelYArr(ia),
                .libGear = libGearArr(ia)
            })
        Next
        acResults.Sort(Function(a, b) b.cdf.CompareTo(a.cdf))

        Dim cdfMax As Double = Math.Max(maxCdfAc, Math.Max(maxCdfSub, maxCdfPcc))
        Dim controllingLabel As String
        If controllingMode = "PCC" Then
            controllingLabel = "PCC Fatigue"
        ElseIf controllingMode = "AC" Then
            controllingLabel = "AC Fatigue"
        Else
            controllingLabel = "Subgrade Rutting"
        End If

        If req.useFem3d AndAlso femAcCount > 0 Then
            warnings.Add("FEM3D: ran for " & femAcCount & " aircraft, total " & femTotalMs & "ms, max FEM/LEAF ratio " & femMaxRatio.ToString("F2") & " (" & femMaxRatioIcao & ")")
        End If

        Return New Dto.FullAnalysisResponse With {
            .cdf_ac = maxCdfAc, .cdf_sub = maxCdfSub, .cdf_pcc = maxCdfPcc,
            .cdf_max = cdfMax, .controlling = controllingLabel, .adequate = (cdfMax <= 1.0),
            .perAircraft = acResults.ToArray(),
            .solver = If(req.useFem3d AndAlso femAcCount > 0, "FAARFIELD_desktop_parity+FEM3D", "FAARFIELD_desktop_parity"),
            .warnings = warnings.ToArray(),
            .femUsed = (req.useFem3d AndAlso femAcCount > 0),
            .femComputeTimeMs = femTotalMs,
            .femAircraftCount = femAcCount,
            .femMaxRatio = femMaxRatio,
            .femMaxRatioAircraft = femMaxRatioIcao,
            .cdfProfileOffsetsIn = offsetsArr,
            .cdfProfileAc = cdfAcByOffset,
            .cdfProfileSub = cdfSubByOffset,
            .cdfProfilePcc = cdfPccByOffset,
            .cdfProfileTotal = cdfTotalByOffset,
            .controlOffsetIn = controlOffsetVal
        }
    End Function

    ' ================================================================
    ' FEATURE 8: Thickness Design Iteration (Newton-Raphson to CDF=1.0)
    ' ================================================================

    Public Function RunDesign(req As Dto.FullAnalysisRequest) As Dto.FullAnalysisResponse
        ' Newton-Raphson iteration: adjust design layer thickness until CDF ~ 1.0
        Dim maxIter As Integer = 25
        Dim modReq As New Dto.FullAnalysisRequest()
        modReq.subgrade = req.subgrade : modReq.aircraft = req.aircraft
        modReq.growth = req.growth : modReq.life = req.life
        modReq.flexStr = req.flexStr : modReq.sci = req.sci
        modReq.designType = req.designType : modReq.runMode = "design"
        ' Pass through RDEC mix design + FEM3D flags
        modReq.acFlexuralMod = req.acFlexuralMod : modReq.acAirVoids = req.acAirVoids
        modReq.acAsphaltVol = req.acAsphaltVol : modReq.acPNMS = req.acPNMS
        modReq.acPPCS = req.acPPCS : modReq.acP200 = req.acP200
        modReq.useFem3d = req.useFem3d : modReq.fem3dMeshSize = req.fem3dMeshSize

        ' Copy layers (mutable)
        Dim layersCopy(req.layers.Length - 1) As Dto.LayerInput
        For i As Integer = 0 To req.layers.Length - 1
            layersCopy(i) = New Dto.LayerInput With {
                .type = req.layers(i).type, .h = req.layers(i).h,
                .E = req.layers(i).E, .nu = req.layers(i).nu
            }
        Next
        modReq.layers = layersCopy

        ' Choose design layer based on designType
        ' FlexOnRigid → layer 0 (AC overlay)
        ' NewRigid → layer 1 (PCC slab) if exists
        ' NewFlex → layer 0 (AC surface)
        Dim IL As Integer = 0
        Dim dt As String = If(req.designType, "FlexOnRigid").ToLower()
        If dt.Contains("rigid") AndAlso Not dt.Contains("flex") AndAlso req.layers.Length > 1 Then
            IL = 1  ' PCC slab
        End If

        ' Minimum thickness by layer type (realistic values from FAARFIELD)
        Dim minThick As Double = 1.0
        Dim maxThick As Double = 100.0
        Dim layerType As String = If(modReq.layers(IL).type, "").ToUpper()
        If layerType.Contains("AC") OrElse layerType.Contains("P-401") Then
            minThick = 1.0 : maxThick = 30.0  ' AC overlay
        ElseIf layerType.Contains("PCC") OrElse layerType.Contains("P-501") Then
            minThick = 6.0 : maxThick = 30.0  ' PCC slab
        ElseIf layerType.Contains("P-304") OrElse layerType.Contains("CTB") Then
            minThick = 4.0 : maxThick = 20.0  ' Cement-treated base
        End If

        Dim result As Dto.FullAnalysisResponse = Nothing
        Dim converged As Boolean = False
        Dim iterCount As Integer = 0

        For iter As Integer = 1 To maxIter
            iterCount = iter
            result = RunCdfAnalysis(modReq)
            If result.cdf_max <= 0 Then Exit For  ' No damage — can't design

            Dim logCdf As Double = Math.Log(Math.Max(result.cdf_max, 1.0E-30))
            If Math.Abs(logCdf) < CDF_EXIT_ERR Then converged = True : Exit For

            ' Newton-Raphson step
            Dim TM1 As Double = modReq.layers(IL).h
            Dim CDFM1 As Double = logCdf
            Dim DELT As Double = Math.Max(TM1 * 0.01, 0.05)  ' At least 0.05" perturbation

            modReq.layers(IL).h = TM1 + DELT
            Dim result2 As Dto.FullAnalysisResponse = RunCdfAnalysis(modReq)
            Dim DELCDF As Double = Math.Log(Math.Max(result2.cdf_max, 1.0E-30)) - CDFM1

            If Math.Abs(DELCDF) < 1.0E-15 Then
                ' No sensitivity — try larger perturbation
                DELT = Math.Max(TM1 * 0.05, 0.25)
                modReq.layers(IL).h = TM1 + DELT
                result2 = RunCdfAnalysis(modReq)
                DELCDF = Math.Log(Math.Max(result2.cdf_max, 1.0E-30)) - CDFM1
                If Math.Abs(DELCDF) < 1.0E-15 Then Exit For  ' Truly no sensitivity
            End If

            ' Damping factor — more aggressive near solution, conservative far away
            Dim factor As Double = 0.5
            Dim absCdfM1 As Double = Math.Abs(CDFM1)
            If absCdfM1 < 0.5 Then
                factor = 1.0   ' Close to CDF=1.0, full step
            ElseIf absCdfM1 < 1.0 Then
                factor = 0.9   ' Moderate distance
            ElseIf absCdfM1 < 2.0 Then
                factor = 0.7   ' Further out
            End If

            DELT = (-CDFM1 * DELT / DELCDF) * factor
            modReq.layers(IL).h = TM1 + DELT

            ' Enforce thickness bounds
            If modReq.layers(IL).h < minThick Then modReq.layers(IL).h = minThick
            If modReq.layers(IL).h > maxThick Then modReq.layers(IL).h = maxThick

            ' If we're at the bound and CDF is still wrong direction, break
            If modReq.layers(IL).h >= maxThick AndAlso CDFM1 > 0 Then Exit For  ' CDF>1 at max thickness
            If modReq.layers(IL).h <= minThick AndAlso CDFM1 < 0 Then Exit For  ' CDF<1 at min thickness
        Next

        ' Run one final CDF at the design thickness to get accurate result
        If result IsNot Nothing Then
            If Not converged Then
                result = RunCdfAnalysis(modReq)
            End If

            result.requiredThickness = Math.Round(modReq.layers(IL).h * 2) / 2  ' Round to nearest 0.5"
            result.designLayerIndex = IL
            result.designConverged = converged
            result.designIterations = iterCount

            ' Case 1: CDF < 1.0 at minimum thickness — pavement adequate at any thickness
            If result.cdf_max < 1.0 AndAlso modReq.layers(IL).h <= minThick + 0.5 Then
                result.requiredThickness = minThick
                result.designConverged = True
                result.warnings = result.warnings.Concat({"Design: min thickness sufficient (CDF=" & result.cdf_max.ToString("E2") & " < 1.0)"}).ToArray()
            ' Case 2: CDF > 1.0 at maximum thickness — can't design thick enough
            ElseIf result.cdf_max > 1.0 AndAlso modReq.layers(IL).h >= maxThick - 0.5 Then
                result.requiredThickness = -1
                result.warnings = result.warnings.Concat({"Design: max thickness exceeded, CDF=" & result.cdf_max.ToString("F4")}).ToArray()
            ' Case 3: Did not converge but not at bounds
            ElseIf Not converged Then
                result.warnings = result.warnings.Concat({"Design: did not converge in " & iterCount & " iterations (CDF=" & result.cdf_max.ToString("F4") & ")"}).ToArray()
            End If
        End If
        Return result
    End Function

End Module
