// import libraries
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const PROTO_PATH = path.join(__dirname, './proto/traffic.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH);
const trafficProto = grpc.loadPackageDefinition(packageDefinition).traffic;

const clients = {}; // to store registered clients

// hardcoded port mapping for each client role
// only way i could proceed without updating the registerClients function
const CLIENT_PORTS = {
  road_light_north: 50052,
  road_light_south: 50053,
  // we can add more client roles and ports here as needed
};

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

// first a new gRPC server is created
// TrafficService is added, and the RegisterClient rpc is then linked to the registerClient() function
// the address is set to '0.0.0.0:50051' allowing it to accept connections across all available networks
// ServerCredentials.createInsecure() means communication is passed from our server to our clients  with no encryption, certificates and in plain text
// once connection is complete the server starts and then logs the connection message

// Cross Rail lights toggled at specific times
function scheduleRailLigths(call, callback) {
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
  console.log(`[Server] Broadcasting status update to all clients: ${status}`);

  // loop through all connected clients and send the status update
  Object.keys(clients).forEach(clientRole => {
    const port = CLIENT_PORTS[clientRole];

    if (!port) {
      console.warn(`[Server] No port found for client: ${clientRole}`);
      return;
    }

    const client = new trafficProto.TrafficService(
      `localhost:${port}`,
      grpc.credentials.createInsecure()
    );

    // Now include both status and role
    client.UpdateLightStatus({ status, role: clientRole }, (err, response) => {
      if (err) {
        console.error(`[Server] Error updating status for ${clientRole}:`, err.message);
      } else {
        console.log(`[Server] Status updated for ${clientRole}: ${response.message}`);
      }
    });
  });

  callback(null, { message: `Light status updated: ${status}` });
}

// gRPC server setup
function main() {
  const server = new grpc.Server();
  server.addService(trafficProto.TrafficService.service, {
    RegisterClient: registerClient,
    scheduleRailLigths: scheduleRailLigths,
    UpdateLightStatus: updateLightStatus
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

  // command line interface for manual status updates
  const readline = require('readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: '> ' });
  rl.prompt();

  rl.on('line', (input) => {
    const [role, status] = input.trim().split(' ');
    if (!role || !status) {
      console.log('[Server] Invalid input. Example: road_light_north GREEN');
      rl.prompt();
      return;
    }

    // Manually send status update to the specified role
    const port = CLIENT_PORTS[role];
    if (!port) {
      console.warn(`[Server] No port configured for ${role}`);
      rl.prompt();
      return;
    }

    const client = new trafficProto.TrafficService(`localhost:${port}`, grpc.credentials.createInsecure());
    client.UpdateLightStatus({ status, role }, (err, response) => {
      if (err) {
        console.error(`[Server] Error updating status for ${role}:`, err.message);
      } else {
        console.log(`[Server] Light status updated for ${role}:`, response.message);
      }
      rl.prompt();
    });
  });

  rl.on('close', () => {
    console.log('[Server] CLI input closed.');
  });
}

main();
