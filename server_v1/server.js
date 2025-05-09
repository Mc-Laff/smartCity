
// file reader
const fs = require("fs");

// For time stamp
const dayjs = require("dayjs");

// Import libraries
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");
// Authentication
const bcrypt = require("bcrypt");
const { render } = require("ejs");

const PROTO_PATH = path.join(__dirname, "./proto/traffic.proto");
const packageDefinition = protoLoader.loadSync(PROTO_PATH);
const trafficProto = grpc.loadPackageDefinition(packageDefinition).traffic;


let barrierClientInstance = null; //If connencted, keeps a reference to the train barrier vlient
const users = JSON.parse(fs.readFileSync("credentials.json", "utf-8"));

// function to replace the var so time gets captured on spot
function getFormattedTime() {
  return dayjs().format("DD-MM-YYYY HH:mm");
}

function logIn(call, callback) {
  const { username, password } = call.request;
  const user = users.find((u) => u.username === username);

  if (!user) {
    return callback(null, { message: "User not found" });
  }

  const match = bcrypt.compare(password, user.password);
  if (match) {
    callback(null, { message: "Login successful" });
  } else {
    callback(null, { message: "Incorrect password" });
  }
}


// Register clients as they connect
const clients = {};

function registerClient(call, callback) {
  const { role } = call.request;

  console.log(`[Control Panel] ${role.toUpperCase()} client connected.`);

//If the train barrier client connects, we save a reference to it in the terminal
  if (role === 'train_barrier'){
    barrierClientInstance = new trafficProto.TrafficService('localhost:50051', grpc.credentials.createInsecure());
  }

  clients[role] = true;
  // Added time var to register when the clients/devices connect to the server
  console.log(
    `[Control Panel] ${getFormattedTime()}\n   ${role.toUpperCase()} client connected.`
  );

  callback(null, { message: `Registered ${role} client.` });
}

// Cross Rail lights toggled at specific times
function scheduleRailLights(call, callback) {
  const { clientType, status } = call.request;

  // Build message to return, with name and status of the client/device
  const sendOutMsg = `${clientType} is now ${status}`;


  callback(null, {
    sendOut: sendOutMsg,
  });
  console.log(`⏰ Scheduled Trigger: ${getFormattedTime()}\n  ${sendOutMsg}`);

}

// Method to update road light status
function updateLightStatus(call, callback) {
  const { status } = call.request;

  // Split the status string to extract the individual updates
  const [northStatus, southStatus] = status.split(' to ');

  // Print the updates for both road lights on the server side
  console.log(`[Server] road_light_north updated to ${northStatus}`);
  console.log(`[Server] road_light_south updated to ${southStatus}`);

  callback(null, { message: `Light status updated: ${status}` });
}

//Functionality to manage barrier control (lower or raise the barrier)

function controlBarrier(call, callback){
  const {lowerBarrier, status}= call.request;

  if (lowerBarrier){
    console.log(`[Barrier Control] The barrier is lowering. The train is ${status}.`);
    callback(null, { message: `The barrier is down.`});
  } else {
    console.log(`[Barrier Control] The barrier is rising. The train has passed.`);
    callback(null, { message: `The barrier is up.`});
  }
}


//Functionality to response the signal of the sensor when a trian is detected

function triggerSensor(call, callback) {
  const { trainDetected } = call.request;

  if (trainDetected) {
    console.log(`[Sensor] Train detected. Sending command to lower barrier`);

    if (barrierClientInstance) {
      const barrierRequest = {
        lowerBarrier: true,
        status: 'approaching',
      };

      barrierClientInstance.ControlBarrier(barrierRequest, (error, response) => {
        if (error) {
          console.error('[Server → BarrierClient] Error lowering barrier:', error);
          callback(null, { message: 'Train detected, but barrier control failed.' });
        } else {
          console.log('[Server → BarrierClient] Barrier lowered:', response.message);
          callback(null, { message: 'Train detected, barrier lowered.' });
        }
      });
    } else {
      console.log('[Server] No barrier client connected.');
      callback(null, { message: 'Train detected, but no barrier client connected.' });
    }

  } else {
    console.log(`[Sensor] Train passed, sending command to raise barrier`);

    if (barrierClientInstance) {
      const barrierRequest = {
        lowerBarrier: false,
        status: 'passed',
      };

      barrierClientInstance.ControlBarrier(barrierRequest, (error, response) => {
        if (error) {
          console.error('[Server → BarrierClient] Error raising barrier:', error);
          callback(null, { message: 'Train passed, but barrier control failed.' });
        } else {
          console.log('[Server → BarrierClient] Barrier raised:', response.message);
          callback(null, { message: 'Train passed, barrier raised.' });
        }
      });
    } else {
      console.log('[Server] No barrier client connected.');
      callback(null, { message: 'Train passed, but no barrier client connected.' });
    }
  }
}

// first a new gRPC server is created
// TrafficService is added, and the RegisterClient rpc is then linked to the registerClient() function
// the address is set to '0.0.0.0:50051' allowing it to accept connections across all available networks
// ServerCredentials.createInsecure() means communication is passed from our server to our clients  with no encryption, certificates and in plain text
// once connection is complete the server starts and then logs the connection message

// gRPC server setup
function main() {
  const server = new grpc.Server();
  server.addService(trafficProto.TrafficService.service, {
    RegisterClient: registerClient,
    scheduleRailLights: scheduleRailLights,
    UpdateLightStatus: updateLightStatus,
    Login: logIn,
    ControlBarrier: controlBarrier,
    TriggerSensor: triggerSensor,
  });

  const address = '0.0.0.0:50051';
  server.bindAsync(address, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
      console.error('[Server] Failed to bind:', err);
      return;
    }

    console.log(`[Server] gRPC server bound on port: ${port}`);
    server.start();
  });
}

main();
