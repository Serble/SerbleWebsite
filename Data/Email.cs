using System.Net;
using System.Net.Mail;
using SerbleWebsite.Data.Schemas;

namespace SerbleWebsite.Data;

public class Email {
    
    public string[] To { get; }
    public string From { get; }
    public string Subject { get; set; }
    public string Body { get; set; }

    public Email(IEnumerable<User> to, FromAddress from = FromAddress.System, string subject = "", string body = "") {
        To = to.Select(usr => usr.Email).ToArray();
        From = FromAddressEnumToString(from);
        Subject = subject;
        Body = body;
    }

    public Email(string[] to, FromAddress from = FromAddress.System, string subject = "", string body = "") {
        To = to;
        From = FromAddressEnumToString(from);
        Subject = subject;
        Body = body;
    }

    private static string FromAddressEnumToString(FromAddress address) {
        return address switch {
            FromAddress.System => Program.Config!["EmailAddress_System"],
            FromAddress.Newsletter => Program.Config!["EmailAddress_Newsletter"],
            _ => throw new InvalidEmailException("Invalid FromAddress")
        };
    }

    public void Send() {
        if (To.Any(string.IsNullOrEmpty)) {
            throw new InvalidEmailException("To Email is not valid");
        }
        
        SmtpClient client = new (Program.Config!["smtp_host"]) {
            Port = int.Parse(Program.Config!["smtp_port"]),
            Credentials = new NetworkCredential(Program.Config["smtp_username"], Program.Config["smtp_password"]),
            EnableSsl = true
        };

        MailMessage msg = new();
        msg.From = new MailAddress(From, "Serble");
        foreach (string toAdr in To) {
            msg.To.Add(new MailAddress(toAdr));
        }
        msg.Subject = Subject;
        msg.Body = Body;

        client.Send(msg);
    }
    
}

public enum FromAddress {
    System,
    Newsletter
}

public class InvalidEmailException : Exception {
    public InvalidEmailException(string message) : base(message) { }
}