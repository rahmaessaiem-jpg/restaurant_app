# Restaurant App — Microservices Architecture

We chose a restaurant management system built with a microservices architecture using Node.js

The application handles:
- User authentication (login & Register)
- reservations
- Food ordering
- Customer feedback
- Restaurant event management

Each feature is handled by an independent microservice communicating through gRPC and Kafka.


# What This Project Does

A customer can:
- Register and log in
- Browse the menu
- Reserve a table
- Book the restaurant for a private event
- Place food orders
- Leave feedback after their meal

The restaurant can also create and manage special events such as themed nights or live music events.

Each responsibility belongs to a separate microservice. Services do not share databases and do not communicate directly with each other. Communication happens through:
- API Gateway using gRPC
- Kafka event messaging

# Architecture

The client communicates only with the API Gateway.

The API Gateway exposes:
- REST API
- GraphQL API

The gateway routes requests to the correct microservice using gRPC.

When important actions happen, services publish Kafka events that are consumed by the Notification Service.

## Services and Ports

| Service | Port | Database |
|---------|------|----------|
| API Gateway | 3000 | None |
| User Service | 50051 | SQLite |
| Reservation Service | 50052 | SQLite |
| Order Service | 50053 | RxDB |
| Feedback Service | 50055 | SQLite |
| Event Service | 50056 | RxDB |

## Kafka Topics

| Topic | Published By | Consumed By |
|-------|--------------|-------------|
| user-registered | User Service | Notification Service |
| reservation-confirmed | Reservation Service | Notification Service |
| order-placed | Order Service | Notification Service |
| feedback-submitted | Feedback Service | Notification Service |
| event-created | Event Service | Notification Service |


# Services

## API Gateway
- Single entry point for the application
- Exposes REST endpoints and GraphQL API
- Communicates with all services using gRPC
- Contains no business logic

## User Service
- Handles registration and login
- Passwords hashed with bcrypt
- Returns JWT token after successful login
- Publishes `user-registered` Kafka event

## Reservation Service
- Handles table reservations and private event bookings
- Stores:
  - Reservation type
  - Date
  - Time
  - Number of guests
  - Notes
- Publishes `reservation-confirmed` event

## Order Service
- Handles menu and food orders
- Menu seeded on startup
- Automatically calculates order total
- Uses RxDB for flexible document storage
- Publishes `order-placed` event

## Feedback Service
- Allows customers to:
  - Rate experience from 1 to 5
  - Leave comments linked to orders

## Event Service
- Manages restaurant events:
  - Jazz nights
  - Wine tastings
  - Themed dinners
- Seeded with example events
- Uses RxDB

## Notification Service
- Listens to Kafka topics
- Logs notifications when events are received
- No database
- In production this could send emails or SMS notifications

---

# Tech Stack

- Node.js
- gRPC with Protocol Buffers
- REST API
- GraphQL with Apollo Server
- Apache Kafka (KRaft mode)
- sql.js (SQLite)
- RxDB with in-memory storage
- Docker
- Docker Compose

---

# Proto Files

Each service has its own `.proto` file defining the gRPC contract.

```text
user-service/proto/user.proto
reservation-service/proto/reservation.proto
order-service/proto/order.proto
notification-service/proto/notification.proto
feedback-service/proto/feedback.proto
event-service/proto/event.proto
```

---

# Databases

## User Service
- SQLite using sql.js
- Stores users and hashed passwords

## Reservation Service
- SQLite using sql.js
- Stores reservations and reservation status

## Feedback Service
- SQLite using sql.js
- Stores ratings and comments

## Order Service
- RxDB with in-memory storage
- Stores flexible order documents

## Event Service
- RxDB with in-memory storage
- Stores restaurant events

## Notification Service
- No database

---

# Installation and Running

## Run with Docker (Recommended)

Make sure Docker Desktop is installed and running.

```bash
git clone https://github.com/rahmaessaiem-jpg/restaurant_app.git 


cd restaurant-app

docker-compose up --build
```

The following services will start automatically:
- Kafka
- API Gateway
- All microservices

### API URLs

REST API:
```text
http://localhost:3000/api/
```

GraphQL:
```text
http://localhost:3000/graphql
```

### Stop Containers

```bash
docker-compose down
```

---

# Run Without Docker

Make sure Node.js and Apache Kafka are installed.

## Install Dependencies

```bash
cd user-service && npm install && cd ..

cd reservation-service && npm install && cd ..

cd order-service && npm install && cd ..

cd notification-service && npm install && cd ..

cd feedback-service && npm install && cd ..

cd event-service && npm install && cd ..

cd api-gateway && npm install && cd ..
```

## Start Kafka

```bash
cd C:\kafka

bin\windows\kafka-server-start.bat config\kraft\server.properties
```

## Start Services

Open a separate terminal for each service.

```bash
node user-service/server.js
```

```bash
node reservation-service/server.js
```

```bash
node order-service/server.js
```

```bash
node notification-service/server.js
```

```bash
node feedback-service/server.js
```

```bash
node event-service/server.js
```

```bash
node api-gateway/server.js
```

---

# REST API Endpoints

## Authentication

| Method | Endpoint | Description |
|--------|----------|--------------|
| POST | /api/register | Register new user |
| POST | /api/login | Login and get JWT token |
| GET | /api/users/:userId | Get user information |

## Reservations

| Method | Endpoint | Description |
|---|---|---|
| POST | /api/reservations | Create reservation |
| GET | /api/reservations/:reservationId | Get reservation |
| GET | /api/users/:userId/reservations | List user reservations |
| DELETE | /api/reservations/:reservationId | Cancel reservation |

## Orders

| Method | Endpoint | Description |
|---|---|---|
| GET | /api/menu | Get menu |
| POST | /api/orders | Place order |
| GET | /api/orders/:orderId | Get order |
| GET | /api/users/:userId/orders | List user orders |

## Feedback

| Method | Endpoint | Description |
|---|---|---|
| POST | /api/feedback | Submit feedback |
| GET | /api/feedback/:orderId | Get feedback for order |

## Events

| Method | Endpoint | Description |
|---|---|---|
| GET | /api/events | List events |
| POST | /api/events | Create event |
| GET | /api/events/:eventId | Get event |

---

# GraphQL API

GraphQL Playground:
```text
http://localhost:3000/graphql
```

GraphQL allows clients to request only the fields they need.

## Example Query — Menu

```graphql
query {
  getMenu {
    name
    price
  }
}
```

## Example Query — User Reservations

```graphql
query {
  listReservations(userId: "the user id") {
    reservationId
    type
    date
    status
  }
}
```

## Example Mutation — Place Order

```graphql
mutation {
  placeOrder(
    userId: "the user id"
    items: [{ itemId: "m3", quantity: 1 }]
  ) {
    success
    message
  }
}
```

---

# Project Structure

```text
restaurant-app/

api-gateway/
├── proto/
├── server.js
├── resolvers.js
└── schema.gql

user-service/
├── proto/
├── server.js
└── db.js

reservation-service/

order-service/

notification-service/

feedback-service/

event-service/

docker-compose.yml
```

---

# Authors

- Aline Aloulou Mahjoub — Reservation Service, Order Service, Event Service,API Gateway,Dockerfiles ,Postman testing for docker, Readme
- Rahma Essaiem — Project Structure ,User Service, Notification Service, Feedback Service, Docker Setup ,Postman Testing without docker , documentation