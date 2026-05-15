'use strict';

const path           = require('path');
const grpc           = require('@grpc/grpc-js');
const protoLoader    = require('@grpc/proto-loader');
const { randomUUID } = require('crypto');
const { Kafka }      = require('kafkajs');

const { initDb, createReservation, findReservationById, findReservationsByUser, cancelReservation } = require('./db');
const PROTO_PATH = path.join(__dirname, 'proto', 'reservation.proto');
const packageDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase: false,
  longs:    String,
  enums:    String,
  defaults: true,
  oneofs:   true,
});
const reservationProto = grpc.loadPackageDefinition(packageDef).reservation;
const kafka    = new Kafka({ clientId: 'reservation-service', brokers: ['localhost:9092'] });
const producer = kafka.producer();

async function connectKafka() {
  try {
    await producer.connect();
    console.log('Kafka producer connected (reservation-service)');
  } catch (err) {
    console.warn(' Kafka not available:', err.message);
  }
}

async function publishEvent(topic, data) {
  try {
    await producer.send({
      topic,
      messages: [{ key: data.reservationId, value: JSON.stringify(data) }],
    });
    console.log(`Event published to [${topic}]`);
  } catch (err) {
    console.warn('Kafka publish failed:', err.message);
  }
}
async function CreateReservation(call, callback) {
  const { userId, type, date, time, guests, notes } = call.request;

  if (!userId || !type || !date || !time || !guests) {
    return callback(null, {
      success: false,
      message: 'Missing required fields',
      reservationId: '',
    });
  }

  const reservationId = randomUUID();

  createReservation({
    id:        reservationId,
    userId,
    type,
    date,
    time,
    guests,
    notes,
    createdAt: new Date().toISOString(),
  });

  await publishEvent('reservation-confirmed', {
    reservationId, userId, type, date, time, guests,
  });

  callback(null, {
    success: true,
    message: 'Reservation confirmed!',
    reservationId,
  });
}

function GetReservation(call, callback) {
  const { reservationId } = call.request;
  console.log('Looking for reservation:', reservationId);
  
  const r = findReservationById(reservationId);
  console.log('Found:', r);

  if (!r) {
    return callback({
      code: grpc.status.NOT_FOUND,
      message: 'Reservation not found',
    });
  }

  callback(null, {
    reservationId: r.id,
    userId: r.userId,
    type:  r.type,
    date: r.date,
    time: r.time,
    guests: r.guests,
    status: r.status,
    notes: r.notes || '',
  });
}

function ListReservations(call, callback) {
  const { userId } = call.request;
  const list = findReservationsByUser(userId);

  const reservations = list.map(r => ({
    reservationId: r.id,
    userId: r.userId,
    type: r.type,
    date: r.date,
    time: r.time,
    guests: r.guests,
    status: r.status,
    notes: r.notes || '',
  }));

  callback(null, { reservations });
}

function CancelReservation(call, callback) {
  const { reservationId } = call.request;
  console.log('CancelReservation called with:', reservationId);
  
  const r = findReservationById(reservationId);
  console.log('Found reservation:', r);

  if (!r) {
    return callback(null, { success: false, message: 'Reservation not found' });
  }

  cancelReservation(reservationId);
  callback(null, { success: true, message: 'Reservation cancelled' });
}
async function main() {
  await initDb();
  await connectKafka();

  const server = new grpc.Server();
  server.addService(reservationProto.ReservationService.service, {
    CreateReservation,
    GetReservation,
    ListReservations,
    CancelReservation,
  });

  server.bindAsync(
    '0.0.0.0:50052',
    grpc.ServerCredentials.createInsecure(),
    (err, port) => {
      if (err) { console.error('Error:', err); return; }
      console.log(`Reservation Service running on port ${port}`);
    }
  );
}

main();