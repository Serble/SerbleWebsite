using System.Net;
using System.Text;
using System.Text.Json;
using GeneralPurposeLib;
using SerbleWebsite.Data.Schemas;

namespace SerbleWebsite.Data;
public static class SerbleApiHandler {

    public static async Task<SerbleApiResponse<User>> GetUser(string token) {
        // Send HTTP request to API
        HttpClient client = new();
        client.DefaultRequestHeaders.Add("SerbleAuth", "User " + token);
        HttpResponseMessage response;
        try {
            response = await client.GetAsync(Constants.SerbleApiUrl + "account");
        }
        catch (Exception e) {
            return new SerbleApiResponse<User>(false, "Failed: " + e);
        }
        if (!response.IsSuccessStatusCode) {
            Console.WriteLine("Response: " + await response.Content.ReadAsStringAsync());
            return new SerbleApiResponse<User>(false, $"Failed: {response.StatusCode}");
        }
        // Parse response
        string json = await response.Content.ReadAsStringAsync();
        Console.WriteLine(json);
        User user;
        try {
            user = JsonSerializer.Deserialize<User>(json).ThrowIfNull();
            Console.WriteLine("Username: " + user.Username);
            Console.WriteLine("PermLvl: " + user.PermLevel);
        }
        catch (Exception e) {
            return new SerbleApiResponse<User>(false, $"Failed to parse response: {e.Message}");
        }
        return new SerbleApiResponse<User>(user);
    }
    
    public static async Task<SerbleApiResponse<(bool, string)>> LoginUser(string username, string password) {
        // Send HTTP request to API
        HttpClient client = new();
        client.DefaultRequestHeaders.Add("Authorization", "Basic " + Convert.ToBase64String(Encoding.ASCII.GetBytes($"{username}:{password}")));
        HttpResponseMessage response;
        try {
            response = await client.GetAsync(Constants.SerbleApiUrl + "auth");
        }
        catch (Exception e) {
            return new SerbleApiResponse<(bool, string)>(false, "Error: " + e);
        }
        if (!response.IsSuccessStatusCode) {
            Console.WriteLine("Response: " + await response.Content.ReadAsStringAsync());
            return new SerbleApiResponse<(bool, string)>(false, $"Non Success Code: {response.StatusCode}");
        }
        // Parse response
        AuthResponseBody body;
        try {
            body = (await response.Content.ReadAsStringAsync()).FromJson<AuthResponseBody>()!;
        }
        catch (Exception e) {
            Console.WriteLine("Response: " + await response.Content.ReadAsStringAsync());
            return new SerbleApiResponse<(bool, string)>(false, $"Failed to parse response: {e.Message}");
        }
        return new SerbleApiResponse<(bool, string)>((body.MfaRequired, body.MfaRequired ? body.MfaToken : body.Token));
    }
    
    public static async Task<SerbleApiResponse<User>> RegisterUser(string username, string password, string recaptchaToken) {
        // Send HTTP request to API
        HttpClient client = new();
        client.DefaultRequestHeaders.Add("SerbleAntiSpam", $"recaptcha {recaptchaToken}");
        HttpResponseMessage response;
        try {
            response = await client.PostAsync(Constants.SerbleApiUrl + "account", new StringContent(new {
                username,
                password
            }.ToJson(), Encoding.UTF8, "application/json"));
        }
        catch (Exception e) {
            return new SerbleApiResponse<User>(false, "Failed: " + e);
        }
        if (!response.IsSuccessStatusCode) {
            return new SerbleApiResponse<User>(false, $"Failed: {response.StatusCode} ({await response.Content.ReadAsStringAsync()})");
        }
        // Parse response
        string json = await response.Content.ReadAsStringAsync();
        User user;
        try {
            user = JsonSerializer.Deserialize<User>(json).ThrowIfNull();
        }
        catch (Exception e) {
            return new SerbleApiResponse<User>(false, $"Failed to parse response: {e.Message}");
        }
        return new SerbleApiResponse<User>(user);
    }
    
