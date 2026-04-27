# Playto Payout Engine - Explainer

## Architecture Overview

The Playto Payout Engine is a robust, full-stack application designed to manage merchant balances, ledger entries, and payout requests with strict financial integrity. The project is split into a Django/Django REST Framework (DRF) backend and a React/Vite frontend.

### 1. Technology Stack
- **Backend:** Django, Django REST Framework, PostgreSQL
- **Asynchronous tasks:** Celery and Redis
- **Frontend:** React, Vite, Tailwind CSS (OmniPay Dashboard)
- **Database:** PostgreSQL

### 2. Core Functional Components
- **Merchant Management:** Represents the entity making payouts, tracking their overall balance.
- **Ledger System (`LedgerEntry`):** An append-only ledger system tracking all credit and debit operations against merchant accounts.
- **Payout Handling (`Payout`):** Handles the lifecycle of a payout request (Pending -> Processing -> Completed/Failed).
- **Idempotency System (`IdempotencyKey`):** Ensures that concurrent or repeated identical requests do not result in double processing or double deductions.

## Concurrency Control & Financial Integrity

Ensuring that a merchant's balance is never overdrawn required strict database-level concurrency controls and state management.

### Row-Level Locking (`select_for_update`)
In the `create_payout` view, when evaluating balance requirements, we aggressively lock rows:
1. **Idempotency Key Lock:** `IdempotencyKey.objects.select_for_update().get_or_create(...)` ensures that concurrent requests with the exact same Idempotency-Key are blocked until the first one completes. This prevents identical requests from simultaneously breaching balance checks.
2. **Merchant Lock:** We lock the merchant row (`Merchant.objects.select_for_update().get(id=...)`) ahead of balance evaluation and ledger debiting. Given the ledger balances are aggregations of ledger row amounts, locking the merchant ensures that no simultaneous requests can withdraw against the same available balance, establishing strict serial execution of balance mutations.

### Strict Idempotency Implementation
Idempotency is enforced strictly via the `Idempotency-Key` HTTP header. 
- The first request sets the key and processes the payout.
- By utilizing `select_for_update()`, if a second request arrives via network lag before the first completes, it safely waits.
- Once the initial transaction completes, the generated response (`response_payload` and HTTP status) is stored against the `IdempotencyKey`. Subsequent requests hitting the system with the exact same key simply receive the cached response without retrying the payload or mutating the database.

## System Workflow & Money Integrity

1. **Balance Check:** Available balance is computed dynamically as `sum of ledger credits` - `sum of ledger debits`. Held funds are calculated as `sum of payouts` in pending/processing states.
2. **Atomic Payout Creation:** Payouts and corresponding ledger debit entries are executed in a single atomic transaction block. If any error occurs—such as a balance failure—the entire dataset rolls back, ensuring financial consistency.
3. **Asynchronous Processing:** After atomic commit, the heavy lifting of contacting simulated banking gateways is handed off to Celery (`process_payout.delay()`). This guarantees that API response times remain fast while long-running external tasks run in the background.

## Running the Application

The environment is containerized via Docker for ease of development:

```bash
docker-compose up --build
```

### Services
- **Web Backend:** Accessible on internal port 8000 handling DRF routes.
- **RabbitMQ / Redis:** Broker for Celery worker queues.
- **Worker (Celery):** Picks up payouts and transitions state asynchronously.
- **Frontend Dashboard:** Accessible mapping to the modern OmniPay web interface to manually submit, examine, and view historical payout requests.
