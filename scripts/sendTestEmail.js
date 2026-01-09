const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");

function parseEnv(content) {
  return content.split(/\r?\n/).reduce((acc, line) => {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) acc[m[1].trim()] = m[2].trim();
    return acc;
  }, {});
}

(async () => {
  try {
    const envPath = path.join(__dirname, "..", ".env");
    const envExists = fs.existsSync(envPath);
    const env = envExists
      ? parseEnv(fs.readFileSync(envPath, "utf8"))
      : process.env;

    const host = env.SMTP_HOST;
    const port = parseInt(env.SMTP_PORT || "587", 10);
    const user = env.SMTP_USER;
    const pass = env.SMTP_PASS;

    console.log("Using SMTP config from", envExists ? envPath : "process.env");
    console.log({ host, port, hasUser: !!user });

    if (!host || !user || !pass) {
      console.error("SMTP not configured (missing HOST/USER/PASS in .env)");
      process.exit(2);
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    const to = "annptse171081@fpt.edu.vn";
    const info = await transporter.sendMail({
      from: `\"VeloBike\" <${user}>`,
      to,
      subject: "VeloBike SMTP Test",
      text: "Test email from VeloBike server",
      html: "<p>Test email from VeloBike server</p>",
    });

    console.log(
      "Message sent:",
      info && (info.messageId || info.response)
        ? info.messageId || info.response
        : info
    );
    process.exit(0);
  } catch (err) {
    console.error("Send error:", err && err.message ? err.message : err);
    process.exit(1);
  }
})();
