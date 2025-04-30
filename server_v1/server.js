const grpc = require("@grpc/grpc-js"); //core gRPC library used to create the server
const protoLoader = require("@grpc/proto-loader"); //loads our .proto definitions
const path = require("path");

const PROTO_PATH = path.join(__dirname, "./proto/traffic.proto");
const packageDefinition = protoLoader.loadSync(PROTO_PATH); //used to load and parse the proto
const trafficProto = grpc.loadPackageDefinition(packageDefinition).traffic;

// this method below runs when the client calls a RegisterClient rpc
// call.request is a message from the client telling the server which 'role' is connecting, 'road_lights' for example
// 'road_lights' is passed as a String and logged

function registerClient(call, callback) {
  const { role } = call.request;
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

  callback(null, {
    sendOut: sendOutMsg,
  });
  console.log(
    `⏰ Scheduled Trigger: ${new Date().toLocaleTimeString()}\n  ${sendOutMsg}`
  );
}

function main() {
  const server = new grpc.Server();
  server.addService(trafficProto.TrafficService.service, {
    RegisterClient: registerClient,
    scheduleRailLigths: scheduleRailLigths,
  });

  const address = "0.0.0.0:50051";
  server.bindAsync(address, grpc.ServerCredentials.createInsecure(), () => {
    console.log(`[Server]\n  gRPC server listening at ${address}`);
    server.start();
  });
}

// main() will then run the server
main();
