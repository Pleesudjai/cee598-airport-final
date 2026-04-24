Imports System.Net
Imports System.Threading

Module Program

    Private listener As HttpListener
    Private running As Boolean = True

    Sub Main()
        Dim leafOk As Boolean = False
        Dim femOk As Boolean = False
        Dim fem3dOk As Boolean = False
        Dim analysisOk As Boolean = False
        Dim nike3dOk As Boolean = False

        ' Probe solver availability
        Try
            Dim t As Type = GetType(LEAFClassLib.clsLEAF)
            leafOk = (t IsNot Nothing)
        Catch
            leafOk = False
        End Try

        Try
            Dim t As Type = GetType(FEMClassLib.clsFEM)
            femOk = (t IsNot Nothing)
        Catch
            femOk = False
        End Try

        ' Probe managed 3D FEM path: can we instantiate the full chain?
        Try
            Dim am As New AMClassLib.clsAM()
            Dim mesh As New FAAMeshClassLib.clsMesh()
            Dim fem As New FEMClassLib.clsFEM()
            fem3dOk = (am IsNot Nothing AndAlso mesh IsNot Nothing AndAlso fem IsNot Nothing)
        Catch ex As Exception
            fem3dOk = False
            Console.WriteLine("  FEM3D probe failed: " & ex.Message)
        End Try

        Try
            Dim t As Type = GetType(FaarFieldAnalysis.CDF)
            analysisOk = (t IsNot Nothing)
        Catch
            analysisOk = False
        End Try

        nike3dOk = System.IO.File.Exists("C:\Program Files (x86)\FAARFIELD\Nike3d.dll")

        ' Load aircraft library
        Dim acLoaded As Integer = 0
        Dim acWithGeo As Integer = 0
        Try
            Dim libPath As String = System.IO.Path.Combine(
                System.AppDomain.CurrentDomain.BaseDirectory, "combined_aircraft_library.json")
            If Not System.IO.File.Exists(libPath) Then
                ' Try the src/data location
                libPath = "c:\temp\aeropave\src\data\aircraft_library.json"
            End If
            AircraftLibrary.LoadLibrary(libPath)
            acLoaded = AircraftLibrary.TotalCount
            acWithGeo = AircraftLibrary.CountWithGeometry
        Catch ex As Exception
            Console.WriteLine("  Aircraft library load failed: " & ex.Message)
        End Try

        Console.WriteLine("==============================================")
        Console.WriteLine("  FAARFIELD API v0.3 (Full Engine + FEM3D)")
        Console.WriteLine("  LEAF:     " & If(leafOk, "OK", "MISSING"))
        Console.WriteLine("  FEM:      " & If(femOk, "OK", "MISSING"))
        Console.WriteLine("  FEM3D:    " & If(fem3dOk, "OK (managed path)", "MISSING"))
        Console.WriteLine("  Analysis: " & If(analysisOk, "OK", "MISSING"))
        Console.WriteLine("  Nike3d:   " & If(nike3dOk, "OK", "MISSING (using managed FEM)"))
        Console.WriteLine("  Aircraft: " & acLoaded & " loaded (" & acWithGeo & " with geometry)")
        Console.WriteLine("  URL:      http://localhost:5100/")
        Console.WriteLine("==============================================")

        HttpRouter.LeafAvailable = leafOk
        HttpRouter.FemAvailable = femOk
        HttpRouter.Fem3dAvailable = fem3dOk
        HttpRouter.AnalysisAvailable = analysisOk
        HttpRouter.Nike3dAvailable = nike3dOk
        HttpRouter.AircraftCount = acLoaded
        HttpRouter.AircraftWithGeometry = acWithGeo

        listener = New HttpListener()
        listener.Prefixes.Add("http://localhost:5100/")

        Try
            listener.Start()
        Catch ex As HttpListenerException
            Console.WriteLine("ERROR: Could not start listener. " & ex.Message)
            Console.WriteLine("Try running: netsh http add urlacl url=http://localhost:5100/ user=Everyone")
            Return
        End Try

        Console.WriteLine("Listening... Press Ctrl+C to stop.")
        Console.WriteLine()

        AddHandler Console.CancelKeyPress, Sub(sender, e)
                                               e.Cancel = True
                                               running = False
                                               listener.Stop()
                                               Console.WriteLine("Shutting down...")
                                           End Sub

        While running
            Try
                Dim ctx As HttpListenerContext = listener.GetContext()
                ThreadPool.QueueUserWorkItem(Sub(state)
                                                 Try
                                                     HttpRouter.HandleRequest(ctx)
                                                 Catch ex As Exception
                                                     Console.WriteLine("ERROR: " & ex.Message)
                                                 End Try
                                             End Sub)
            Catch ex As HttpListenerException
                If running Then Console.WriteLine("Listener error: " & ex.Message)
            Catch ex As ObjectDisposedException
                ' Listener was stopped
            End Try
        End While
    End Sub

End Module
