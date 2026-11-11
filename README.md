# ProofBuy Cross-Chain

<p align="center"><img src="client/public/proofbuy-icon.svg" width="72" alt="ProofBuy shield-check icon"></p>

> **An agent can propose the purchase. Policy decides whether it may proceed.**

ProofBuy is a hackathon MVP for guarded AI procurement. A deterministic server-side policy gate checks a purchase proposal against an operator-owned policy, records a decision receipt, and can demonstrate both a successful and failed lifecycle—without moving funds.

## What works in this MVP

- Edit the per-purchase USDC limit, approved recipient addresses, one EVM destination (Base Sepolia or a display-only Base mainnet selection), and the human-approval requirement.
- Run prepared demos for an over-limit request, an unapproved recipient, and a compliant purchase.
- Review the full receipt: submitted recipient, captured policy snapshot (version, cap, recipient allowlist, destination, approval setting), every rule result, and operator approval evidence.
- Require explicit operator approval before a compliant proposal can advance when the policy demands it.
- Run either a **simulated completion** or a **simulated broadcast failure**; every per-proposal lifecycle event appears in the receipt and is plainly labeled as simulated.
- Review persisted proposals and policy events in a workspace decision log.

## Try it

1. Open the dashboard. A new browser workspace receives a default $50.00 USDC cap, one example recipient, Base Sepolia as the destination, and a required human approval.
2. Choose **Over limit**. The server blocks the request and the receipt names the amount-cap violation.
3. Choose **New recipient**. The server blocks the request because the address is not allowlisted.
4. Choose **Compliant**, open its receipt, then select **Approve proposal**.
5. Choose **Simulate completion** or **Simulate failure**. Inspect the lifecycle evidence in the receipt or open **Decision log**.
6. Open **Policies** to change the cap, recipient allowlist, destination, or approval requirement; policy changes create a new version while existing receipts retain their earlier snapshot.

## Architecture

```text
Purchase proposal
       │
       ▼
Server-side policy gate ── fail ──► blocked receipt + audit event
       │ pass
       ▼
Human approval (when required)
       │
       ▼
Simulated signing/submission ──► simulated completion or failure
```

- **Web client:** React, TypeScript, Vite, Tailwind CSS, and Lucide icons.
- **API:** Express and tRPC with Zod input validation.
- **Policy:** `server/proofbuy/policy.ts` evaluates amount, recipient, and destination on the server; the browser cannot provide the result.
- **Persistence:** Drizzle ORM with the project-managed MySQL database. Policies, proposals, immutable-in-receipt policy snapshots, approval decisions, and lifecycle events are stored by demo workspace.
- **Main modules:** `client/src/pages/Home.tsx` (approval desk); `server/proofbuy/storage.ts` (workspace persistence and lifecycle); `server/routers.ts` (validated API); `drizzle/schema.ts` (database schema).

## Development

Requirements: Node.js and pnpm.

```bash
pnpm install
# Provide DATABASE_URL in the local environment for persistent storage.
pnpm db:push       # additive schema migration
pnpm dev            # Vite + Express development server
```

In another terminal, use `pnpm check`, `pnpm test`, and `pnpm build` for TypeScript validation, unit tests, and a production build. The policy evaluator tests include amount, recipient, network, and malformed-input rejection cases.

## Current boundaries and next steps

**This preview is simulation-only.** It does not connect a NEAR wallet, request NEAR Chain Signatures, deploy a NEAR policy contract, sign an EVM transaction, broadcast to Base, make a payment, or fulfill a vendor order. The NEAR-to-EVM route in the UI is a conceptual policy-gate visualization; a passing server-side check is not an on-chain guarantee. Demo workspace IDs in local storage are not authentication or production access control, and this MVP is not suitable for real funds.

A live integration would need a user-controlled signer/relayer, a deployed and audited policy gate, chain-specific derivation paths, robust asset/fee/network checks, secure transaction construction, and a separate exact-action review before any real signing, mainnet deployment, or payment. Never place private keys in the client, repository, or demo workspace. Simulated receipts are not chain receipts or proof of purchase.
