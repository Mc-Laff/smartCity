const grpc = require('@grpc/grpc-js'); // core gRPC library used to create the server
const protoLoader = require('@grpc/proto-loader'); // loads our .proto definitions
const path = require('path');

const PROTO_PATH = path.join(__dirname, './proto/traffic.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH); // used to load and parse the proto
const trafficProto = grpc.loadPackageDefinition(packageDefinition).traffic;

const clients = {}; // use an object, not array

// registers clients as they connect
function registerClient(call, callback) {
  const { role, id } = call.request; // Ensuring ID is captured
  console.log(`[Control Panel] ${role.toUpperCase()} client connected with ID: ${id}`);
  clients[id] = { id, role };
  callback(null, { message: `Client ${id} registered successfully.` });
}

// method for direct grpc calls
function updateLightStatus(call, callback) {
  const { id, status } = call.request;
  console.log(`[Control Panel] Sending status update to client ${id}: ${status}`);
  callback(null, { message: `Status update sent to ${id}: ${status}` });
}

// this is the gRPC server setup
function main() {
  const server = new grpc.Server();
  server.addService(trafficProto.TrafficService.service, {
    RegisterClient: registerClient,
    UpdateLightStatus: updateLightStatus
  });

  const address = '0.0.0.0:50051';

  server.bindAsync(address, grpc.ServerCredentials.createInsecure(), () => {
    process.stdout.write(`[Server] gRPC server listening at ${address}\n`);

    // Start readline input AFTER server is ready
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '> ' // custom prompt
    });

    rl.prompt();

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

      const client = new trafficProto.TrafficService(
        'localhost:50052',
        grpc.credentials.createInsecure()
      );

      client.UpdateLightStatus({ id, status }, (err, response) => {
        if (err) {
          console.error(`[Server] Error updating status:`, err.message);
        } else {
          console.log(`[Server] Light status updated:`, response.message);
        }
        rl.prompt(); // prompt again after handling
      });
    });

    rl.on('close', () => {
      console.log('[Server] CLI input closed.');
    });
  });
}

main();
