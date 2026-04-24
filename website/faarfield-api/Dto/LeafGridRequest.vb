Namespace Dto

    Public Class LeafGridRequest
        Public Property layers As LayerInput()
        Public Property subgrade As SubgradeInput
        Public Property aircraft As AircraftInput
        Public Property evalDepthIn As Double
        Public Property gridExtentIn As Double
        Public Property gridPoints As Integer

        ' FEM3D mesh viz — only consumed by /api/fem3d/stress and /api/fem3d/mesh.
        Public Property includeMesh As Boolean
        Public Property highDetail As Boolean
        ' When true (default), clip rendered surface to the fine-mesh region
        ' (the physical 20x20 ft slab defined by the topmost user layer). When
        ' false, render the full FAARFIELD mesh including the outer coarse
        ' infinite-slab extension. Ignored if highDetail is true.
        Public Property filterCoarse As Boolean = True

        ' Phase 4 of specs/fem3d-real-stress-export.md. When true, the wrapper
        ' performs a second FAASR3D solve (via reflected modAutoMesh.IPC and
        ' a re-call of Conversion()) and returns the per-element stress tensor
        ' on Fem3dMesh.elementStressTensor. Adds ~10s per uncached build.
        ' Default false to preserve the geometry-only fast path.
        Public Property includeStressField As Boolean = False

        ' Gauss-point aggregation mode for elementStressTensor extraction.
        ' One of: "mean" (default, desktop printout parity), "bottom" (GPs 1-4,
        ' bottom-fiber tensile stress — design-critical for PCC), "top" (GPs 5-8,
        ' top-fiber compressive stress), "peak" (max |value| across 8 GPs signed).
        Public Property stressAggregation As String = "mean"
    End Class

    Public Class LayerInput
        Public Property type As String
        Public Property h As Double
        Public Property E As Double
        Public Property nu As Double
    End Class

    Public Class SubgradeInput
        Public Property E As Double
        Public Property nu As Double
    End Class

    Public Class AircraftInput
        Public Property name As String
        Public Property gearLoad As Double
        Public Property nTires As Integer
        Public Property tirePressure As Double
        Public Property tireSpacingIn As Double
        ' v2: optional ICAO + gear + MTOW for library resolution
        Public Property icao As String         ' ICAO code for library lookup
        Public Property gear As String         ' S, D, 2D, 2T, 3D etc.
        Public Property mtow As Double         ' Max takeoff weight (lbs)
    End Class

End Namespace
