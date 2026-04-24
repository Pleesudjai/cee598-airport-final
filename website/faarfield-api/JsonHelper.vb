Imports System.Web.Script.Serialization

Public Module JsonHelper

    Private ReadOnly serializer As New JavaScriptSerializer() With {
        .MaxJsonLength = Integer.MaxValue
    }

    Public Function Serialize(Of T)(obj As T) As String
        Return serializer.Serialize(obj)
    End Function

    Public Function Deserialize(Of T)(json As String) As T
        Return serializer.Deserialize(Of T)(json)
    End Function

End Module
