'use strict';

const path        = require('path');
const grpc        = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const { Kafka }   = require('kafkajs');
const PROTO_PATH = path.join(__dirname, 'proto', 'notification.proto');
const packageDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase: false,
  longs:    String,
  enums:    String,
  defaults: true,
  oneofs:   true,
});
const notificationProto = grpc.loadPackageDefinition(packageDef).notification;
const kafka    = new Kafka({ clientId: 'notification-service', brokers: ['localhost:9092'] });
const consumer = kafka.consumer({ groupId: 'notification-group' });

async function startKafkaConsumer() {
  try {
    await consumer.connect();

    await consumer.subscribe({ topics: ['user-registered', 'reservation-confirmed', 'order-placed'], fromBeginning: false });

    await consumer.run({
      eachMessage: async ({ topic, message }) => {
        const data = JSON.parse(message.value.toString());

        if (topic === 'user-registered') {
          console.log(`NOTIFICATION: Welcome ${data.name}! Your account has been created.`);
        }

        if (topic === 'reservation-confirmed') {
          console.log(`NOTIFICATION: Reservation confirmed for user ${data.userId} on ${data.date} at ${data.time}.`);
        }

        if (topic === 'order-placed') {
          console.log(`NOTIFICATION: Order ${data.orderId} placed successfully for user ${data.userId}. Total: $${data.total}`);
        }
      },
    });

    console.log('Kafka consumer listening (notification-service)');
  } catch (err) {
    console.warn('Kafka not available:', err.message);
  }
}
function SendNotification(call, callback) {
  const { userId, type, message } = call.request;

  console.log(`NOTIFICATION [${type}] to user ${userId}: ${message}`);

  callback(null, { success: true, message: 'Notification sent' });
}
async function main() {
  await startKafkaConsumer();

  const server = new grpc.Server();
  server.addService(notificationProto.NotificationService.service, { SendNotification });

  server.bindAsync(
    '0.0.0.0:50054',
    grpc.ServerCredentials.createInsecure(),
    (err, port) => {
      if (err) { console.error('Error:', err); return; }
      console.log(`Notification Service running on port ${port}`);
    }
  );
}

main();