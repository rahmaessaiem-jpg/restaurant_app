'use strict';

const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const { randomUUID } = require('crypto');
const { Kafka } = require('kafkajs');

const { initDb, createFeedback, findFeedbacksByOrder } = require('./db');
const PROTO_PATH = path.join(__dirname, 'proto', 'feedback.proto');
const packageDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase: false,
  longs: String,
  enums: String,
  defaults: true,
  oneofs:   true,
});
const feedbackProto = grpc.loadPackageDefinition(packageDef).feedback;
const kafka    = new Kafka({ clientId: 'feedback-service', brokers: ['localhost:9092'] });
const producer = kafka.producer();

async function connectKafka() {
  try {
    await producer.connect();
    console.log('Kafka producer connected (feedback-service)');
  } catch (err) {
    console.warn('Kafka not available:', err.message);
  }
}

async function publishEvent(topic, data) {
  try {
    await producer.send({
      topic,
      messages: [{ key: data.feedbackId, value: JSON.stringify(data) }],
    });
    console.log(`Event published to [${topic}]`);
  } catch (err) {
    console.warn('Kafka publish failed:', err.message);
  }
}
async function SubmitFeedback(call, callback) {
  const { userId, orderId, rating, comment } = call.request;

  if (!userId || !orderId || !rating) {
    return callback(null, {
      success: false,
      message:'userId, orderId and rating are required',
      feedbackId: '',
    });
  }

  if (rating < 1 || rating > 5) {
    return callback(null, {
      success:false,
      message:'Rating must be between 1 and 5',
      feedbackId: '',
    });
  }

  const feedbackId = randomUUID();

  createFeedback({
    id:        feedbackId,
    userId,
    orderId,
    rating,
    comment,
    createdAt: new Date().toISOString(),
  });
  await publishEvent('feedback-submitted', { feedbackId, userId, orderId, rating });

  callback(null, {
    success: true,
    message:'Feedback submitted successfully',
    feedbackId,
  });
}

function GetFeedbacks(call, callback) {
  const { orderId } = call.request;
  const list = findFeedbacksByOrder(orderId);

  const feedbacks = list.map(f => ({
    feedbackId: f.id,
    userId: f.userId,
    orderId: f.orderId,
    rating:f.rating,
    comment: f.comment || '',
    createdAt:f.createdAt,
  }));

  callback(null, { feedbacks });
}
async function main() {
  await initDb();
  await connectKafka();

  const server = new grpc.Server();
  server.addService(feedbackProto.FeedbackService.service, {
    SubmitFeedback,
    GetFeedbacks,
  });

  server.bindAsync(
    '0.0.0.0:50055',
    grpc.ServerCredentials.createInsecure(),
    (err, port) => {
      if (err) { console.error('Error:', err); return; }
      console.log(`Feedback Service running on port ${port}`);
    }
  );
}

main();