    public static async Task<SerbleApiResponse<User>> EditUser(string token, PatchEditRequest[] edits) {
        // Send HTTP request to API
        HttpClient client = new();
        client.DefaultRequestHeaders.Add("SerbleAuth", "User " + token);
        HttpResponseMessage response;
        string jsonInp = edits.ToJson();
        Console.WriteLine(jsonInp);
        try {
            response = await client.PatchAsync(
                Constants.SerbleApiUrl + "account", 
                new StringContent(jsonInp, Encoding.UTF8, 
                    "application/json"));
        }
        catch (Exception e) {
            return new SerbleApiResponse<User>(false, "Failed: " + e);
        }
        if (!response.IsSuccessStatusCode) {
            string flag = "unknown";
            string responseContent = await response.Content.ReadAsStringAsync();
            if (response.StatusCode == HttpStatusCode.BadRequest) {
                flag = responseContent switch {
                    "Username is already taken" => "name-taken",
                    "Invalid email" => "email-invalid",
                    "Field doesn't exist" => "bad-field",
                    _ => flag
                };
            }
            Console.WriteLine(responseContent);
            return new SerbleApiResponse<User>(false, $"Failed: {response.StatusCode} ({await response.Content.ReadAsStringAsync()})", flag);
        }
        // Parse response
        string json = await response.Content.ReadAsStringAsync();
        User user;
        try {
            user = JsonSerializer.Deserialize<User>(json).ThrowIfNull();
        }
        catch (Exception e) {
            return new SerbleApiResponse<User>(false, $"Failed to parse response: {e.Message}");
        }
        return new SerbleApiResponse<User>(user);
    }

    public static async Task<SerbleApiResponse<PublicOAuthApp>> GetPublicAppInfo(string appId) {
        // Send HTTP request to API
        HttpClient client = new();
        HttpResponseMessage response;
        try {
            response = await client.GetAsync($"{Constants.SerbleApiUrl}app/{appId}/public");
        }
        catch (Exception e) {
            return new SerbleApiResponse<PublicOAuthApp>(false, "Failed: " + e);
        }
        if (!response.IsSuccessStatusCode) {
            string flag = "unknown";
            string responseContent = await response.Content.ReadAsStringAsync();
            if (response.StatusCode == HttpStatusCode.NotFound) {
                flag = "not-found";
            }
            Console.WriteLine(responseContent);
            return new SerbleApiResponse<PublicOAuthApp>(false, $"Failed: {response.StatusCode} ({await response.Content.ReadAsStringAsync()})", flag);
        }
        // Parse response
        string json = await response.Content.ReadAsStringAsync();
        PublicOAuthApp app;
        try {
            app = JsonSerializer.Deserialize<PublicOAuthApp>(json).ThrowIfNull();
        }
        catch (Exception e) {
            return new SerbleApiResponse<PublicOAuthApp>(false, $"Failed to parse response: {e.Message}");
        }
        return new SerbleApiResponse<PublicOAuthApp>(app);
    }

    public static async Task<SerbleApiResponse<string>> GetPaymentPortalUrl(string token) {
        // Send HTTP request to API
        HttpClient client = new();
        client.DefaultRequestHeaders.Add("SerbleAuth", "User " + token);
        HttpResponseMessage response;
        try {
            response = await client.GetAsync($"{Constants.SerbleApiUrl}payments/portal");
        }
        catch (Exception e) {
            return new SerbleApiResponse<string>(false, "Failed: " + e);
        }
        if (!response.IsSuccessStatusCode) {
            string flag = "unknown";
            string responseContent = await response.Content.ReadAsStringAsync();
            flag = response.StatusCode switch {
                HttpStatusCode.NotFound => "not-found",
                HttpStatusCode.BadRequest when responseContent == "User is not a customer." => "not-customer",
                _ => flag
            };
            Console.WriteLine(responseContent);
            return new SerbleApiResponse<string>(false, $"Failed: {response.StatusCode} ({await response.Content.ReadAsStringAsync()})", flag);
        }
        // Parse response
        string json = await response.Content.ReadAsStringAsync();
        string url;
        try {
            JsonDocument doc = JsonDocument.Parse(json);
            url = doc.RootElement.GetProperty("url").GetString().ThrowIfNull();
        }
        catch (Exception e) {
            return new SerbleApiResponse<string>(false, $"Failed to parse response: {e.Message}");
        }
        return new SerbleApiResponse<string>(url);
    }
    
