using System.Data;
using GeneralPurposeLib;
using MySql.Data.MySqlClient;
using SerbleWebsite.Data.Schemas;

namespace SerbleWebsite.Data.Storage; 

public class MySqlStorageService : IStorageService {
    
    private MySqlConnection? _connection;  // MySQL Connection Object
    private string? _connectString;

    private void CheckConnection() {
        if (_connection == null) {
            RepairConnection();
            return;
        }

        try {
            if (!_connection.Ping()) {
                RepairConnection();
            }
        }
        catch (Exception) {
            RepairConnection();
        }
        
    }
    
    private async void RepairConnection() {
        Logger.Warn("Repairing MySQL Connection");
        await _connection!.CloseAsync();
        try {
            // await _connection!.OpenAsync();
            Init();
        }
        catch (MySqlException e) {
            Logger.Error("MySQL Reconnection Error Occured");
            Logger.Error(e);
            throw;
        }
        Logger.Info("MySQL Connection Repaired");
    }
    
    public void Init() {
        Logger.Info("Connecting to MySQL...");
        _connectString = $"server={Program.Config!["mysql_ip"]};" +
                         $"userid={Program.Config["mysql_user"]};" +
                         $"password={Program.Config["mysql_password"]};" +
                         $"database={Program.Config["mysql_database"]}";

        try {
            _connection = new MySqlConnection(_connectString);
            _connection.Open();
        }
        catch (Exception e) {
            Logger.Debug(e.ToString());
            throw new Exception("Failed to connect to MySQL");
        }
        Logger.Info("Connected MySQL");
        _connection.StateChange += DatabaseConnectStateChanged;
        Logger.Debug($"MySQL Version: {_connection.ServerVersion}");
        Logger.Info("Creating tables in MySQL...");
        CreateTables();
        Logger.Info("Created MySQL tables");
    }

    public void Deinit() {
        try {
            _connection!.Close();
        }
        catch (Exception) {
            Logger.Error("Failed to close MySQL connection");
        }
    }

    private void CreateTables() {
        SendMySqlStatement(@"CREATE TABLE IF NOT EXISTS serblesite_users(
                                id VARCHAR(64) primary key,
                                username VARCHAR(255), 
                                email VARCHAR(64),
                                password VARCHAR(64),
                                permlevel INT,
                                permstring VARCHAR(64))");
        SendMySqlStatement(@"CREATE TABLE IF NOT EXISTS serblesite_user_authorized_apps(
                                userid VARCHAR(64),
                                appid VARCHAR(64), 
                                scopes VARCHAR(128))");
        SendMySqlStatement(@"CREATE TABLE IF NOT EXISTS serblesite_apps(" +
                           "ownerid VARCHAR(64), " +
                           "id VARCHAR(64), " +
                           "name VARCHAR(64), " +
                           "description VARCHAR(1024), " +
                           "clientsecret VARCHAR(64))");
        SendMySqlStatement(@"CREATE TABLE IF NOT EXISTS serblesite_kv(" +
                            "k VARCHAR(64)," +
                            "v VARCHAR(1024))");
    }

    private void SendMySqlStatement(string statement) {
        using MySqlCommand cmd = new MySqlCommand();
        cmd.Connection = _connection;
        cmd.CommandText = statement;
        cmd.ExecuteNonQuery();
    }

    private void DatabaseConnectStateChanged(object obj, StateChangeEventArgs args) {
        if (args.CurrentState != ConnectionState.Broken && 
            args.CurrentState != ConnectionState.Closed) {
            return;
        }
            
        // Reconnect
        try {
            _connection = new MySqlConnection(_connectString);
            _connection.Open();
        }
        catch (Exception e) {
            Logger.Error("MySQL reconnect failed: " + e);
            _connection!.StateChange -= DatabaseConnectStateChanged;  // Don't loop connect
            throw new Exception("Failed to reconnect to MySQL");
        }
    }

    public void AddUser(User userDetails, out User newUser) {
        CheckConnection();
        userDetails.Id = Guid.NewGuid().ToString();
        using MySqlCommand cmd = new MySqlCommand();
        cmd.Connection = _connection;
        cmd.CommandText = @"INSERT INTO serblesite_users(id, username, email, password, permlevel, permstring) VALUES(@id, @username, @email, @password, @permlevel, @permstring)";
        cmd.Parameters.AddWithValue("@id", userDetails.Id);
        cmd.Parameters.AddWithValue("@username", userDetails.Username);
        cmd.Parameters.AddWithValue("@email", userDetails.Email);
        cmd.Parameters.AddWithValue("@password", userDetails.PasswordHash);
        cmd.Parameters.AddWithValue("@permlevel", userDetails.PermLevel);
        cmd.Parameters.AddWithValue("@permstring", userDetails.PermString);
        cmd.ExecuteNonQuery();
        newUser = userDetails;
    }

