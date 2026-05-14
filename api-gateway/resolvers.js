'use strict';

const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

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

const userClient = loadClient('user.proto', 'user', 'UserService', 'localhost:50051');
const reservationClient = loadClient('reservation.proto', 'reservation', 'ReservationService', 'localhost:50052');
const orderClient = loadClient('order.proto', 'order', 'OrderService', 'localhost:50053');
const notificationClient = loadClient('notification.proto', 'notification', 'NotificationService', 'localhost:50054');
const feedbackClient = loadClient('feedback.proto', 'feedback', 'FeedbackService', 'localhost:50055');
const eventClient = loadClient('event.proto', 'event', 'EventService', 'localhost:50056');

function grpcCall(client, method, request) {
  return new Promise((resolve, reject) => {
    client[method](request, (err, response) => {
      if (err) reject(err);
      else resolve(response);
    });
  });
}

const resolvers = {
  Query: {
    getUser: async (_, { userId }) => {
      const res = await grpcCall(userClient, 'GetUser', { userId });
      return res;
    },

    getReservation: async (_, { reservationId }) => {
      const res = await grpcCall(reservationClient, 'GetReservation', { reservationId });
      return res;
    },

    listReservations: async (_, { userId }) => {
      const res = await grpcCall(reservationClient, 'ListReservations', { userId });
      return res.reservations;
    },

    getMenu: async () => {
      const res = await grpcCall(orderClient, 'GetMenu', {});
      return res.items;
    },

    getOrder: async (_, { orderId }) => {
      const res = await grpcCall(orderClient, 'GetOrder', { orderId });
      return res;
    },

    listOrders: async (_, { userId }) => {
      const res = await grpcCall(orderClient, 'ListOrders', { userId });
      return res.orders;
    },

    getFeedbacks: async (_, { orderId }) => {
      const res = await grpcCall(feedbackClient, 'GetFeedbacks', { orderId });
      return res.feedbacks;
    },

    listEvents: async () => {
      const res = await grpcCall(eventClient, 'ListEvents', {});
      return res.events;
    },

    getEvent: async (_, { eventId }) => {
      const res = await grpcCall(eventClient, 'GetEvent', { eventId });
      return res.event;
    },
  },

  Mutation: {
    register: async (_, { name, email, password }) => {
      const res = await grpcCall(userClient, 'Register', { name, email, password });
      return { success: res.success, message: res.message };
    },

    login: async (_, { email, password }) => {
      const res = await grpcCall(userClient, 'Login', { email, password });
      return { success: res.success, token: res.token, message: res.message };
    },

    createReservation: async (_, args) => {
      const res = await grpcCall(reservationClient, 'CreateReservation', args);
      return { success: res.success, message: res.message };
    },

    cancelReservation: async (_, { reservationId }) => {
      const res = await grpcCall(reservationClient, 'CancelReservation', { reservationId });
      return { success: res.success, message: res.message };
    },

    placeOrder: async (_, args) => {
      const res = await grpcCall(orderClient, 'PlaceOrder', args);
      return { success: res.success, message: res.message };
    },

    submitFeedback: async (_, args) => {
      const res = await grpcCall(feedbackClient, 'SubmitFeedback', args);
      return { success: res.success, message: res.message };
    },

    createEvent: async (_, args) => {
      const res = await grpcCall(eventClient, 'CreateEvent', args);
      return { success: res.success, message: res.message };
    },
  },
};

module.exports = { resolvers };