    public static async Task<SerbleApiResponse<string>> GetCheckoutUrl(string token, string[] products) {
        // Send HTTP request to API
        HttpClient client = new();
        client.DefaultRequestHeaders.Add("SerbleAuth", "User " + token);
        HttpResponseMessage response;
        string jsonInp = products.ToJson();
        try {
            response = await client.PostAsync($"{Constants.SerbleApiUrl}payments/checkout", new StringContent(jsonInp, Encoding.UTF8, 
                "application/json"));
        }
        catch (Exception e) {
            return new SerbleApiResponse<string>(false, "Failed: " + e);
        }
        if (!response.IsSuccessStatusCode) {
            string flag = "unknown";
            string responseContent = await response.Content.ReadAsStringAsync();
            flag = response.StatusCode switch {
                HttpStatusCode.NotFound => "not-found",
                HttpStatusCode.BadRequest when responseContent == "User is not a customer." => "not-customer",
                _ => flag
            };
            Console.WriteLine(responseContent);
            return new SerbleApiResponse<string>(false, $"Failed: {response.StatusCode} ({await response.Content.ReadAsStringAsync()})", flag);
        }
        // Parse response
        string json = await response.Content.ReadAsStringAsync();
        string url;
        try {
            JsonDocument doc = JsonDocument.Parse(json);
            url = doc.RootElement.GetProperty("url").GetString().ThrowIfNull();
        }
        catch (Exception e) {
            return new SerbleApiResponse<string>(false, $"Failed to parse response: {e.Message}");
        }
        return new SerbleApiResponse<string>(url);
    }
    
    public static async Task<SerbleApiResponse<string>> GetCheckoutUrlAnon(string[] products) {
        // Send HTTP request to API
        HttpClient client = new();
        HttpResponseMessage response;
        string jsonInp = products.ToJson();
        try {
            response = await client.PostAsync($"{Constants.SerbleApiUrl}payments/checkoutanon", new StringContent(jsonInp, Encoding.UTF8, 
                "application/json"));
        }
        catch (Exception e) {
            return new SerbleApiResponse<string>(false, "Failed: " + e);
        }
        if (!response.IsSuccessStatusCode) {
            string flag = "unknown";
            string responseContent = await response.Content.ReadAsStringAsync();
            flag = response.StatusCode switch {
                HttpStatusCode.NotFound => "not-found",
                HttpStatusCode.BadRequest when responseContent == "User is not a customer." => "not-customer",
                _ => flag
            };
            Console.WriteLine(responseContent);
            return new SerbleApiResponse<string>(false, $"Failed: {response.StatusCode} ({await response.Content.ReadAsStringAsync()})", flag);
        }
        // Parse response
        string json = await response.Content.ReadAsStringAsync();
        string url;
        try {
            JsonDocument doc = JsonDocument.Parse(json);
            url = doc.RootElement.GetProperty("url").GetString().ThrowIfNull();
        }
        catch (Exception e) {
            return new SerbleApiResponse<string>(false, $"Failed to parse response: {e.Message}");
        }
        return new SerbleApiResponse<string>(url);
    }
    
