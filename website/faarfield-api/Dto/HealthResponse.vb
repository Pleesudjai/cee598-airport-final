Namespace Dto

    Public Class HealthResponse
        Public Property status As String
        Public Property version As String
        Public Property leafAvailable As Boolean
        Public Property femAvailable As Boolean
        Public Property fem3dAvailable As Boolean      ' Managed 3D FEM path (clsAM + FAAMeshClassLib + FEMClassLib)
        Public Property analysisAvailable As Boolean
        Public Property nike3dAvailable As Boolean
        Public Property aircraftCount As Integer
        Public Property aircraftWithGeometry As Integer
    End Class

End Namespace
