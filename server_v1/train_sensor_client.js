//Import required libraries first
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");

//Load and parse the proto file
const PROTO_PATH = path.join(__dirname, "./proto/traffic.proto");
const packageDefinition = protoLoader.loadSync(PROTO_PATH);
const trafficProto = grpc.loadPackageDefinition(packageDefinition).traffic;

//Function to start the client
function main() {
  //Client connects to localhost:50051
  const client = new trafficProto.TrafficService(
    "localhost:50051",
    grpc.credentials.createInsecure()
  );

  //Client type is equal to 'sensor'
  const clientType = { role: "sensor" };

  // Wait 15 seconds, then simulate train passed
  setTimeout(() => {
    sendSensorSignal(client, false); // Train has passed
  }, 15000);
}

//Function to simulate the detection of the train by the sensor
// Function to simulate detection
function sendSensorSignal(client, isDetected) {
  const sensorSignal = {
    trainDetected: isDetected,
  };

  client.TriggerSensor(sensorSignal, (error, response) => {
    if (error) {
      console.error("[SensorClient] Error sending sensor signal:", error);
    } else {
      console.log(`[SensorClient] Server response: ${response.message}`);
    }
  });
}

//Run the main function
main();