    public static async Task<SerbleApiResponse<string>> GetCheckoutUrlNew(string token, ProductCheckoutEntry[] products) {
        // Send HTTP request to API
        HttpClient client = new();
        client.DefaultRequestHeaders.Add("SerbleAuth", "User " + token);
        HttpResponseMessage response;
        string jsonInp = products.ToJson();
        try {
            response = await client.PostAsync($"{Constants.SerbleApiUrl}payments/checkout", new StringContent(jsonInp, Encoding.UTF8, 
                "application/json"));
        }
        catch (Exception e) {
            return new SerbleApiResponse<string>(false, "Failed: " + e);
        }
        if (!response.IsSuccessStatusCode) {
            string flag = "unknown";
            string responseContent = await response.Content.ReadAsStringAsync();
            flag = response.StatusCode switch {
                HttpStatusCode.NotFound => "not-found",
                HttpStatusCode.BadRequest when responseContent == "User is not a customer." => "not-customer",
                _ => flag
            };
            Console.WriteLine(responseContent);
            return new SerbleApiResponse<string>(false, $"Failed: {response.StatusCode} ({await response.Content.ReadAsStringAsync()})", flag);
        }
        // Parse response
        string json = await response.Content.ReadAsStringAsync();
        string url;
        try {
            JsonDocument doc = JsonDocument.Parse(json);
            url = doc.RootElement.GetProperty("url").GetString().ThrowIfNull();
        }
        catch (Exception e) {
            return new SerbleApiResponse<string>(false, $"Failed to parse response: {e.Message}");
        }
        return new SerbleApiResponse<string>(url);
    }
    
    public static async Task<SerbleApiResponse<string>> GetCheckoutUrlAnonNew(ProductCheckoutEntry[] products) {
        // Send HTTP request to API
        HttpClient client = new();
        HttpResponseMessage response;
        string jsonInp = products.ToJson();
        try {
            response = await client.PostAsync($"{Constants.SerbleApiUrl}payments/checkoutanon", new StringContent(jsonInp, Encoding.UTF8, 
                "application/json"));
        }
        catch (Exception e) {
            return new SerbleApiResponse<string>(false, "Failed: " + e);
        }
        if (!response.IsSuccessStatusCode) {
            string flag = "unknown";
            string responseContent = await response.Content.ReadAsStringAsync();
            flag = response.StatusCode switch {
                HttpStatusCode.NotFound => "not-found",
                HttpStatusCode.BadRequest when responseContent == "User is not a customer." => "not-customer",
                _ => flag
            };
            Console.WriteLine(responseContent);
            return new SerbleApiResponse<string>(false, $"Failed: {response.StatusCode} ({await response.Content.ReadAsStringAsync()})", flag);
        }
        // Parse response
        string json = await response.Content.ReadAsStringAsync();
        string url;
        try {
            JsonDocument doc = JsonDocument.Parse(json);
            url = doc.RootElement.GetProperty("url").GetString().ThrowIfNull();
        }
        catch (Exception e) {
            return new SerbleApiResponse<string>(false, $"Failed to parse response: {e.Message}");
        }
        return new SerbleApiResponse<string>(url);
    }

    public static async Task<SerbleApiResponse<string>> AuthorizeApp(string token, string appId, string scopeString) {
        // Send HTTP request to API
        HttpClient client = new();
        client.DefaultRequestHeaders.Add("SerbleAuth", "User " + token);
        HttpResponseMessage response;
        string jsonInp = new AuthorizedApp(appId, scopeString).ToJson();
        try {
            response = await client.PostAsync($"{Constants.SerbleApiUrl}account/authorizedApps", 
                new StringContent(jsonInp, Encoding.UTF8, 
                "application/json"));
        }
        catch (Exception e) {
            return new SerbleApiResponse<string>(false, "Failed: " + e);
        }

        if (response.IsSuccessStatusCode)
            return new SerbleApiResponse<string>(await response.Content.ReadAsStringAsync());
        string flag = "unknown";
        string responseContent = await response.Content.ReadAsStringAsync();
        if (response.StatusCode == HttpStatusCode.BadRequest) {
            flag = "bad-app";
        }
        Console.WriteLine(responseContent);
        return new SerbleApiResponse<string>(false, $"Failed: {response.StatusCode} ({await response.Content.ReadAsStringAsync()})", flag);
    }
    
