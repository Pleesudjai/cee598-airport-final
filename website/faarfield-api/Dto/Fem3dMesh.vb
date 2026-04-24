Namespace Dto

    ''' <summary>
    ''' Compact DTO for the FAARFIELD FEM mesh snapshot.
    ''' Flat arrays keep JSON small for the ~64k-brick default mesh.
    '''
    ''' nodeCoords is [x0,y0,z0, x1,y1,z1, ...] — length = 3 * nodeCount.
    ''' elementNodes is [n0..n7, n0..n7, ...] — length = 8 * elementCount, indices are 0-based into nodeCoords.
    ''' elementLayerIds is length = elementCount — index into the layers array.
    ''' Inches throughout. Origin: X=0 Y=0 at loaded-gear centroid, Z=0 at top of
    ''' subgrade. **Z grows UPWARD** — pavement surface at Z ≈ +(thkAC + thkPCC)
    ''' (e.g., Z=16 for 4" AC + 12" PCC), subgrade bottom at Z ≈ −54.
    ''' </summary>
    Public Class Fem3dMesh
        Public Property renderMode As String            ' "surface" (dedup) or "full" (all brick faces)
        Public Property totalElementCount As Integer    ' Full FAARFIELD mesh brick count

        Public Property nodeCount As Integer
        Public Property nodeCoords As Double()          ' flat [x, y, z] triples for referenced nodes only

        ' Surface triangle list: three 0-based node indices per triangle, one layer id per triangle.
        ' This is what the frontend renders directly — no brick-level triangulation needed client-side.
        Public Property surfaceTriCount As Integer
        Public Property surfaceTriNodes As Integer()    ' flat [n0, n1, n2, n0, n1, n2, ...] length = 3 * surfaceTriCount
        Public Property surfaceTriLayerIds As Integer() ' length = surfaceTriCount

        ' 1-based source brick id per triangle (index into elementStressTensor).
        ' Populated only when includeStressField=true on the request.
        ' length = surfaceTriCount when present, else null.
        Public Property surfaceTriBrickIds As Integer()

        ' Per-triangle face classification (populated when includeStressField=true).
        ' Each entry is one of: "top" | "bottom" | "side" — based on the outward
        ' normal of the source hex face. Let the frontend filter by face kind
        ' ("show only bottom-of-PCC") and route the correct GP aggregation.
        Public Property surfaceTriFaceKinds As String()

        ' Per-triangle mean face Z coordinate (inches, same frame as nodeCoords).
        ' Useful for depth-profile tools / layer-interface slicing.
        Public Property surfaceTriFaceZ As Double()

        Public Property layers As Fem3dMeshLayer()
        Public Property wheelLoads As Fem3dWheelLoad()
        Public Property slabDomain As Fem3dDomain
        ' Translation from LEAF gear-centered coords to mesh slab coords.
        ' To query a LEAF stress grid at a mesh point (mx, my):
        '   leafX = mx - gearOriginInMesh.x
        '   leafY = my - gearOriginInMesh.y
        Public Property gearOriginInMesh As Fem3dPoint2

        Public Property warnings As String()

        ' Per-brick FEM stress tensor from clsPrintOut.st(,,,), aggregated across
        ' Gauss points per the request's stressAggregation mode.
        ' Index = 1-based brick id (slot 0 unused; matches FAARFIELD convention).
        ' Each row = [sigmaX, sigmaY, sigmaZ, tauXY, tauYZ, tauXZ] in psi.
        ' Sign convention: FAARFIELD stress positive = tension, negative = compression.
        ' Mesh geometry: Z positive = UP (pavement surface at max Z, subgrade bottom at min Z).
        ' Length = totalElementCount + 1, populated only when includeStressField=true.
        Public Property elementStressTensor As Double()()

        ' Per-brick tensors at the TOP half (GPs 5-8) and BOTTOM half (GPs 1-4)
        ' of the brick, populated when stressAggregation = "auto" so the frontend
        ' can paint top-face triangles with top-GP stress and bottom-face with
        ' bottom-GP. Null otherwise. Same layout as elementStressTensor.
        Public Property elementStressTensorTop As Double()()
        Public Property elementStressTensorBottom As Double()()

        ' Per-brick centroid (mean of 8 corner nodes), inches in the slab frame.
        ' Index = 1-based brick id matching elementStressTensor. Each row = [x, y, z].
        ' Populated only when includeStressField=true. Used by Phase D validation
        ' to spatially place reference elements for desktop FAARFIELD comparison.
        Public Property elementCentroids As Double()()

        ' 1-based brick layer id (matches Fem3dMeshLayer.id, top-down ordering).
        ' Length = totalElementCount + 1. Populated only when includeStressField=true.
        Public Property elementLayerIds As Integer()

        Public Property stressFieldMeta As Fem3dStressMeta
    End Class

    Public Class Fem3dStressMeta
        Public Property aggregation As String       ' "mean" (default) | "max" | "centroid" — Gauss-pt aggregation used
        Public Property timeStep As Integer         ' Which ntime slice the tensor was sampled at
        Public Property unit As String              ' "psi"
        Public Property componentLabels As String() ' ["sigmaX","sigmaY","sigmaZ","tauXY","tauYZ","tauXZ"]
        Public Property nElements As Integer        ' Number of bricks with valid stress (excluding slot 0)
        Public Property peakAbsScalar As Double     ' max |σx|, |σy|, |σz| across all elements (for color-range default)
        Public Property secondPassMs As Long        ' Duration of the extra FAASR3D solve
        Public Property notes As String             ' "Re-called Conversion() before 2nd FAASR3D" or similar provenance
    End Class

    Public Class Fem3dMeshLayer
        Public Property id As Integer            ' Index into layers[] (0-based)
        Public Property idxMat As Integer        ' Raw FAARFIELD IdxMat (for debug)
        Public Property name As String           ' e.g. "AC overlay", "PCC slab"
        Public Property color As String          ' hex "#RRGGBB" for rendering
        Public Property zTop As Double           ' Top z (in)
        Public Property zBot As Double           ' Bottom z (in)
        Public Property thickness As Double      ' in
        Public Property elementCount As Integer  ' Elements of this layer in the full mesh
    End Class

    Public Class Fem3dWheelLoad
        Public Property x As Double              ' in
        Public Property y As Double              ' in
        Public Property pressure As Double       ' psi
    End Class

    Public Class Fem3dDomain
        Public Property xMin As Double
        Public Property xMax As Double
        Public Property yMin As Double
        Public Property yMax As Double
        Public Property zMin As Double
        Public Property zMax As Double
    End Class

    Public Class Fem3dPoint2
        Public Property x As Double
        Public Property y As Double
    End Class

End Namespace
