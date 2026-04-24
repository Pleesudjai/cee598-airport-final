Namespace Dto

    Public Class LeafPointRequest
        Public Property layers As LayerInput()
        Public Property subgrade As SubgradeInput
        Public Property aircraft As AircraftInput
        Public Property evalDepths As Double()
        Public Property evalX As Double
        Public Property evalY As Double
    End Class

    Public Class LeafPointResponse
        Public Property depths As Double()
        Public Property stressX As Double()
        Public Property stressY As Double()
        Public Property stressZ As Double()
        Public Property strainX As Double()
        Public Property strainY As Double()
        Public Property strainZ As Double()
        Public Property deflZ As Double()
        Public Property stressMaxShear As Double()
        Public Property meta As ResponseMeta
    End Class

End Namespace
