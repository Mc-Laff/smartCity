const fs = require("fs");
const dayjs = require("dayjs");

// import required libraries first
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");
const schedule = require("node-schedule");
const { response } = require("express");

// load and parse the proto file
const PROTO_PATH = path.join(__dirname, "./proto/traffic.proto");
const packageDefinition = protoLoader.loadSync(PROTO_PATH);
const trafficProto = grpc.loadPackageDefinition(packageDefinition).traffic;

// Use client name from command-line argument
const clientName = process.argv[2] || "default-client";

// Times when Rail Lights will be trigger for train passing
const trainTimes = [
  // schedule times
  "00 08 * * *",
  "05 08 * * *",
  "00 10 * * *",
  "05 10 * * *",
  "00 12 * * *",
  "05 12 * * *",
  "00 14 * * *",
  "05 14 * * *",
  "00 16 * * *",
  "05 16 * * *",
  "00 18 * * *",
  "05 18 * * *",
  "00 20 * * *",
  "05 20 * * *",
  "00 22 * * *",
  "05 22 * * *",
];
// var for Rail Lights status
let status = "GREEN";

// Save the messages to txt Tracker File
function trackFileCross1(message) {
  fs.appendFileSync("TrackFile.txt", `${message}\n`);
}

// function to replace the var so time gets captured on spot
function getFormattedTime() {
  return dayjs().format("DD-MM-YYYY HH:mm");
}

// Raymond's code for device to connect and be recognise
function main() {
  const client = new trafficProto.TrafficService(
    "localhost:50051",
    grpc.credentials.createInsecure()
  );
  // client connects to localhost:50051
  // uses the insecure credentials to communicate in plain text with no certifications or encryption required
  const clientType = { name: clientName };

  // ADDED: calling the schedule lights function
  scheduleRailLights(clientType, client);

  // allows the client to be used some where else
  module.exports = client;
}

function scheduleRailLights(clientType, client) {
  // Loop through trainTimes to execute the schedule job
  trainTimes.forEach((time, index) => {
    // Toggle the light status
    schedule.scheduleJob(time, () => {
      status = status === "GREEN" ? "RED" : "GREEN";
      const msg = `${getFormattedTime()}\n 🔔 Scheduled Task  ${index + 1} `;
      // get the time the event is being trigger and executed
      console.log(msg);
      trackFileCross1(msg);
      // Schedule a task: every day at the times from the var trainTimes
      client.scheduleRailLights(
        // we pass just the role as the status will be changes in the server side
        {
          clientType: clientType.role,
          status: status,
        },

        (err, response) => {
          if (err) {
            console.error("gRPC Error:\n", err.message);
            trackFileCross1(err.message);
            return;
          }
          console.log("  ", response.sendOut);
          trackFileCross1(response.sendOut);
        }
      );
    });
  });
}

main();
