# Live Malpe Fish Auction Dashboard 🐟⚡
> **Research Case-Study Application for Benchmarking VM, Container, and Serverless Cloud Architectures**

## Overview & Domain Context
Malpe Fish Harbor in Udupi, Karnataka is one of India's major coastal fisheries, handling over **100+ tons of fish daily** during peak morning auction hours (6:00 AM – 10:00 AM). Prices fluctuate dynamically every 5–10 minutes depending on fresh trawler arrivals and exporter demand.

This application digitizes and broadcasts live bids, boat arrivals, and aggregated price trends over WebSockets in real time to vendors, exporters, and retail buyers.

The codebase is built **architecture-agnostic**—allowing identical core code to be deployed across three distinct cloud architectures for cost, latency, and cold-start benchmarking:
1. **VM Deployment**: AWS EC2 with PM2 & Nginx
2. **Container Deployment**: AWS ECS Fargate with Docker
3. **Serverless Deployment**: AWS Lambda + API Gateway

---

## Tech Stack
- **Frontend**: Angular 17 (Standalone Components, Signals, RxJS), Socket.io-client, Chart.js
- **Backend**: Node.js, Express, Socket.io (Server)
- **Database**: MongoDB (Mongoose) with an abstract `DataRepository` interface compatible with key-value/DynamoDB access patterns
- **Auth**: Stateless JWT-based authentication with role-based access control (`Admin/Auctioneer`, `Vendor`, `Viewer`)
- **Benchmarking**: High-resolution response time logging (`process.hrtime()`) on every request for JMeter telemetry extraction

---

## Local Development & Setup

### Prerequisites
- Node.js v18+ & npm
- Docker & Docker Compose (or local MongoDB on port `27017`)

### 1. Start Database & Backend Services
```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Start local MongoDB via Docker (or use your own instance)
docker-compose up -d mongodb

# Seed database with mock Malpe auction data (~18 boats, 48 lots, 1000+ bids)
npm run seed

# Run backend API & Socket.io server
npm run dev
# Backend runs at http://localhost:3000
```

### 2. Start Angular Frontend
```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start Angular development server
npm run start
# Frontend opens at http://localhost:4200
```

---

## Real-Time Socket.io Events (`/live` Namespace)

| Event Name | Type | Payload / Description |
| :--- | :--- | :--- |
| `state:sync` | Server → Client | Initial snapshot of active lots, boats today, and price trends sent upon socket connection |
| `boat:arrived` | Broadcast | Triggered when Auctioneer logs a new trawler arrival |
| `lot:opened` | Broadcast | Triggered when a new fish lot is opened for bidding |
| `bid:placed` | Broadcast | Triggered when vendor places a bid; updates current price instantly across all connected clients |
| `lot:closed` | Broadcast | Triggered when auctioneer closes a lot and declares winning bidder |
| `price:trend-update` | Broadcast | Periodic update (every 5-10 mins) of average price per kg by fish type |

---

## Cloud Architecture Deployment & Benchmarking Guide

### Target 1: VM Architecture (AWS EC2)
- **Deployment Strategy**: EC2 t3.medium instance running Ubuntu 22.04 LTS.
- **Process Manager**: PM2 running Node.js in cluster mode across vCPUs.
- **Reverse Proxy**: Nginx handling SSL termination and proxying WebSocket upgrades (`Upgrade` and `Connection` headers) to `http://localhost:3000`.
- **Characteristics**: Low latency, persistent WebSocket connections, zero cold-starts, but fixed infrastructure cost regardless of traffic off-peak.

### Target 2: Container Architecture (AWS ECS Fargate)
- **Deployment Strategy**: Containerized using `backend/Dockerfile` and hosted on AWS ECS Fargate with AWS Application Load Balancer (ALB).
- **Auto-Scaling**: ECS service auto-scaling policy based on Target Tracking Scaling (CPU utilization > 70% or Request Count Per Target).
- **Characteristics**: Rapid horizontal scaling, isolated container runtime, seamless rolling deployments, moderate cost scaling with container tasks.

### Target 3: Serverless Architecture (AWS Lambda + API Gateway)
- **Deployment Strategy**: Express REST endpoints wrapped with `serverless-http` deployed to AWS Lambda via `serverless.yml`.
- **WebSocket Handling**: Since persistent Socket.io connections are non-native to stateless Lambda, real-time broadcasts use **AWS API Gateway WebSocket APIs** with connection IDs persisted in DynamoDB/MongoDB.
- **Benchmarking Focus**: Measuring **Cold-Start latency penalties** (VPC attach time, Node module initialization) under sudden traffic spikes vs. steady-state execution costs.

---

## Load Testing & JMeter Benchmarking Phase

The backend outputs high-resolution performance metrics to standard log streams:
```text
[BENCHMARK] 2026-08-05T10:48:09.123Z | POST /api/lots/lot_mlp_502/bids | Status: 201 | Latency: 3.842 ms
```

### JMeter Test Execution
1. Run `npm run seed` to generate realistic baseline data simulating an 8:00 AM morning auction rush.
2. Configure JMeter thread group:
   - **Threads**: 100 to 1,500 concurrent virtual vendors
   - **Ramp-Up**: 30 seconds (simulates fishermen & buyers arriving simultaneously)
   - **Target Endpoints**: `POST /api/lots/:id/bids` & `GET /api/price-trends`
3. Compare Response Latency Percentiles (p95, p99) and Throughput (RPS) across EC2, ECS Fargate, and Lambda deployments.
