'use strict';

const { createRxDatabase } = require('rxdb');
const { getRxStorageMemory } = require('rxdb/plugins/storage-memory');

let db;
let ordersCollection;
let menuCollection;
const orderSchema = {
  version:    0,
  primaryKey: 'id',
  type:       'object',
  properties: {
    id:            { type: 'string', maxLength: 100 },
    userId:        { type: 'string' },
    reservationId: { type: 'string' },
    items:         { type: 'array', items: { type: 'object' } },
    total:         { type: 'number' },
    status:        { type: 'string' },
    createdAt:     { type: 'string' },
  },
  required: ['id', 'userId', 'items', 'total', 'status', 'createdAt'],
};

const menuSchema = {
  version:    0,
  primaryKey: 'itemId',
  type:       'object',
  properties: {
    itemId:      { type: 'string', maxLength: 100 },
    name:        { type: 'string' },
    description: { type: 'string' },
    price:       { type: 'number' },
    category:    { type: 'string' },
  },
  required: ['itemId', 'name', 'price', 'category'],
};

const MENU_ITEMS = [
  { itemId: 'm1', name: 'Bruschetta',       description: 'Toasted bread with tomatoes',  price: 6.5,  category: 'starter'  },
  { itemId: 'm2', name: 'Caesar Salad',     description: 'Classic caesar with croutons', price: 8.0,  category: 'starter'  },
  { itemId: 'm3', name: 'Grilled Salmon',   description: 'With lemon butter sauce',      price: 18.5, category: 'main'     },
  { itemId: 'm4', name: 'Beef Tenderloin',  description: 'With roasted vegetables',      price: 24.0, category: 'main'     },
  { itemId: 'm5', name: 'Pasta Carbonara',  description: 'Creamy pasta with pancetta',   price: 14.0, category: 'main'     },
  { itemId: 'm6', name: 'Tiramisu',         description: 'Classic Italian dessert',      price: 7.0,  category: 'dessert'  },
  { itemId: 'm7', name: 'Chocolate Mousse', description: 'Rich dark chocolate mousse',   price: 6.5,  category: 'dessert'  },
  { itemId: 'm8', name: 'Sparkling Water',  description: '500ml bottle',                 price: 3.0,  category: 'drink'    },
  { itemId: 'm9', name: 'House Wine',       description: 'Red or white, glass',          price: 5.5,  category: 'drink'    },
];
async function initDb() {
  db = await createRxDatabase({
    name:    'restaurant_orders',
    storage: getRxStorageMemory(),
  });

  await db.addCollections({
    orders: { schema: orderSchema },
    menu:   { schema: menuSchema  },
  });

  ordersCollection = db.orders;
  menuCollection   = db.menu;

  for (const item of MENU_ITEMS) {
    await menuCollection.upsert(item);
  }

  console.log('Order DB (RxDB) initialized');
}
async function getMenuItems() {
  const docs = await menuCollection.find().exec();
  return docs.map(d => d.toJSON());
}

async function getMenuItemById(itemId) {
  const doc = await menuCollection.findOne(itemId).exec();
  return doc ? doc.toJSON() : null;
}
async function createOrder({ id, userId, reservationId, items, total, createdAt }) {
  await ordersCollection.insert({
    id,
    userId,
    reservationId: reservationId || '',
    items,
    total,
    status:    'pending',
    createdAt,
  });
}

async function findOrderById(id) {
  const doc = await ordersCollection.findOne(id).exec();
  return doc ? doc.toJSON() : null;
}

async function findOrdersByUser(userId) {
  const docs = await ordersCollection.find({ selector: { userId } }).exec();
  return docs.map(d => d.toJSON());
}

module.exports = { initDb, getMenuItems, getMenuItemById, createOrder, findOrderById, findOrdersByUser };