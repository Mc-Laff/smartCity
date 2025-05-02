const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

// load and parse the proto file
const PROTO_PATH = path.join(__dirname, './proto/traffic.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH);
const trafficProto = grpc.loadPackageDefinition(packageDefinition).traffic;

let lightColour = 'GREEN'; // Default color

function main() {
  // Set up gRPC server to listen for updates
  const server = new grpc.Server();
  
  server.addService(trafficProto.TrafficService.service, {
    RegisterClient: (call, callback) => {
      callback(null, { message: 'Already registered.' });
    },
    UpdateLightStatus: (call, callback) => {
      const { status, id } = call.request;
      if (id !== 'north_light' && id !== 'south_light') {
        callback(null, { message: 'Ignored, not my ID.' });
        return;
      }
  
      lightColour = status;
      console.log(`[${id}] Light switched to: ${lightColour}`);
      callback(null, { message: `Light status updated to ${status}` });
    }
  });
  

  const clientServerAddress = '0.0.0.0:50053'; // Different port for south light
  server.bindAsync(clientServerAddress, grpc.ServerCredentials.createInsecure(), () => {
    console.log(`[South Light] Client gRPC server listening at ${clientServerAddress}`);
  });

  // Connecting back to server
  const client = new trafficProto.TrafficService('localhost:50051', grpc.credentials.createInsecure());

  const clientType = { 
    id: 'south_light',  // Unique client ID for south light
    role: 'road_light'  // Role is the same (road_light) but ID is different
  };

  client.RegisterClient(clientType, (error, response) => {
    if (error) {
      console.error('[South Light] Registration failed:', error);
    } else {
      console.log('[South Light] Server response:', response.message);
      console.log(`[South Light] Current status: ${lightColour}`);
    }
  });
}

main();
