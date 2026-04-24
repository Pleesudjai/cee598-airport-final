Namespace Dto

    Public Class LeafGridResponse
        Public Property xCoords As Double()
        Public Property yCoords As Double()
        Public Property stressX As Double()()
        Public Property stressY As Double()()
        Public Property stressZ As Double()()
        Public Property strainZ As Double()()
        Public Property deflZ As Double()()
        Public Property stressMaxShear As Double()()
        Public Property meta As ResponseMeta
    End Class

    Public Class ResponseMeta
        Public Property solver As String
        Public Property evalDepthIn As Double
        Public Property computeTimeMs As Long
    End Class

End Namespace