    public static async Task<SerbleApiResponse<string>> DeAuthorizeApp(string token, string appId) {
        // Send HTTP request to API
        HttpClient client = new();
        client.DefaultRequestHeaders.Add("SerbleAuth", "User " + token);
        HttpResponseMessage response;
        try {
            response = await client.DeleteAsync($"{Constants.SerbleApiUrl}account/authorizedApps/{appId}");
        }
        catch (Exception e) {
            return new SerbleApiResponse<string>(false, "Failed: " + e);
        }

        if (response.IsSuccessStatusCode)
            return new SerbleApiResponse<string>(await response.Content.ReadAsStringAsync());
        string flag = "unknown";
        string responseContent = await response.Content.ReadAsStringAsync();
        if (response.StatusCode == HttpStatusCode.BadRequest) {
            flag = "bad-app";
        }
        Console.WriteLine(responseContent);
        return new SerbleApiResponse<string>(false, $"Failed: {response.StatusCode} ({await response.Content.ReadAsStringAsync()})", flag);
    }
    
    public static async Task<SerbleApiResponse<double>> CheckReCaptcha(string token) {
        // Send HTTP request to API
        HttpClient client = new();
        HttpResponseMessage response;
        string url = $"{Constants.SerbleApiUrl}recaptcha";
        url += "?token=" + token;
        try {
            response = await client.PostAsync(url, null);
        }
        catch (Exception e) {
            return new SerbleApiResponse<double>(false, "Failed: " + e);
        }
        if (!response.IsSuccessStatusCode) {
            Console.WriteLine("Response: " + await response.Content.ReadAsStringAsync());
            return new SerbleApiResponse<double>(false, $"Failed: {response.StatusCode}");
        }
        // Parse response
        string responseStr = await response.Content.ReadAsStringAsync();
        Console.WriteLine("Server ReCaptcha Response: " + responseStr);
        return new SerbleApiResponse<double>(double.Parse(responseStr));
    }

    public static async Task<SerbleApiResponse<OAuthApp[]>> GetUsersApps(string token) {
        // Send HTTP request to API
        HttpClient client = new();
        HttpResponseMessage response;
        client.DefaultRequestHeaders.Add("SerbleAuth", "User " + token);
        try {
            response = await client.GetAsync($"{Constants.SerbleApiUrl}app");
        }
        catch (Exception e) {
            return new SerbleApiResponse<OAuthApp[]>(false, "Failed: " + e);
        }
        if (!response.IsSuccessStatusCode) {
            Console.WriteLine("Response: " + await response.Content.ReadAsStringAsync());
            return new SerbleApiResponse<OAuthApp[]>(false, $"Failed: {response.StatusCode}");
        }
        // Parse response
        string responseStr = await response.Content.ReadAsStringAsync();
        try {
            return new SerbleApiResponse<OAuthApp[]>(JsonSerializer.Deserialize<OAuthApp[]>(responseStr).ThrowIfNull());
        }
        catch (Exception e) {
            Console.WriteLine(e);
            return new SerbleApiResponse<OAuthApp[]>(false, $"Failed to parse response: {e.Message}");
        }
    }

    public static async Task<SerbleApiResponse<bool>> CreateOAuthApp(string token, PublicOAuthApp app) {
        // Send HTTP request to API
        HttpClient client = new();
        HttpResponseMessage response;
        client.DefaultRequestHeaders.Add("SerbleAuth", "User " + token);
        string jsonInp = new { app.Name, app.Description, app.RedirectUri }.ToJson();
        try {
            response = await client.PostAsync($"{Constants.SerbleApiUrl}app", new StringContent(jsonInp, Encoding.UTF8, "application/json"));
        }
        catch (Exception e) {
            return new SerbleApiResponse<bool>(false, "Failed: " + e);
        }
        if (!response.IsSuccessStatusCode) {
            Console.WriteLine("Response: " + await response.Content.ReadAsStringAsync());
            return new SerbleApiResponse<bool>(false, $"Failed: {response.StatusCode}");
        }
        // Don't parse response
        return new SerbleApiResponse<bool>(true);
    }
    
