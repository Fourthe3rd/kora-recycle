# ♻️ Kora-Recycle
> **The Garbage Collector for Solana Infrastructure**

![Dashboard Preview](kora-dashboard/public/preview.png)
*(Note: Add a screenshot of your dashboard here if you have one, or delete this line)*

**Kora-Recycle** is an automated infrastructure sidecar that reclaims lost SOL from dormant accounts for Kora Node operators. Powered by **Jito Bundles**, **Hexagonal Architecture**, and a real-time **Command Console**.

---

## 📉 The Problem
Running a Solana Node involves managing thousands of user accounts. When users abandon sessions or ephemeral sub-accounts ("dust"), they leave behind Rent-Exempt SOL (approx. 0.002 SOL per account).
* **The Cost:** 1,000 dormant accounts = ~2 SOL locked forever.
* **The Risk:** Manually closing accounts is dangerous (accidental user deletion) and slow.

## 🛡️ The Solution
Kora-Recycle is a "set-and-forget" backend service that acts as a localized Garbage Collector.
1.  **Snoops** the ledger for dormant accounts.
2.  **Judges** them against strict safety policies (Zero-Knowledge proof of emptiness).
3.  **Reaps** them using **Atomic Jito Bundles**, returning the rent deposit directly to the operator's wallet.

---

## 🏗️ Architecture
This project is built using **Hexagonal Architecture (Ports & Adapters)** to ensure domain logic is isolated from the blockchain layer.

```mermaid
graph TD
    User[Operator Console] -->|/seed 4| API[Express API]
    API -->|Commands| Domain
    
    subgraph "Core Domain"
        Judge[The Judge Policy]
        Snooper[Ledger Scanner]
    end
    
    subgraph "Infrastructure Adapters"
        RPC[Solana RPC]
        DB[(SQLite Persistence)]
        Jito[Jito Block Engine]
    end

    Snooper -->|Fetch| RPC
    Snooper -->|Write| DB
    Judge -->|Validate| DB
    Judge -->|Reclaim| Jito