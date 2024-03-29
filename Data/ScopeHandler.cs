namespace SerbleAPI.Data; 

public static class ScopeHandler {
    
    // Scope Format
    // Scope will be a string of 1s and 0s where 1 is a granted scope and 0 is a denied scope.
    // In the following order (Format: INDEX. FULL NAME | IDENTIFIER)
    // 0. Full Access | full_access
    // 1. File Host Access | file_host
    
    public static readonly string[] Scopes = {
        "full_access",
        "file_host",
        "user_info",
        "apps_control",
        "payment_info",
        "manage_account",
        "manage_apps"
    };
    
    public static readonly string[] ScopeNames = {
        "Full Account Access",
        "File Host",
        "Account Information",
        "Control Of Authorized Applications",
        "Payment Information",
        "Account Management",
        "OAuth App Management"
    };
    
    public enum ScopesEnum {
        FullAccess,
        FileHost,
        UserInfo,
        AppsControl,
        PaymentInfo,
        ManageAccount,
        ManageApps
    }

    // id, name
    public static List<(string, string)> ScopeList => Scopes.Select((t, i) => (t, ScopeNames[i])).ToList();

    public static readonly string[] ScopeDescriptions = {
        "Allows full access to the account.",
        "Allows access the file host.",
        "Allows access to the account's information (Eg. Username, Email).",
        "Allows control over authorized applications.",
        "Allows access to a user's list of purchased products and allows them to manage their subscriptions, " +
        "including viewing the last 4 digits of their credit card and viewing purchase history.",
        "Grants the ability to control the user's account, including changing their email, and username. Only you can change your password.",
        "Allows management over all of your OAuth application, this does not allow the authorization of apps."
    };

    public static string ListOfScopeIdsToString(IEnumerable<string> scopeIds) {
        return Scopes.Aggregate("", (current, scope) => current + (scopeIds.Contains(scope) ? "1" : "0"));
    }
    
    // Convert list of scope ids to list of scope names
    public static IEnumerable<string> ListOfScopeIdsToScopeNames(IEnumerable<string> scopeIds) {
        return ScopeNames.Where((_, index) => scopeIds.Contains(Scopes[index]));
    }
    
    public static IEnumerable<string> FilterInvalidScopes(IEnumerable<string> scopes) {
        return scopes.Where(scope => Scopes.Contains(scope)).ToArray();
    }
    
    public static string[] StringToListOfScopeIds(string scopeString) {
        string?[] scopes = scopeString.Select((t, i) => t == '1' ? Scopes[i] : null).Where(t => t != null).ToArray();
        return scopes.Where(t => t != null).ToArray()!;
    }
    
    public static string GetDescriptionFromName(string name) {
        return ScopeDescriptions[Array.IndexOf(ScopeNames, name)];
    }

    public static IEnumerable<ScopesEnum> ScopesIdsToEnumArray(IEnumerable<string> scopes) {
        return scopes.Select(t => (ScopesEnum)Enum.Parse(typeof(ScopesEnum), t));
    }
    
    public static IEnumerable<string> ScopesEnumToIdsArray(IEnumerable<ScopesEnum> scopes) {
        return scopes.Select(t => t.ToString());
    }
    
}

public class Scopes {
    public string ScopesString { get; init; }

    public IEnumerable<ScopeHandler.ScopesEnum> EnumArray =>
        ScopeHandler.ScopesIdsToEnumArray(ScopeHandler.StringToListOfScopeIds(ScopesString));

    public IEnumerable<string> IdArray => ScopeHandler.StringToListOfScopeIds(ScopesString);

    public static Scopes FromString(string scopeString) {
        return new Scopes(scopeString);
    }
    
    public static Scopes FromListOfScopeIds(IEnumerable<string> scopeIds) {
        return FromString(ScopeHandler.ListOfScopeIdsToString(scopeIds));
    }
    
    public static Scopes FromListOfScopeEnums(IEnumerable<ScopeHandler.ScopesEnum> scopeEnums) {
        return FromListOfScopeIds(ScopeHandler.ScopesEnumToIdsArray(scopeEnums));
    }

    public Scopes(string scopesString) {
        ScopesString = ScopeHandler.ListOfScopeIdsToString(ScopeHandler.FilterInvalidScopes(ScopeHandler.StringToListOfScopeIds(scopesString)));
    }

}