    public static async Task<SerbleApiResponse<bool>> DeleteOAuthApp(string token, string appId) {
        // Send HTTP request to API
        HttpClient client = new();
        HttpResponseMessage response;
        client.DefaultRequestHeaders.Add("SerbleAuth", "User " + token);
        try {
            response = await client.DeleteAsync($"{Constants.SerbleApiUrl}app/{appId}");
        }
        catch (Exception e) {
            return new SerbleApiResponse<bool>(false, "Failed: " + e);
        }
        if (!response.IsSuccessStatusCode) {
            Console.WriteLine("Response: " + await response.Content.ReadAsStringAsync());
            return new SerbleApiResponse<bool>(false, $"Failed: {response.StatusCode}");
        }
        // Don't parse response
        return new SerbleApiResponse<bool>(true);
    }
    
    public static async Task<SerbleApiResponse<OAuthApp>> EditOAuthApp(string token, string id, PatchEditRequest[] edits) {
        // Send HTTP request to API
        HttpClient client = new();
        client.DefaultRequestHeaders.Add("SerbleAuth", "User " + token);
        HttpResponseMessage response;
        string jsonInp = edits.ToJson();
        Console.WriteLine(jsonInp);
        try {
            response = await client.PatchAsync(
                Constants.SerbleApiUrl + "app/" + id, 
                new StringContent(jsonInp, Encoding.UTF8, 
                    "application/json"));
        }
        catch (Exception e) {
            return new SerbleApiResponse<OAuthApp>(false, "Failed: " + e);
        }
        if (!response.IsSuccessStatusCode) {
            string flag = "unknown";
            string responseContent = await response.Content.ReadAsStringAsync();
            Console.WriteLine(responseContent);
            return new SerbleApiResponse<OAuthApp>(false, $"Failed: {response.StatusCode} ({await response.Content.ReadAsStringAsync()})", flag);
        }
        // Parse response
        string json = await response.Content.ReadAsStringAsync();
        OAuthApp user;
        try {
            user = JsonSerializer.Deserialize<OAuthApp>(json).ThrowIfNull();
        }
        catch (Exception e) {
            return new SerbleApiResponse<OAuthApp>(false, $"Failed to parse response: {e.Message}");
        }
        return new SerbleApiResponse<OAuthApp>(user);
    }
    
    public static async Task<SerbleApiResponse<OAuthApp>> GetOAuthApp(string token, string appId) {
        // Send HTTP request to API
        HttpClient client = new();
        client.DefaultRequestHeaders.Add("SerbleAuth", "User " + token);
        HttpResponseMessage response;
        try {
            response = await client.GetAsync(Constants.SerbleApiUrl + "app/" + appId);
        }
        catch (Exception e) {
            return new SerbleApiResponse<OAuthApp>(false, "Failed: " + e);
        }
        if (!response.IsSuccessStatusCode) {
            Console.WriteLine("Response: " + await response.Content.ReadAsStringAsync());
            return new SerbleApiResponse<OAuthApp>(false, $"Failed: {response.StatusCode}");
        }
        // Parse response
        string json = await response.Content.ReadAsStringAsync();
        Console.WriteLine(json);
        OAuthApp app;
        try {
            app = JsonSerializer.Deserialize<OAuthApp>(json).ThrowIfNull();
        }
        catch (Exception e) {
            return new SerbleApiResponse<OAuthApp>(false, $"Failed to parse response: {e.Message}");
        }
        return new SerbleApiResponse<OAuthApp>(app);
    }
    
    public static async Task<SerbleApiResponse<string[]>> GetUsersOwnedProducts(string token) {
        // Send HTTP request to API
        HttpClient client = new();
        HttpResponseMessage response;
        client.DefaultRequestHeaders.Add("SerbleAuth", "User " + token);
        try {
            response = await client.GetAsync($"{Constants.SerbleApiUrl}products");
        }
        catch (Exception e) {
            return new SerbleApiResponse<string[]>(false, "Failed: " + e);
        }
        if (!response.IsSuccessStatusCode) {
            Console.WriteLine("Response: " + await response.Content.ReadAsStringAsync());
            return new SerbleApiResponse<string[]>(false, $"Failed: {response.StatusCode}");
        }
        // Parse response
        string responseStr = await response.Content.ReadAsStringAsync();
        try {
            return new SerbleApiResponse<string[]>(JsonSerializer.Deserialize<string[]>(responseStr).ThrowIfNull());
        }
        catch (Exception e) {
            Console.WriteLine(e);
            return new SerbleApiResponse<string[]>(false, $"Failed to parse response: {e.Message}");
        }
    }

