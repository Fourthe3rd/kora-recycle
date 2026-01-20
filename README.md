♻️ Kora-Recycle
The Garbage Collector for Solana Infrastructure
<p align="center"> <img src="kora-dashboard/public/dashboard.png" alt="Kora Dashboard Preview" width="85%" /> </p>

Kora-Recycle is an automated infrastructure sidecar that reclaims lost SOL from dormant Solana accounts for Kora Node operators.
Built with Jito Bundles, Hexagonal Architecture, and a real-time Command Console.

📌 Table of Contents

The Problem

The Solution

Key Features

Architecture

Technology Stack

Getting Started

Usage Guide

Core Components

Hackathon Notes

Screenshots

📉 The Problem

Operating a Solana node at scale involves managing thousands of transient accounts.
When sessions end or ephemeral sub-accounts (“dust”) are abandoned, rent-exempt SOL becomes permanently locked.

💸 Cost: 1,000 dormant accounts ≈ 2 SOL locked

⚠️ Risk: Manual cleanup is slow and error-prone

🧨 Danger: Accidental deletion of active user accounts

Once rent is locked, there is no native garbage collector.

🛡️ The Solution

Kora-Recycle is a set-and-forget infrastructure service that safely reclaims abandoned rent deposits.

How it works

Snoops the ledger for dormant, operator-owned accounts

Judges them against strict safety policies

Reaps them via atomic Jito bundles, returning SOL directly to the operator

✔️ All operations are all-or-nothing
✔️ No partial reclaims
✔️ No gas waste
✔️ No user risk

✨ Key Features

♻️ Automated SOL reclamation

🧠 Policy-driven safety engine

⚛️ Atomic Jito MEV bundles

📊 Real-time dashboard & metrics

🧪 Built-in simulation engine

🧱 Hexagonal (Ports & Adapters) architecture

🏗️ Architecture

Kora-Recycle follows Hexagonal Architecture to isolate domain logic from blockchain and infrastructure concerns.

graph TD
    User[Operator Console] -->|/seed 4| API[Express API]
    API -->|Commands| Domain

    subgraph "Core Domain"
        Snooper[Ledger Snooper]
        Judge[Policy Judge]
    end

    subgraph "Infrastructure Adapters"
        RPC[Solana RPC]
        DB[(SQLite)]
        Jito[Jito Block Engine]
    end

    Snooper -->|Scan| RPC
    Snooper -->|Persist| DB
    Judge -->|Validate| DB
    Judge -->|Execute| Jito

🧰 Technology Stack
Backend

TypeScript

Node.js + Express

SQLite (better-sqlite3)

Solana Web3.js

Jito SDK (MEV Bundles)

Frontend

React

Vite

TailwindCSS

Framer Motion

🚀 Getting Started
Prerequisites

Node.js v18+

npm or yarn

Solana Wallet (Operator Keypair)

1️⃣ Backend Setup (Infrastructure Layer)
git clone https://github.com/fourthe3rd/kora-recycle.git
cd kora-recycle
npm install

Environment Configuration
cp .env.example .env


Update .env:

SOLANA_RPC_URL=https://api.devnet.solana.com
KORA_FEE_PAYER=YOUR_PUBLIC_KEY
KORA_OPERATOR_KEY=YOUR_PRIVATE_KEY_BASE58

2️⃣ Frontend Setup (Command Center)
cd kora-dashboard
npm install
npm run dev

🎮 Usage Guide
Step 1: Start the Backend
npx ts-node src/cmd/server/main.ts


Expected output:

📡 Kora Command Uplink: http://localhost:3001

Step 2: Open the Dashboard

Navigate to:

http://localhost:5173


You’ll see:

Live Activity Stream

Total SOL Reclaimed

Bundle Execution Logs

Step 3: Run a Simulation

In the Dashboard Terminal, enter:

/seed 4


What happens:

4 disposable accounts are created (Devnet)

Snooper detects them

Judge validates safety

Reaper bundles & closes them

💰 Rent is reclaimed

🧪 Core Components
🕵️ Snooper (Scanner)

Periodic ledger scan (default: 10s)

Identifies operator-created dormant accounts

Persists candidates in SQLite

⚖️ Judge (Policy Engine)

Marks an account SAFE_TO_REAP only if:

Owned by the correct Program ID

Zero active lamports (excluding rent)

Dormant for > X blocks

📍 Location: src/internal/domain/services/judge.ts

💀 Reaper (Jito Integration)

Builds atomic transaction bundles

Closes N accounts

Adds validator tip

Guarantees all-or-nothing execution

📍 Location: src/internal/infrastructure/jito

🏆 Hackathon Notes

Jito Integration: src/internal/infrastructure/jito

Safety Logic: src/internal/domain/services/judge.ts

Simulation Engine: /seed command in trash_service.ts