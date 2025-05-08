//Import required libraries first
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

//Load and parse the proto file
const PROTO_PATH = path.join(__dirname, './proto/traffic.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH);
const trafficProto = grpc.loadPackageDefinition(packageDefinition).traffic;

//Function to start the client
function main(){
  //Client connects to localhost:50051
  const client = new trafficProto.TrafficService('localhost:50051', grpc.credentials.createInsecure());

  //Client type is equal to 'train_barrier'
  const clientType = {role: 'train_barrier'};

  //Register the client= 'train_barrier' with the server
  client.RegisterClient(clientType, (error, response) => {
    if (error){
      console.error('[TrainBarrierClient] Registration failed:', error);
    } else {
      console.log('[TrainBarrierClient] Server response:', response.message);
    }
  });
}

//Run the main function
main();