    public static async Task<SerbleApiResponse<string>> SubmitTotpCodeForLogin(string mfaToken, string code) {
        string json = new {
            login_token = mfaToken,
            totp_code = code
        }.ToJson();
        
        HttpClient client = new();
        HttpResponseMessage response;
        try {
            response = await client.PostAsync(Constants.SerbleApiUrl + "account/mfa", new StringContent(json, null, "application/json"));
        }
        catch (Exception e) {
            return new SerbleApiResponse<string>(false, "Error: " + e);
        }
        if (!response.IsSuccessStatusCode) {
            Console.WriteLine("Response: " + await response.Content.ReadAsStringAsync());
            return new SerbleApiResponse<string>(false, $"Non Success Code: {response.StatusCode}");
        }
        // Parse response
        AuthResponseBody body;
        try {
            body = (await response.Content.ReadAsStringAsync()).FromJson<AuthResponseBody>()!;
        }
        catch (Exception e) {
            Console.WriteLine("Response: " + await response.Content.ReadAsStringAsync());
            return new SerbleApiResponse<string>(false, $"Failed to parse response: {e.Message}");
        }
        return new SerbleApiResponse<string>(body.Token);
    }
    
    public static async Task<SerbleApiResponse<bool>> SubmitTotpCode(string token, string code) {
        string json = new {
            totp_code = code
        }.ToJson();
        
        HttpClient client = new();
        client.DefaultRequestHeaders.Add("SerbleAuth", "User " + token);
        HttpResponseMessage response;
        try {
            response = await client.PostAsync(Constants.SerbleApiUrl + "account/mfa/totp", new StringContent(json, null, "application/json"));
        }
        catch (Exception e) {
            return new SerbleApiResponse<bool>(false, "Error: " + e);
        }
        if (!response.IsSuccessStatusCode) {
            Console.WriteLine("Response: " + await response.Content.ReadAsStringAsync());
            return new SerbleApiResponse<bool>(false, $"Non Success Code: {response.StatusCode}");
        }
        // Parse response
        TotpCheckResponse body;
        try {
            body = (await response.Content.ReadAsStringAsync()).FromJson<TotpCheckResponse>()!;
        }
        catch (Exception e) {
            Console.WriteLine("Response: " + await response.Content.ReadAsStringAsync());
            return new SerbleApiResponse<bool>(false, $"Failed to parse response: {e.Message}");
        }
        return new SerbleApiResponse<bool>(body.Valid);
    }
    
    public static async Task<SerbleApiResponse<string[]>> GetNotes(string token) {
        // Send HTTP request to API
        HttpClient client = new();
        HttpResponseMessage response;
        client.DefaultRequestHeaders.Add("SerbleAuth", "User " + token);
        try {
            response = await client.GetAsync($"{Constants.SerbleApiUrl}vault/notes");
        }
        catch (Exception e) {
            return new SerbleApiResponse<string[]>(false, "Failed: " + e);
        }
        if (!response.IsSuccessStatusCode) {
            Console.WriteLine("Response: " + await response.Content.ReadAsStringAsync());
            return new SerbleApiResponse<string[]>(false, $"Failed: {response.StatusCode}");
        }
        // Parse response
        string responseStr = await response.Content.ReadAsStringAsync();
        try {
            return new SerbleApiResponse<string[]>(JsonSerializer.Deserialize<string[]>(responseStr).ThrowIfNull());
        }
        catch (Exception e) {
            Console.WriteLine(e);
            return new SerbleApiResponse<string[]>(false, $"Failed to parse response: {e.Message}");
        }
    }

