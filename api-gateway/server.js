'use strict';

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@as-integrations/express4');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const { resolvers } = require('./resolvers');

const app = express();
app.use(cors());
app.use(express.json());

function loadClient(protoFile, packageName, serviceName, address) {
  const def = protoLoader.loadSync(path.join(__dirname, 'proto', protoFile), {
    keepCase: false,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });
  const pkg = grpc.loadPackageDefinition(def)[packageName];
  return new pkg[serviceName](address, grpc.credentials.createInsecure());
}

const USER_SERVICE = process.env.USER_SERVICE || 'localhost:50051';
const RESERVATION_SERVICE = process.env.RESERVATION_SERVICE || 'localhost:50052';
const ORDER_SERVICE = process.env.ORDER_SERVICE  || 'localhost:50053';
const FEEDBACK_SERVICE = process.env.FEEDBACK_SERVICE || 'localhost:50055';
const EVENT_SERVICE = process.env.EVENT_SERVICE || 'localhost:50056';

const userClient = loadClient('user.proto',        'user',        'UserService',USER_SERVICE);
const reservationClient = loadClient('reservation.proto', 'reservation', 'ReservationService', RESERVATION_SERVICE);
const orderClient = loadClient('order.proto',       'order',       'OrderService', ORDER_SERVICE);
const feedbackClient = loadClient('feedback.proto',    'feedback',    'FeedbackService',FEEDBACK_SERVICE);
const eventClient  = loadClient('event.proto',       'event',       'EventService', EVENT_SERVICE);
function grpcCall(client, method, request) {
  return new Promise((resolve, reject) => {
    client[method](request, (err, response) => {
      if (err) reject(err);
      else resolve(response);
    });
  });
}

app.post('/api/register', async (req, res) => {
  try {
    const result = await grpcCall(userClient, 'Register', {
      name: req.body.name,
      email: req.body.email,
      password: req.body.password
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    console.log('Login request body:', req.body);
    const result = await grpcCall(userClient, 'Login', {
      email: req.body.email,
      password: req.body.password
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get('/api/users/:userId', async (req, res) => {
  try {
    const result = await grpcCall(userClient, 'GetUser', { userId: req.params.userId });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reservations', async (req, res) => {
  try {
    const result = await grpcCall(reservationClient, 'CreateReservation', req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reservations/:reservationId', async (req, res) => {
  try {
    console.log('Gateway calling GetReservation with:', req.params.reservationId);
    const result = await grpcCall(reservationClient, 'GetReservation', { reservationId: req.params.reservationId });
    console.log('Gateway got result:', JSON.stringify(result));
    res.json(result);
  } catch (err) {
    console.log('Gateway error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/users/:userId/reservations', async (req, res) => {
  try {
    const result = await grpcCall(reservationClient, 'ListReservations', { userId: req.params.userId });
    res.json(result.reservations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/reservations/:reservationId', async (req, res) => {
  try {
    const result = await grpcCall(reservationClient, 'CancelReservation', { reservationId: req.params.reservationId });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/menu', async (req, res) => {
  try {
    const result = await grpcCall(orderClient, 'GetMenu', {});
    res.json(result.items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const result = await grpcCall(orderClient, 'PlaceOrder', req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/orders/:orderId', async (req, res) => {
  try {
    const result = await grpcCall(orderClient, 'GetOrder', { orderId: req.params.orderId });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/users/:userId/orders', async (req, res) => {
  try {
    const result = await grpcCall(orderClient, 'ListOrders', { userId: req.params.userId });
    res.json(result.orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/feedback', async (req, res) => {
  try {
    const result = await grpcCall(feedbackClient, 'SubmitFeedback', req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/feedback/:orderId', async (req, res) => {
  try {
    const result = await grpcCall(feedbackClient, 'GetFeedbacks', { orderId: req.params.orderId });
    res.json(result.feedbacks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/events', async (req, res) => {
  try {
    const result = await grpcCall(eventClient, 'ListEvents', {});
    res.json(result.events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/events', async (req, res) => {
  try {
    const result = await grpcCall(eventClient, 'CreateEvent', req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/events/:eventId', async (req, res) => {
  try {
    const result = await grpcCall(eventClient, 'GetEvent', { eventId: req.params.eventId });
    res.json(result.event);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/orders/:orderId/status', async (req, res) => {
  try {
    const result = await grpcCall(orderClient, 'UpdateOrderStatus', {
      orderId: req.params.orderId,
      status:  req.body.status,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function startServer() {
  const typeDefs = fs.readFileSync(path.join(__dirname, 'schema.gql'), 'utf8');
  const apolloServer = new ApolloServer({ typeDefs, resolvers });
  await apolloServer.start();
  app.use('/graphql', expressMiddleware(apolloServer));
  app.listen(3000, () => {
    console.log('API Gateway running on port 3000');
    console.log('REST http://localhost:3000/api/...');
    console.log('GraphQL http://localhost:3000/graphql');
  });
}

startServer();