
using System.Security;
using GeneralPurposeLib;
using SerbleWebsite.Data;
using LogLevel = GeneralPurposeLib.LogLevel;
using UnauthorizedAccessException = System.UnauthorizedAccessException;

namespace SerbleWebsite;

public static class Program {
    
    private static ConfigManager? _configManager;
    private static readonly Dictionary<string, string> ConfigDefaults = new() {
        { "bind_url", "http://*:5000" },
        { "storage_service", "file" },
        { "http_authorization_token", "my very secure auth token" },
        { "http_url", "https://myverysecurestoragebackend.io/" },
        { "my_host" , "https://theplacewherethisappisaccessable.com/" },
        { "token_issuer", "CoPokBl" },
        { "token_audience", "Privileged Users" },
        { "token_secret" , Guid.NewGuid().ToString() }
    };
    public static Dictionary<string, string>? Config;
    public static IStorageService? StorageService;

    private static int Main(string[] args) {

        try {
            Logger.Init(LogLevel.Debug);
        }
        catch (Exception e) {
            Console.WriteLine(e);
            Console.WriteLine("Failed to initialize logger");
            return 1;
        }

        int stopCode;
        try {
            stopCode = Run(args);
            Logger.Warn("Application stopped");
            return stopCode;
        }
        catch (Exception e) {
            Logger.Error(e);
            Logger.Error("The application has crashed due to an unhandled exception.");
            Logger.WaitFlush();
            stopCode = 1;
        }

        try {
            Logger.WaitFlush();
        }
        catch (Exception e) {
            Console.WriteLine(e);
            Console.WriteLine("Failed to flush logger, writing error to logfail.log");
            try {
                File.WriteAllText("logfail.log", e.ToString());
            }
            catch (UnauthorizedAccessException) {
                Console.WriteLine("Failed to write logfail.log due to access denied error.");
                return 1;
            }
            catch (SecurityException) {
                Console.WriteLine("Failed to write logfail.log due to access denied error.");
                return 1;
            }
            catch (IOException ioException) {
                Console.WriteLine(ioException);
                Console.WriteLine("Failed to write logfail.log due to IO Error.");
                return 1;
            }
            catch (Exception writeFailEx) {
                Console.WriteLine(writeFailEx);
                Console.WriteLine("Failed to write logfail.log due to an unknown error.");
                return 1;
            }
        }
        return stopCode;
    }
    
    private static int Run(string[] args) {

        // Config
        Logger.Info("Loading config...");
        _configManager = new ConfigManager("config.json", ConfigDefaults);
        Config = _configManager.LoadConfig();
        Logger.Info("Config loaded.");
        
        // Storage service
        try {
            StorageService = Config["storage_service"] switch {
                "file" => new FileStorageService(),
                _ => throw new Exception("Unknown storage service")
            };
        }
        catch (Exception e) {
            if (e.Message != "Unknown storage service") throw;
            Logger.Error("Invalid storage service specified in config.");
            return 1;
        }

        // Init storage
        Logger.Info("Initializing storage...");
        try {
            StorageService.Init();
        }
        catch (Exception e) {
            Logger.Error("Failed to initialize storage");
            Logger.Error(e);
            return 1;
        }

        if (args.Length != 0) {

            switch (args[0]) {
                
                default:
                    Console.WriteLine("Unknown command");
                    return 1;

            }
        }

        WebApplicationBuilder builder = WebApplication.CreateBuilder(args);

        // Add services to the container.
        try {
            builder.Services.AddRazorPages();
            builder.Services.AddServerSideBlazor();
            builder.Services.AddControllers();
            builder.WebHost.UseUrls(Config["bind_url"]);
        }
        catch (Exception e) {
            Logger.Error(e);
            Logger.Error("Failed to initialize services");
            return 1;
        }

        WebApplication app;
        try {
            app = builder.Build();

            // Configure the HTTP request pipeline.
            if (!app.Environment.IsDevelopment()) {
                app.UseExceptionHandler("/Error");
                // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
                app.UseHsts();
            }
        
            app.UseStaticFiles();
            app.UseRouting();
            app.UseEndpoints(endpoints => { endpoints.MapControllers(); });
            app.MapBlazorHub();
            app.MapFallbackToPage("/_Host");
        }
        catch (Exception e) {
            Logger.Error(e);
            Logger.Error("Failed to initialize application");
            return 1;
        }

        bool didError = false;
        try {
            app.Run();
            Logger.Info("Server stopped with no errors.");
        }
        catch (Exception e) {
            Logger.Error(e);
            Logger.Error("Server stopped with error.");
            didError = true;
        }
        
        // Shutdown storage
        Logger.Info("Shutting down storage...");
        try {
            StorageService?.Deinit();
        }
        catch (Exception e) {
            Logger.Error("Failed to shutdown storage");
            Logger.Error(e);
        }
        
        return didError ? 1 : 0;
    }

}