    public static async Task<SerbleApiResponse<string>> GetNoteContent(string token, string noteId) {
        // Send HTTP request to API
        HttpClient client = new();
        HttpResponseMessage response;
        client.DefaultRequestHeaders.Add("SerbleAuth", "User " + token);
        try {
            response = await client.GetAsync($"{Constants.SerbleApiUrl}vault/notes/{noteId}");
        }
        catch (Exception e) {
            return new SerbleApiResponse<string>(false, "Failed: " + e);
        }
        if (!response.IsSuccessStatusCode) {
            Console.WriteLine("Response: " + await response.Content.ReadAsStringAsync());
            return new SerbleApiResponse<string>(false, $"Failed: {response.StatusCode}");
        }
        // Parse response
        string responseStr = await response.Content.ReadAsStringAsync();
        try {
            return new SerbleApiResponse<string>(responseStr);
        }
        catch (Exception e) {
            Console.WriteLine(e);
            return new SerbleApiResponse<string>(false, $"Failed to parse response: {e.Message}");
        }
    }
    
    public static async Task<SerbleApiResponse<string>> UpdateNoteContent(string token, string noteId, string content) {
        // Send HTTP request to API
        HttpClient client = new();
        HttpResponseMessage response;
        client.DefaultRequestHeaders.Add("SerbleAuth", "User " + token);
        try {
            response = await client.PutAsync($"{Constants.SerbleApiUrl}vault/notes/{noteId}", new StringContent(content.ToJson(), null, "application/json"));
        }
        catch (Exception e) {
            return new SerbleApiResponse<string>(false, "Failed: " + e);
        }
        if (response.IsSuccessStatusCode) return new SerbleApiResponse<string>(noteId);
        Console.WriteLine("Response: " + await response.Content.ReadAsStringAsync());
        return new SerbleApiResponse<string>(false, $"Failed: {response.StatusCode}");
    }
    
    public static async Task<SerbleApiResponse<string>> NewNote(string token) {
        // Send HTTP request to API
        HttpClient client = new();
        HttpResponseMessage response;
        client.DefaultRequestHeaders.Add("SerbleAuth", "User " + token);
        try {
            response = await client.PostAsync($"{Constants.SerbleApiUrl}vault/notes", null);
        }
        catch (Exception e) {
            return new SerbleApiResponse<string>(false, "Failed: " + e);
        }
        if (!response.IsSuccessStatusCode) {
            Console.WriteLine("Response: " + await response.Content.ReadAsStringAsync());
            return new SerbleApiResponse<string>(false, $"Failed: {response.StatusCode}");
        }
        string bodyString = await response.Content.ReadAsStringAsync();
        NoteCreationResponse body;
        try {
            body = bodyString.FromJson<NoteCreationResponse>()!;
        }
        catch (Exception e) {
            Console.WriteLine(e);
            return new SerbleApiResponse<string>(false, e.Message);
        }
        return new SerbleApiResponse<string>(body.NoteId!);
    }
    
    public static async Task<SerbleApiResponse<string>> DeleteNote(string token, string id) {
        // Send HTTP request to API
        HttpClient client = new();
        HttpResponseMessage response;
        client.DefaultRequestHeaders.Add("SerbleAuth", "User " + token);
        try {
            response = await client.DeleteAsync($"{Constants.SerbleApiUrl}vault/notes/{id}");
        }
        catch (Exception e) {
            return new SerbleApiResponse<string>(false, "Failed: " + e);
        }
        if (response.IsSuccessStatusCode) return new SerbleApiResponse<string>(id);
        Console.WriteLine("Response: " + await response.Content.ReadAsStringAsync());
        return new SerbleApiResponse<string>(false, $"Failed: {response.StatusCode}");
    }

}

public class SerbleApiResponse<T> {
    
    public bool Success { get; }
    public T? ResponseObject { get; }
    public string ErrorMessage { get; }
    public string ErrorFlag { get; }
    
    public SerbleApiResponse(T responseObject) {
        ResponseObject = responseObject;
        Success = true;
        ErrorFlag = "";
        ErrorMessage = "";
    }
    
    public SerbleApiResponse(bool success, string errorMessage, string errorFlag = "") {
        Success = false;
        ResponseObject = default;
        ErrorMessage = errorMessage;
        ErrorFlag = errorFlag;
    }
    
    public static implicit operator T?(SerbleApiResponse<T> response) {
        return response.ResponseObject;
    }

}