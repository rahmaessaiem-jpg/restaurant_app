'use strict';

const path           = require('path');
const grpc           = require('@grpc/grpc-js');
const protoLoader    = require('@grpc/proto-loader');
const { randomUUID } = require('crypto');
const { Kafka }      = require('kafkajs');

const { initDb, getMenuItems, getMenuItemById, createOrder, findOrderById, findOrdersByUser } = require('./db');
const PROTO_PATH = path.join(__dirname, 'proto', 'order.proto');
const packageDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase: false,
  longs:    String,
  enums:    String,
  defaults: true,
  oneofs:   true,
});
const orderProto = grpc.loadPackageDefinition(packageDef).order;
const kafka    = new Kafka({ clientId: 'order-service', brokers: ['localhost:9092'] });
const producer = kafka.producer();

async function connectKafka() {
  try {
    await producer.connect();
    console.log('Kafka producer connected (order-service)');
  } catch (err) {
    console.warn('Kafka not available:', err.message);
  }
}

async function publishEvent(topic, data) {
  try {
    await producer.send({
      topic,
      messages: [{ key: data.orderId, value: JSON.stringify(data) }],
    });
    console.log('Event published to [${topic}]');
  } catch (err) {
    console.warn('Kafka publish failed:', err.message);
  }
}
async function GetMenu(call, callback) {
  const items = await getMenuItems();
  callback(null, { items });
}

async function PlaceOrder(call, callback) {
  const { userId, reservationId, items } = call.request;

  if (!userId || !items || items.length === 0) {
    return callback(null, {
      success: false,
      message: 'userId and at least one item are required',
      orderId: '',
      total:   0,
    });
  }
  let total = 0;
  for (const item of items) {
    const menuItem = await getMenuItemById(item.itemId);
    if (menuItem) {
      total += menuItem.price * item.quantity;
    }
  }

  const orderId = randomUUID();

  await createOrder({
    id: orderId,
    userId,
    reservationId: reservationId || '',
    items,
    total: parseFloat(total.toFixed(2)),
    createdAt: new Date().toISOString(),
  });

  await publishEvent('order-placed', { orderId, userId, total });

  callback(null, {
    success: true,
    message: 'Order placed successfully',
    orderId,
    total:   parseFloat(total.toFixed(2)),
  });
}

async function GetOrder(call, callback) {
  const { orderId } = call.request;
  const order = await findOrderById(orderId);

  if (!order) {
    return callback(null, {
      orderId: '', userId: '', reservationId: '',
      items: [], total: 0, status: '',
    });
  }

  callback(null, {
    orderId: order.id,
    userId: order.userId,
    reservationId: order.reservationId || '',
    items: order.items,
    total: order.total,
    status: order.status,
  });
}

async function ListOrders(call, callback) {
  const { userId } = call.request;
  const list = await findOrdersByUser(userId);

  const orders = list.map(order => ({
    orderId:       order.id,
    userId:        order.userId,
    reservationId: order.reservationId || '',
    items:         order.items,
    total:         order.total,
    status:        order.status,
  }));

  callback(null, { orders });
}
async function main() {
  await initDb();
  await connectKafka();

  const server = new grpc.Server();
  server.addService(orderProto.OrderService.service, {
    GetMenu,
    PlaceOrder,
    GetOrder,
    ListOrders,
  });

  server.bindAsync(
    '0.0.0.0:50053',
    grpc.ServerCredentials.createInsecure(),
    (err, port) => {
      if (err) { console.error('❌ Error:', err); return; }
      console.log(`Order Service running on port ${port}`);
    }
  );
}

main();