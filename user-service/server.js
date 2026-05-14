'use strict';

const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');
const { Kafka } = require('kafkajs');

const { initDb, createUser, findUserByEmail, findUserById } = require('./db');

const PROTO_PATH = path.join(__dirname, 'proto', 'user.proto');
const packageDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase: false,
  longs: String,
  enums: String,
  defaults: true,
  oneofs:true,
});
const userProto = grpc.loadPackageDefinition(packageDef).user;

const JWT_SECRET = 'restaurant_secret_2025';

const kafka = new Kafka({ clientId: 'user-service', brokers: ['localhost:9092'] });
const producer = kafka.producer();

async function connectKafka() {
  try {
    await producer.connect();
    console.log('Kafka producer connected');
  } catch (err) {
    console.warn('Kafka not available:', err.message);
  }
}

async function publishEvent(topic, data) {
  try {
    await producer.send({
      topic,
      messages: [{ key: data.userId, value: JSON.stringify(data) }],
    });
    console.log(`Event published to [${topic}]`);
  } catch (err) {
    console.warn(' Kafka publish failed:', err.message);
  }
}

async function Register(call, callback) {
  const { name, email, password } = call.request;

  if (!name || !email || !password) {
    return callback(null, { success: false, message: 'All fields required', userId: '' });
  }

  if (findUserByEmail(email)) {
    return callback(null, { success: false, message: 'Email already exists', userId: '' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const userId = randomUUID();

  createUser({ id: userId, name, email, password: hashedPassword, createdAt: new Date().toISOString() });

  await publishEvent('user-registered', { userId, name, email });

  callback(null, { success: true, message: 'Registered successfully', userId });
}

async function Login(call, callback) {
  const { email, password } = call.request;

  const user = findUserByEmail(email);
  if (!user) return callback(null, { success: false, token: '', message: 'User not found' });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return callback(null, { success: false, token: '', message: 'Wrong password' });

  const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });

  callback(null, { success: true, token, message: 'Login successful' });
}

function GetUser(call, callback) {
  const { userId } = call.request;
  const user = findUserById(userId);

  if (!user) return callback(null, { userId: '', name: '', email: '' });

  callback(null, { userId: user.id, name: user.name, email: user.email });
}

async function main() {
  await initDb();
  await connectKafka();

  const server = new grpc.Server();
  server.addService(userProto.UserService.service, { Register, Login, GetUser });

  server.bindAsync('0.0.0.0:50051', grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) { console.error('❌ Error:', err); return; }
    console.log(`🚀 User Service running on port ${port}`);
  });
}

main();