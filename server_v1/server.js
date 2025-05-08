// Import libraries
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const PROTO_PATH = path.join(__dirname, './proto/traffic.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH);
const trafficProto = grpc.loadPackageDefinition(packageDefinition).traffic;

const clients = {}; // to store registered clients

// Register clients as they connect
function registerClient(call, callback) {
  const { role } = call.request;
  clients[role] = true;
  // Added time var to register when the clients/devices connect to the server
  console.log(
    `[Control Panel] ${new Date().toLocaleTimeString()}\n   ${role.toUpperCase()} client connected.`
  );
  callback(null, { message: `Registered ${role} client.` });
}

// Cross Rail lights toggled at specific times
function scheduleRailLights(call, callback) {
  const { clientType, status } = call.request;

  // Build message to return, with name and status of the client/device
  const sendOutMsg = `${clientType} is now ${status}`;

  callback(null, { sendOut: sendOutMsg });
  console.log(
    `⏰ Scheduled Trigger: ${new Date().toLocaleTimeString()}\n  ${sendOutMsg}`
  );
}

// Method to update light status and broadcast to all connected clients
function updateLightStatus(call, callback) {
  const { status } = call.request;

  // Split the status string to extract the individual updates
  const [northStatus, southStatus] = status.split(' to ');

  // Print the updates for both road lights on the server side
  console.log(`[Server] road_light_north updated to ${northStatus}`);
  console.log(`[Server] road_light_south updated to ${southStatus}`);

  callback(null, { message: `Light status updated: ${status}` });
}

// gRPC server setup
function main() {
  const server = new grpc.Server();
  server.addService(trafficProto.TrafficService.service, {
    RegisterClient: registerClient,
    scheduleRailLights: scheduleRailLights, // Keeping this function intact
    UpdateLightStatus: updateLightStatus,  // Keeping this function intact
  });

  const address = '127.0.0.1:50051';

  // Start gRPC server
  server.bindAsync(address, grpc.ServerCredentials.createInsecure(), (error, port) => {
    if (error) {
      console.error(`[Server] Error binding to address: ${error.message}`);
      return;
    }
    console.log(`[Server] gRPC server listening at ${address} (Port: ${port})`);
  });
}

main();
