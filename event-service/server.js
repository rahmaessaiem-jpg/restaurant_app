'use strict';

const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader= require('@grpc/proto-loader');
const { randomUUID } = require('crypto');
const { Kafka }= require('kafkajs');

const { initDb, getAllEvents, getEventById, createEvent } = require('./db');
const PROTO_PATH = path.join(__dirname, 'proto', 'event.proto');
const packageDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase: false,
  longs:    String,
  enums:    String,
  defaults: true,
  oneofs:   true,
});
const eventProto = grpc.loadPackageDefinition(packageDef).event;
const kafka = new Kafka({ 
  clientId: '...', 
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'] 
});
const producer = kafka.producer();

async function connectKafka() {
  try {
    await producer.connect();
    console.log('Kafka producer connected (event-service)');
  } catch (err) {
    console.warn(' Kafka not available:', err.message);
  }
}

async function publishEvent(topic, data) {
  try {
    await producer.send({
      topic,
      messages: [{ key: data.eventId, value: JSON.stringify(data) }],
    });
    console.log(`Event published to [${topic}]`);
  } catch (err) {
    console.warn(' Kafka publish failed:', err.message);
  }
}

async function CreateEvent(call, callback) {
  const { title, description, date, time, type, capacity } = call.request;

  if (!title || !date || !time || !type || !capacity) {
    return callback(null, {
      success: false,
      message: 'Missing required fields',
      eventId: '',
    });
  }

  const eventId = randomUUID();

  await createEvent({ eventId, title, description, date, time, type, capacity });

  await publishEvent('event-created', { eventId, title, date, time, type });

  callback(null, { success: true, message: 'Event created successfully', eventId });
}

async function ListEvents(call, callback) {
  const events = await getAllEvents();

  const result = events.map(e => ({
    eventId:e.eventId,
    title: e.title,
    description: e.description || '',
    date: e.date,
    time: e.time,
    type: e.type,
    capacity: e.capacity,
  }));

  callback(null, { events: result });
}

async function GetEvent(call, callback) {
  const { eventId } = call.request;
  const e = await getEventById(eventId);

  if (!e) {
    return callback(null, { event: null });
  }

  callback(null, {
    event: {
      eventId: e.eventId,
      title: e.title,
      description: e.description || '',
      date: e.date,
      time: e.time,
      type: e.type,
      capacity: e.capacity,
    },
  });
}

async function main() {
  await initDb();
  await connectKafka();

  const server = new grpc.Server();
  server.addService(eventProto.EventService.service, {
    CreateEvent,
    ListEvents,
    GetEvent,
  });

  server.bindAsync(
    '0.0.0.0:50056',
    grpc.ServerCredentials.createInsecure(),
    (err, port) => {
      if (err) { console.error('Error:', err); return; }
      console.log(`Event Service running on port ${port}`);
    }
  );
}

main();