namespace SerbleWebsite.Data.Schemas; 

public class User {
    
    public string Id { get; set; }
    public string Username { get; set; }
    public string Email { get; set; }
    public string PasswordHash { get; set; }
    
    // 0=Disabled Account 1=Normal, 2=Admin
    public int PermLevel { get; set; }
    public string PermString { get; set; }
    
    // (appId, appSecret)
    public (string, string)[] AuthorizedApps { get; set; }

    public IEnumerable<string> AuthorizedAppIds => AuthorizedApps.Select(x => x.Item1).ToArray();
    
    public User() {
        Id = "";
        Username = "";
        Email = "";
        PasswordHash = "";
        PermLevel = 0;
        PermString = "";
        AuthorizedApps = Array.Empty<(string, string)>();
    }
    
}