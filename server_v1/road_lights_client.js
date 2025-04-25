// import required libraries first
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

// load and parse the proto file
const PROTO_PATH = path.join(__dirname, './proto/traffic.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH);
const trafficProto = grpc.loadPackageDefinition(packageDefinition).traffic;



function main() {
  const client = new trafficProto.TrafficService('localhost:50051', grpc.credentials.createInsecure());
	// client connects to localhost:50051
	// uses the insecure credentials to communicate in plain text with no certifications or encryption required

  const clientType = { role: 'road_light' };
	// defines the client type, we can improve on this later by adding more details other than the simple role if we want

  client.RegisterClient(clientType, (error, response) => {
    if (error) {
      console.error('[Client] Registration failed:', error);
    } else {
      console.log('[Client] Server response:', response.message);
    }
  });
}

main();
