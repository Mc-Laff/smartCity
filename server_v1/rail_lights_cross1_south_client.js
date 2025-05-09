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

// Times when Rail Lights will be trigger for train passing
const trainTimes = [
  // testing times
  "58 19 * * *",
  "19 13 * * *",
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
  fs.appendFileSync("cross1_TrackFile.txt", `${message}\n`);
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
  const clientType = { role: "RAIL LIGHTS: Cross 1: Street G South" };

  // Here we could verify the status is in GREEN when connecting so the events toggle into the right option
  // as day progress

  // defines the client type, we can improve on this later by adding more details other than the simple role if we want
  client.RegisterClient(clientType, (error, response) => {
    if (error) {
      console.error(
        `[Client] ${getFormattedTime()}\n Registration failed:`,
        error
      );
      trackFileCross1(`${getFormattedTime()} ${error}`);
    } else {
      console.log(
        `[Client] ${getFormattedTime()}\n  Server response:`,
        response.message
      );
      trackFileCross1(`${getFormattedTime()}\n  ${response.message}`);
    }
  });

  // ADDED: calling the schedule lights function
  scheduleRailLights(clientType, client);
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
