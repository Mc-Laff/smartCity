// file reader
const fs = require("fs");

const express = require("express");
const session = require("express-session");
const { render } = require("ejs");

// authentication
const bcrypt = require("bcrypt");

const path = require("path");

const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const PROTO_PATH = path.join(__dirname, "./proto/traffic.proto");

const packageDefinition = protoLoader.loadSync(PROTO_PATH);
const trafficProto = grpc.loadPackageDefinition(packageDefinition).traffic;

const Client = new trafficProto.TrafficService(
  "localhost:50051",
  grpc.credentials.createInsecure()
);

const app = express();
app.use(express.urlencoded({ extended: true }));

const PORT = 3005;

// Ensure log file exists
const logFilePath = path.join(__dirname, "TrackFile.txt");

if (!fs.existsSync(logFilePath)) {
  fs.writeFileSync(logFilePath, "");
}

// https://tech.bloggernepal.com/2021/10/authentication-with-nodejs-bcrypt.html

// Set EJS as the view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// test for btns n clients
const { spawn } = require("child_process");

app.post("/start-client", (req, res) => {
  const clientType = req.body.clientName; // From form
  console.log("Launching client:", clientType);

  // Pass clientName as argument to client.js
  const clientName = clientType;
  const clientProcess = spawn("node", [`${clientName}.js`, clientType], {
    stdio: "inherit",
  });

  clientProcess.on("error", (err) => {
    console.error("Error:", err);
    res.status(500).send("Failed to start client");
  });
  // After starting the client, call the gRPC method to register the client
  Client.registerClient({ role: clientType }, (error, response) => {
    if (error) {
      console.error("Error registering client:", error);
      return res.status(500).send("Failed to register client");
    }
  });
});

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
  fs.readFile(logFilePath, "utf8", (err, data) => {
    const logs = err ? "Unable to load logs." : data;
    res.render("home", {
      username: req.session.user,
      logs,
      message: "",
      clientType: "",
    });
  });
});

// sent the logs to a new tab in the browser
app.get("/getLogs", (req, res) => {
  if (!req.session.user) return res.status(401).send("Unauthorized");

  fs.readFile(logFilePath, "utf8", (err, data) => {
    const logs = err ? "Unable to load logs." : data;
    res.send(logs); // Send only logs as plain text
  });
});

// sent the logs to a new tab in the browser
app.get("/viewLogs", (req, res) => {
  if (!req.session.user) return res.redirect("/login");

  Client.GetLogs({}, (err, response) => {
    if (err || !response.logs) {
      return res.send("<h2>Failed to load logs.</h2>");
    }
    res.setHeader("Content-Type", "text/plain");
    res.send(`${response.logs}`);
  });
});

// Login user
app.post("/logIn", (req, res) => {
  const { username, password } = req.body;

  Client.Login({ username, password }, (err, response) => {
    if (err || response.message !== "Login successful") {
      res.render("login", { error: "Invalid credentials" });
    } else {
      req.session.user = username;
      res.redirect("home");
    }
  });
});

// Logout user
app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/login"));
});

// Redirect root to login
app.get("/", (req, res) => {
  res.redirect("/login");
});

app.listen(PORT, () => {
  console.log(`Dashboard running: http://localhost:${PORT}`);
});
