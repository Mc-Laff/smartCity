const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const PROTO_PATH = path.join(__dirname, './proto/traffic.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH);
const trafficProto = grpc.loadPackageDefinition(packageDefinition).traffic;

const client = new trafficProto.TrafficService(
  'localhost:50051',
  grpc.credentials.createInsecure()
);

// Registering client
client.RegisterClient({ role: 'road_lights' }, (error, response) => {
  if (error) {
    console.error('[Client] Registration failed:', error.message);
  } else {
    console.log('[Client] Registration successful:', response.message);
  }
});

// Toggle light statuses every 5 seconds
let currentStatus = { north: 'GREEN', south: 'RED' };

function toggleLights() {
  // Update the statuses (toggle them)
  const newNorthStatus = currentStatus.north === 'GREEN' ? 'RED' : 'GREEN';
  const newSouthStatus = currentStatus.south === 'GREEN' ? 'RED' : 'GREEN';

  // Construct the status update message
  const statusUpdateMessage = `${currentStatus.north} to ${newNorthStatus}`;

  // Send the update to the server
  client.UpdateLightStatus(
    { status: statusUpdateMessage },
    (error, response) => {
      if (error) {
        console.error('[Client] Error:', error.message);
      } else {
        // Print the update for each light
        console.log(`[Client] road_light_north updated to ${newNorthStatus}`);
        console.log(`[Client] road_light_south updated to ${newSouthStatus}`);
      }
    }
  );

  // Update the current status for the next toggle
  currentStatus.north = newNorthStatus;
  currentStatus.south = newSouthStatus;
}

// Call the toggleLights function every 6 seconds
setInterval(toggleLights, 6000);
