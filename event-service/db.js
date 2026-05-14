'use strict';

const { createRxDatabase }   = require('rxdb');
const { getRxStorageMemory } = require('rxdb/plugins/storage-memory');

let db;
let eventsCollection;

const eventSchema = {
  version: 0,
  primaryKey: 'eventId',
  type:'object',
  properties: {
    eventId:{ type: 'string', maxLength: 100 },
    title: { type: 'string' },
    description: { type: 'string' },
    date:  { type: 'string' },
    time: { type: 'string' },
    type: { type: 'string' },
    capacity: { type: 'number' },
    createdAt: { type: 'string' },
  },
  required: ['eventId', 'title', 'date', 'time', 'type', 'capacity'],
};

const SEED_EVENTS = [
  { eventId: 'e1', title: 'Jazz Night',description: 'Live jazz music every Friday', date: '2025-06-06', time: '20:00', type: 'music',  capacity: 50, createdAt: new Date().toISOString() },
  { eventId: 'e2', title: 'Italian Theme', description: 'Special Italian menu night',   date: '2025-06-13', time: '19:00', type: 'theme',  capacity: 40, createdAt: new Date().toISOString() },
  { eventId: 'e3', title: 'Wine Tasting',description: 'Curated wine selection night', date: '2025-06-20', time: '18:00', type: 'tasting',capacity: 30, createdAt: new Date().toISOString() },
];

async function initDb() {
  db = await createRxDatabase({
    name:    'restaurant_events',
    storage: getRxStorageMemory(),
  });

  await db.addCollections({
    events: { schema: eventSchema },
  });

  eventsCollection = db.events;

  for (const event of SEED_EVENTS) {
    await eventsCollection.upsert(event);
  }

  console.log('Event DB (RxDB) initialized');
}

async function getAllEvents() {
  const docs = await eventsCollection.find().exec();
  return docs.map(d => d.toJSON());
}

async function getEventById(eventId) {
  const doc = await eventsCollection.findOne(eventId).exec();
  return doc ? doc.toJSON() : null;
}

async function createEvent({ eventId, title, description, date, time, type, capacity }) {
  await eventsCollection.insert({
    eventId, title, description, date,
    time, type, capacity,
    createdAt: new Date().toISOString(),
  });
}

module.exports = { initDb, getAllEvents, getEventById, createEvent };