    public void GetUser(string userId, out User? user) {
        CheckConnection();
        using MySqlCommand cmd = new MySqlCommand();
        cmd.Connection = _connection;
        cmd.CommandText = @"SELECT * FROM serblesite_users WHERE id=@id";
        cmd.Parameters.AddWithValue("@id", userId);
        using MySqlDataReader reader = cmd.ExecuteReader();
        if (!reader.Read()) {
            user = null;
            return;
        }
        user = new User {
            Id = reader.GetString("id"),
            Username = reader.GetString("username"),
            Email = reader.GetString("email"),
            PasswordHash = reader.GetString("password"),
            PermLevel = reader.GetInt32("permlevel"),
            PermString = reader.GetString("permstring")
        };
        
        reader.Close();
    }

    public void UpdateUser(User userDetails) {
        CheckConnection();
        using MySqlCommand cmd = new MySqlCommand();
        cmd.Connection = _connection;
        cmd.CommandText = @"UPDATE serblesite_users SET username=@username, email=@email, password=@password, permlevel=@permlevel, permstring=@permstring WHERE id=@id";
        cmd.Parameters.AddWithValue("@id", userDetails.Id);
        cmd.Parameters.AddWithValue("@username", userDetails.Username);
        cmd.Parameters.AddWithValue("@email", userDetails.Email);
        cmd.Parameters.AddWithValue("@password", userDetails.PasswordHash);
        cmd.Parameters.AddWithValue("@permlevel", userDetails.PermLevel);
        cmd.Parameters.AddWithValue("@permstring", userDetails.PermString);
        cmd.ExecuteNonQuery();
    }

    public void DeleteUser(string userId) {
        CheckConnection();
        using MySqlCommand cmd = new MySqlCommand();
        cmd.Connection = _connection;
        cmd.CommandText = @"DELETE FROM serblesite_users WHERE id=@id";
        cmd.Parameters.AddWithValue("@id", userId);
        cmd.ExecuteNonQuery();
        
        // Delete all the authed app data
        cmd.CommandText = @"DELETE FROM serblesite_user_authorized_apps WHERE userid=@id";
        cmd.ExecuteNonQuery();
    }

    public void GetUserFromName(string userName, out User? user) {
        CheckConnection();
        using MySqlCommand cmd = new MySqlCommand();
        cmd.Connection = _connection;
        cmd.CommandText = @"SELECT * FROM serblesite_users WHERE username=@username";
        cmd.Parameters.AddWithValue("@username", userName);
        using MySqlDataReader reader = cmd.ExecuteReader();
        if (!reader.Read()) {
            user = null;
            return;
        }
        user = new User {
            Id = reader.GetString("id"),
            Username = reader.GetString("username"),
            Email = reader.GetString("email"),
            PasswordHash = reader.GetString("password"),
            PermLevel = reader.GetInt32("permlevel"),
            PermString = reader.GetString("permstring")
        };
        
        reader.Close();
    }

    public void CountUsers(out int userCount) {
        CheckConnection();
        using MySqlCommand cmd = new MySqlCommand();
        cmd.Connection = _connection;
        cmd.CommandText = @"SELECT COUNT(*) FROM serblesite_users";
        userCount = (int)cmd.ExecuteScalar();
    }

    public void AddAuthorizedApp(string userId, AuthorizedApp app) {
        CheckConnection();
        using MySqlCommand cmd = new MySqlCommand();
        cmd.Connection = _connection;
        cmd.CommandText = @"INSERT INTO serblesite_user_authorized_apps(userid, appid, scopes) VALUES(@userid, @appid, @scopes)";
        cmd.Parameters.AddWithValue("@userid", userId);
        cmd.Parameters.AddWithValue("@appid", app.AppId);
        cmd.Parameters.AddWithValue("@scopes", app.Scopes);
        cmd.ExecuteNonQuery();
    }

    public void GetAuthorizedApps(string userId, out AuthorizedApp[] apps) {
        CheckConnection();
        using MySqlCommand cmd = new MySqlCommand();
        cmd.Connection = _connection;
        cmd.CommandText = @"SELECT * FROM serblesite_user_authorized_apps WHERE userid=@id";
        cmd.Parameters.AddWithValue("@id", userId);
        using MySqlDataReader reader2 = cmd.ExecuteReader();
        
        List<AuthorizedApp> authedApps = new ();
        while (reader2.Read()) {
            authedApps.Add(new AuthorizedApp(
                reader2.GetString("appid"), 
                reader2.GetString("scopes")));
        }
        reader2.Close();
        
        apps = authedApps.ToArray();
    }

