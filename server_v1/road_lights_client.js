// import required libraries first
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

// load and parse the proto file
const PROTO_PATH = path.join(__dirname, './proto/traffic.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH);
const trafficProto = grpc.loadPackageDefinition(packageDefinition).traffic;

let lightColour = 'GREEN'; 
// setting a default light colour for when the client connects
// both sets of lights will default to green on connection

function main() {
  // set up a gRPC server to listen for control messages from main server
  const server = new grpc.Server();
  
  server.addService(trafficProto.TrafficService.service, {
    RegisterClient: (call, callback) => {
      callback(null, { message: 'Already registered.' });
      // required by gRPC as based on proto definition
    },
    UpdateLightStatus: (call, callback) => {
      const { status } = call.request;
      lightColour = status;
      console.log(`[Road Light] Light switched to: ${lightColour}`);
      // when UpdateLightStatus is called from the server, we update our lightColour and log it
      callback(null, { message: `Light status updated to ${status}` });
    }
  });

  const clientServerAddress = '0.0.0.0:50052'; // client listens here for incoming gRPC messages from server
  server.bindAsync(clientServerAddress, grpc.ServerCredentials.createInsecure(), () => {
    console.log(`[Road Light] Client gRPC server listening at ${clientServerAddress}`);
  });

  // next we create a client connection back to the main traffic control server
  const client = new trafficProto.TrafficService('localhost:50051', grpc.credentials.createInsecure());
  // client connects to localhost:50051
  // uses insecure credentials for now

  const clientType = { 
    id: 'road_light_1', // make sure this matches the id expected on the server
    role: 'road_light' 
  };
  // defines the client type, we can improve on this later by adding more details other than the simple role if we want

  client.RegisterClient(clientType, (error, response) => {
    if (error) {
      console.error('[Client] Registration failed:', error);
    } else {
      console.log('[Client] Server response:', response.message); // displaying server registration response
      console.log(`[Road Light] Current status: ${lightColour}`); // corrected template string here with backticks `
    }
  });
}

main();