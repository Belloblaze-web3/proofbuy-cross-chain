# ProofBuy Cross-Chain — outcomes

- [x] **Policy configuration:** Users can configure a maximum purchase amount, approved recipients, one EVM destination network, and whether human approval is required. Policy data is persisted by browser-local demo workspace; the default is safe and simulation-only.

- [x] **Proposal and independent policy evaluation:** The app presents agent purchase proposals and clearly prevents the agent from authorizing them. A deterministic server-side evaluation checks amount, allowlisted recipient, and configured destination network. Client-submitted decisions are not trusted.

- [x] **Blocked-purchase demos:** Users can run over-limit and unapproved-recipient proposals. Both are blocked with rule-violation explanations and cannot proceed to approval or simulated execution.

- [x] **Compliant approval path:** A policy-passing proposal enters the required human-approval flow. It cannot enter the simulation step until approval is recorded.

- [x] **Decision receipt and audit trail:** Each proposal has a readable receipt containing purpose and inputs, policy snapshot/version, rule-by-rule outcomes, final decision, timestamps, approval evidence, and a per-proposal lifecycle timeline. Receipts persist in MySQL and are scoped to a random demo workspace ID.

- [x] **Lifecycle and alerts:** The interface presents accessible proposed, evaluated, rejected/approved, simulated-signature, simulated-submission, simulated-completion, and simulated-failure states. In-app alerts appear on policy rejection and approval events.

- [ ] **Live-chain execution:** NEAR wallet connection, Chain Signatures, EVM transaction broadcast, payment, and mainnet deployment are not implemented. The Live Setup panel explains the missing signer/relayer and exact-action review. Do not treat a request to include future capabilities as authorization to execute an unspecified transaction or deployment.

- [x] **Responsive accessible dashboard:** The app includes responsive desktop/mobile layouts, semantic headings and alerts, keyboard-accessible controls, visible focus styles, reduced-motion handling, and status text/icons in addition to color.

- [x] **Build, preview, and public repository documentation:** `GET /manus-routes.json` serves the synchronized static route manifest, the SVG icon and durable HTTPS project logo metadata are configured, the managed Preview health endpoint responds, and TypeScript, all 11 unit tests, and production build pass. The public README describes the product, architecture, demo steps, local setup, and live-execution limits.