    public void DeleteAuthorizedApp(string userId, string appId) {
        CheckConnection();
        using MySqlCommand cmd = new MySqlCommand();
        cmd.Connection = _connection;
        cmd.CommandText = @"DELETE FROM serblesite_user_authorized_apps WHERE userid=@userid AND appid=@appid";
        cmd.Parameters.AddWithValue("@userid", userId);
        cmd.Parameters.AddWithValue("@appid", appId);
        cmd.ExecuteNonQuery();
    }

    public void AddOAuthApp(OAuthApp app) {
        CheckConnection();
        using MySqlCommand cmd = new MySqlCommand();
        cmd.Connection = _connection;
        cmd.CommandText = @"INSERT INTO serblesite_apps(id, ownerid, name, description, clientsecret) VALUES(@id, @owner, @name, @description, @clientsecret)";
        cmd.Parameters.AddWithValue("@id", app.Id);
        cmd.Parameters.AddWithValue("@owner", app.OwnerId);
        cmd.Parameters.AddWithValue("@name", app.Name);
        cmd.Parameters.AddWithValue("@description", app.Description);
        cmd.Parameters.AddWithValue("@clientsecret", app.ClientSecret);
        cmd.ExecuteNonQuery();
    }

    public void GetOAuthApp(string appId, out OAuthApp? app) {
        CheckConnection();
        using MySqlCommand cmd = new MySqlCommand();
        cmd.Connection = _connection;
        cmd.CommandText = @"SELECT * FROM serblesite_apps WHERE id=@id";
        cmd.Parameters.AddWithValue("@id", appId);
        using MySqlDataReader reader = cmd.ExecuteReader();
        if (!reader.Read()) {
            app = null;
            return;
        }
        app = new OAuthApp(reader.GetString("ownerid")) {
            Id = reader.GetString("id"),
            Name = reader.GetString("name"),
            Description = reader.GetString("description"),
            ClientSecret = reader.GetString("clientsecret")
        };
        
        reader.Close();
    }

    public void UpdateOAuthApp(OAuthApp app) {
        CheckConnection();
        using MySqlCommand cmd = new MySqlCommand();
        cmd.Connection = _connection;
        cmd.CommandText = @"UPDATE serblesite_apps SET name=@name, description=@description, clientsecret=@clientsecret, ownerid=@ownerid WHERE id=@id";
        cmd.Parameters.AddWithValue("@id", app.Id);
        cmd.Parameters.AddWithValue("@ownerid", app.OwnerId);
        cmd.Parameters.AddWithValue("@name", app.Name);
        cmd.Parameters.AddWithValue("@description", app.Description);
        cmd.Parameters.AddWithValue("@clientsecret", app.ClientSecret);
        cmd.ExecuteNonQuery();
    }

    public void DeleteOAuthApp(string appId) {
        CheckConnection();
        using MySqlCommand cmd = new MySqlCommand();
        cmd.Connection = _connection;
        cmd.CommandText = @"DELETE FROM serblesite_apps WHERE id=@id";
        cmd.Parameters.AddWithValue("@id", appId);
        cmd.ExecuteNonQuery();
    }

    public void GetOAuthAppsFromUser(string userId, out OAuthApp[] apps) {
        CheckConnection();
        using MySqlCommand cmd = new MySqlCommand();
        cmd.Connection = _connection;
        cmd.CommandText = @"SELECT * FROM serblesite_apps WHERE ownerid=@ownerid";
        cmd.Parameters.AddWithValue("@ownerid", userId);
        using MySqlDataReader reader = cmd.ExecuteReader();
        List<OAuthApp> appsList = new ();
        while (reader.Read()) {
            appsList.Add(new OAuthApp(userId) {
                Id = reader.GetString("id"),
                Name = reader.GetString("name"),
                Description = reader.GetString("description"),
                ClientSecret = reader.GetString("clientsecret")
            });
        }
        reader.Close();
        apps = appsList.ToArray();
    }

    public void BasicKvSet(string key, string value) {
        CheckConnection();
        using MySqlCommand cmd = new MySqlCommand();
        cmd.Connection = _connection;
        cmd.CommandText = @"INSERT INTO serblesite_kv(k, v) VALUES(@key, @value)";
        cmd.Parameters.AddWithValue("@key", key);
        cmd.Parameters.AddWithValue("@value", value);
        cmd.ExecuteNonQuery();
    }

    public void BasicKvGet(string key, out string? value) {
        CheckConnection();
        using MySqlCommand cmd = new MySqlCommand();
        cmd.Connection = _connection;
        cmd.CommandText = @"SELECT v FROM serblesite_kv WHERE k=@key";
        cmd.Parameters.AddWithValue("@key", key);
        using MySqlDataReader reader = cmd.ExecuteReader();
        if (!reader.Read()) {
            value = null;
            return;
        }
        value = reader.GetString("v");
        reader.Close();
    }
}