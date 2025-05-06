const fs = require("fs");

const express = require("express");
const session = require("express-session");
const bcrypt = require("bcrypt");

const path = require("path");

const app = express();
const PORT = 3005;

const users = JSON.parse(fs.readFileSync("./credentials.json", "utf-8"));

// Ensure log file exists
const logFilePath = path.join(__dirname, "TrackFile.txt");

if (!fs.existsSync(logFilePath)) {
  fs.writeFileSync(logFilePath, "");
}

// https://tech.bloggernepal.com/2021/10/authentication-with-nodejs-bcrypt.html

// Set EJS as the view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Serve Bootstrap CSS from node_modules
app.use(
  "/css",
  express.static(path.join(__dirname, "node_modules/bootstrap/dist/css"))
);

// Serve style.css
app.use("/style", express.static(path.join(__dirname, "style")));

// Serve images or icons
app.use("/media", express.static(path.join(__dirname, "media")));

// Middleware to parse form data
app.use(express.urlencoded({ extended: false }));

// Set up session to keep users logged in
app.use(
  session({
    secret: "some-secret-key",
    resave: false,
    saveUninitialized: false,
  })
);

// Render login form
app.get("/login", (req, res) => {
  res.render("login", { error: null });
});

// Home/dashboard page - protected access
app.get("/home", (req, res) => {
  if (!req.session.user) return res.redirect("/login");
  res.render("home", {
    username: req.session.user,
    logs: "",
  });
});

// Logs button
app.get("/logs", (req, res) => {
  if (!req.session.user) return res.redirect("/login");

  fs.readFile(logFilePath, "utf8", (err, data) => {
    const logs = err ? "Unable to load logs." : data;
    console.log(logs);

    res.render("home", { username: req.session.user, logs });
  });
});

// Login user
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const user = users.find((u) => u.username === username);
  if (!user) return res.render("login", { error: "User not found" });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.render("login", { error: "Incorrect password" });

  // Save username to session
  req.session.user = username;
  res.redirect("home");
});

// Logout user
app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/login"));
});

app.get("/RegisterClient", (req, res) => {
  const { clientType = req.name, status } = req.body;
});

// Redirect root to login
app.get("/", (req, res) => {
  res.redirect("/login");
});

app.listen(PORT, () => {
  console.log(`Dashboard running: http://localhost:${PORT}`);
});
