# ProofBuy Cross-Chain — implementation plan

## Product scope

Build a responsive procurement-security dashboard for an AI purchase proposal. The agent may suggest; it cannot authorize. A server-side deterministic policy engine checks amount, recipient, and destination against a persisted policy. Users can see a blocked over-limit or unapproved-recipient attempt, or advance a compliant proposal through human approval. Each decision is retained with its policy snapshot and an auditable event trail. The default execution mode is simulation and every simulated signature, broadcast, and payment is labelled as such.

Live-chain support is represented as an explicitly separate, opt-in path for a selected EVM destination and NEAR Chain Signatures. It must not sign, spend, submit a transaction, deploy to mainnet, or make a payment merely because live mode is selected. Before any real execution, the user must review and separately confirm the exact network, asset, amount, recipient, fee and transaction payload. No credentials or private keys are stored in source or sent to the browser. The current build does not perform a live transaction or mainnet deployment.

## Implementation and data flow

The project uses the initialized React 19 + TypeScript + Vite client, Express/tRPC backend, and Drizzle ORM with the project-managed MySQL database. The client obtains a random demo workspace ID in local storage. tRPC procedures load/update that workspace's policy, create a proposal, evaluate it on the server, record user approval, advance the simulated lifecycle, and return receipts/events. The server never trusts a client-provided policy result. Checks use integer minor currency units and normalized recipient/network values. History views are read-only and scoped to the demo workspace ID.

The simulated lifecycle is proposal → policy evaluation → blocked, or policy passed → human approval → signature simulated → broadcast simulated → completed or simulated failure. A rejected policy cannot be advanced. All status labels and the receipt disclose that simulation is not chain execution, vendor fulfillment, or proof of purchase.

Approval alerts are in-app notifications for pending approvals and policy rejections. The user can adjust the maximum amount, permitted recipients, one EVM destination network, and whether human approval is required. The default configuration uses Base Sepolia as a display/test destination, low limits, and simulation mode.

## Project structure

- `client/src/pages/Home.tsx`: application shell, header, sidebar, dashboard, policy editor, proposal review, receipt/history views, and responsive interactions.
- `client/src/index.css`: ProofBuy visual system, responsive layout, status states, focus styles, and motion preferences.
- `server/routers.ts`: typed tRPC procedures and input validation for policies, proposals, approvals, lifecycle and receipts.
- `server/proofbuy/storage.ts`: Drizzle database queries for policy, proposal, approval, simulation and event persistence.
- `drizzle/schema.ts`: workspace-scoped policy, proposal, and audit-event tables.
- `drizzle/`: additive migration for the ProofBuy tables.
- `client/public/manus-routes.json`: route manifest, synchronized with the app's `/` and `/404` routes.
- `app.config.ts`: literal HTTPS project logo metadata before checkpointing.

## Design

Three candidate directions: Swiss terminal editorial (0.08); warm neo-brutalist workshop (0.06); restrained glassmorphic treasury cockpit (0.04). Choose **Swiss terminal editorial**.

**Design Movement:** Swiss editorial typography and precise financial-terminal information design, softened with generous whitespace.

**Core Principles:** Policy decisions must be legible at a glance; real and simulated actions must never be confused; action controls remain close to the evidence they affect; dense audit information stays calm and scannable.

**Color Philosophy:** Warm off-white and ink establish a trustworthy paper-like canvas. A vivid electric-coral accent marks the product's intervention point. Emerald indicates policy pass, amber indicates approval needed, and red indicates a blocked action; color is always paired with text and an icon.

**Layout Paradigm:** An asymmetric, two-column operations desk: persistent narrow navigation, wide approval queue, and an offset policy/evidence rail. Small-screen layouts collapse into a single ordered workflow.

**Signature Elements:** A fine-line transaction route connecting NEAR policy to the EVM destination; compact numbered policy checks; a distinctive coral proof-stamp for blocked decisions and verified audit receipts.

**Interaction Philosophy:** Every consequential action previews what will happen and why. Policy changes take effect immediately with a visible version update; approval is an explicit action. Demo presets are one-click but are visibly named as demo data.

**Animation:** Brief 150–220 ms opacity/position transitions for tabs and status changes; no looping motion. Respect `prefers-reduced-motion`. A restrained route pulse may play only during the simulated lifecycle.

**Typography System:** Use an editorial sans such as `DM Sans` for interface text and a sturdy system monospace for IDs, amounts, addresses and timestamps. Hierarchy favors large concise page titles, medium-weight section labels, and small but readable metadata.

**Brand Essence:** A procurement control desk for teams giving AI agents purchasing abilities, distinguished by independent policy checks and evidence for every decision. Personality: precise, candid, protective.

**Brand Voice:** Headlines are short and operational; microcopy names the actual state and its cause. Examples: “Every purchase has to pass.” “Simulation only — no funds moved.”

**Wordmark & Logo:** A compact custom “PB” monogram formed from two offset receipt lines intersecting a guarded checkmark, paired with the ProofBuy wordmark.

**Signature Brand Color:** Electric coral, used sparingly for the ProofBuy stamp, primary decisions and active route node.
