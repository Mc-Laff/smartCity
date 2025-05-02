const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const PROTO_PATH = path.join(__dirname, './proto/traffic.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH);
const trafficProto = grpc.loadPackageDefinition(packageDefinition).traffic;

const clients = {}; // to store registered clients

// Register clients as they connect
function registerClient(call, callback) {
  const { role, id } = call.request;
  console.log(`[Control Panel] ${role.toUpperCase()} client connected with ID: ${id}`);
  clients[id] = { id, role };
  callback(null, { message: `Client ${id} registered successfully.` });
}

// Method to update light status and broadcast to all connected clients
// This is part of the server code where you handle broadcasting
function updateLightStatus(call, callback) {
  const { status } = call.request;
  console.log(`[Server] Broadcasting status update to all clients: ${status}`);

  // loop through all connected clients and send the status update
  Object.keys(clients).forEach(clientId => {
    const client = new trafficProto.TrafficService(
      'localhost:50052',
      grpc.credentials.createInsecure()
    );

    client.UpdateLightStatus({ id: clientId, status }, (err, response) => {
      if (err) {
        console.error(`[Server] Error updating status for ${clientId}:`, err.message);
      } else {
        console.log(`[Server] Status updated for ${clientId}: ${response.message}`);
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

  // Start the readline interface after the server is ready
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '> '
  });

  rl.prompt(); // display the prompt

  rl.on('line', (input) => {
    const [id, status] = input.trim().split(' ');
    if (!id || !status) {
      console.log('[Server] Invalid input format. Example: road_light_1 RED');
      rl.prompt();
      return;
    }

    const clientInfo = clients[id];
    if (!clientInfo) {
      console.log(`[Server] No client with ID ${id} is connected.`);
      rl.prompt();
      return;
    }

    // Broadcast status update to all connected clients
    const client = new trafficProto.TrafficService(
      'localhost:50051',
      grpc.credentials.createInsecure()
    );

    client.UpdateLightStatus({ id, status }, (err, response) => {
      if (err) {
        console.error(`[Server] Error updating status:`, err.message);
      } else {
        console.log(`[Server] Light status updated:`, response.message);
      }
      rl.prompt(); // re-display the prompt
    });
  });

  rl.on('close', () => {
    console.log('[Server] CLI input closed.');
  });
}

main();
