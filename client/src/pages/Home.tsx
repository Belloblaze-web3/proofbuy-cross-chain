import { useEffect, useMemo, useState } from "react";
import {
  Activity, AlertTriangle, ArrowDownToLine, ArrowRight, Bell, Check, CheckCircle2,
  ChevronRight, CircleDollarSign, ClipboardCheck, Clock3, ExternalLink, FileCheck2,
  Fingerprint, Gauge, Globe2, LayoutDashboard, LockKeyhole, Menu, Plus, ReceiptText,
  Route, Settings2, Shield, ShieldAlert, ShieldCheck, Sparkles, WalletCards, X,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

const DEFAULT_RECIPIENT = "0x8ba1f109551bd432803012645ac136ddd64dba72";
const UNAPPROVED_RECIPIENT = "0x1111111111111111111111111111111111111111";
type Network = "base-sepolia" | "base-mainnet";
type PolicyDraft = {
  maxSpend: string;
  recipients: string;
  destinationNetwork: Network;
  requireHumanApproval: boolean;
};

function workspaceKey() {
  try {
    const saved = window.localStorage.getItem("proofbuy-workspace");
    if (saved && /^pb_[a-f0-9-]{36}$/i.test(saved)) return saved;
    const fresh = `pb_${window.crypto.randomUUID()}`;
    window.localStorage.setItem("proofbuy-workspace", fresh);
    return fresh;
  } catch {
    return `pb_${window.crypto.randomUUID()}`;
  }
}

function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function shortAddress(address: string) {
  return `${address.slice(0, 7)}…${address.slice(-5)}`;
}

function dateLabel(value: Date | string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    rejected: "Blocked by policy",
    awaiting_approval: "Needs your approval",
    approved: "Approved · simulation ready",
    ready: "Policy passed",
    completed_simulated: "Simulation complete",
    failed_simulated: "Simulation failed",
  };
  return labels[status] ?? status.replaceAll("_", " ");
}

function statusIcon(status: string) {
  if (status === "rejected") return <ShieldAlert size={15} />;
  if (status === "awaiting_approval") return <Clock3 size={15} />;
  if (status === "completed_simulated") return <CheckCircle2 size={15} />;
  if (status === "failed_simulated") return <AlertTriangle size={15} />;
  return <ShieldCheck size={15} />;
}

export default function Home() {
  const [workspaceId] = useState(workspaceKey);
  const [draft, setDraft] = useState<PolicyDraft | null>(null);
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);
  const [activePage, setActivePage] = useState<"overview" | "activity" | "policies">("overview");
  const [showComposer, setShowComposer] = useState(false);
  const [showLiveInfo, setShowLiveInfo] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [customVendor, setCustomVendor] = useState("Cloud compute credits");
  const [customAmount, setCustomAmount] = useState("24.00");
  const [customRecipient, setCustomRecipient] = useState(DEFAULT_RECIPIENT);
  const [customPurpose, setCustomPurpose] = useState("Purchase compute capacity for a scheduled model evaluation.");

  const dashboard = trpc.proofbuy.getDashboard.useQuery({ workspaceId });
  const utils = trpc.useUtils();
  const invalidate = () => {
    void utils.proofbuy.getDashboard.invalidate({ workspaceId });
    void utils.proofbuy.getProposalEvents.invalidate();
  };
  const savePolicy = trpc.proofbuy.updatePolicy.useMutation({
    onSuccess: policy => {
      setDraft({
        maxSpend: (policy.maxSpendCents / 100).toFixed(2),
        recipients: policy.allowedRecipients.join("\n"),
        destinationNetwork: policy.destinationNetwork as Network,
        requireHumanApproval: policy.requireHumanApproval,
      });
      toast.success(`Policy saved · version ${policy.version}`);
      void invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const createProposal = trpc.proofbuy.createProposal.useMutation({
    onSuccess: proposal => {
      if (proposal) setSelectedProposalId(proposal.id);
      setShowComposer(false);
      void invalidate();
      if (proposal?.decision === "rejected") toast.error("Purchase blocked. Review the policy receipt.");
      else toast.success("Proposal evaluated. Human review is required before execution.");
    },
    onError: error => toast.error(error.message),
  });
  const approveProposal = trpc.proofbuy.approve.useMutation({
    onSuccess: proposal => {
      if (proposal) setSelectedProposalId(proposal.id);
      void invalidate();
      toast.success("Approval recorded. No funds moved.");
    },
    onError: error => toast.error(error.message),
  });
  const simulate = trpc.proofbuy.simulate.useMutation({
    onSuccess: proposal => {
      if (proposal) setSelectedProposalId(proposal.id);
      void invalidate();
      if (proposal?.status === "failed_simulated") toast.error("Simulated broadcast failure · no transaction was submitted.");
      else toast.success("Simulation complete · no signature or transaction was sent.");
    },
    onError: error => toast.error(error.message),
  });

  const data = dashboard.data;
  const proposals = data?.proposals ?? [];
  const events = data?.events ?? [];
  const policy = data?.policy;
  const selected = useMemo(
    () => proposals.find(proposal => proposal.id === selectedProposalId) ?? proposals[0] ?? null,
    [proposals, selectedProposalId],
  );
  const proposalEvents = trpc.proofbuy.getProposalEvents.useQuery(
    { workspaceId, proposalId: selected?.id ?? "00000000-0000-4000-8000-000000000000" },
    { enabled: Boolean(selected) },
  );

  useEffect(() => {
    if (!policy || draft) return;
    setDraft({
      maxSpend: (policy.maxSpendCents / 100).toFixed(2),
      recipients: policy.allowedRecipients.join("\n"),
      destinationNetwork: policy.destinationNetwork as Network,
      requireHumanApproval: policy.requireHumanApproval,
    });
  }, [policy, draft]);

  const blockedCount = proposals.filter(proposal => proposal.decision === "rejected").length;
  const approvalCount = proposals.filter(proposal => proposal.status === "awaiting_approval").length;
  const completedCount = proposals.filter(proposal => proposal.status === "completed_simulated").length;
  const networkLabel = (network: string) => network === "base-mainnet" ? "Base" : "Base Sepolia";
  const selectedSnapshot = selected?.policySnapshot as {
    maxSpendCents?: number;
    allowedRecipients?: string[];
    destinationNetwork?: string;
    requireHumanApproval?: boolean;
  } | undefined;
  const selectedEvents = proposalEvents.data ?? [];

  function propose(kind: "over-limit" | "unknown-recipient" | "compliant") {
    if (!policy) return;
    const approved = policy.allowedRecipients[0] ?? DEFAULT_RECIPIENT;
    const amountCents = kind === "over-limit"
      ? policy.maxSpendCents + Math.max(1500, Math.round(policy.maxSpendCents * 0.35))
      : kind === "compliant"
        ? Math.max(1, Math.min(2400, Math.floor(policy.maxSpendCents * 0.6)))
        : Math.max(1, Math.min(2700, policy.maxSpendCents));
    createProposal.mutate({
      workspaceId,
      vendor: kind === "over-limit" ? "Atlas GPU Cloud" : kind === "unknown-recipient" ? "New vendor · Prism API" : "Northstar Compute",
      recipient: kind === "unknown-recipient" ? UNAPPROVED_RECIPIENT : approved,
      amountCents,
      currency: "USDC",
      destinationNetwork: policy.destinationNetwork as Network,
      purpose: kind === "over-limit"
        ? "Scale the nightly model-evaluation run beyond its authorized purchasing limit."
        : kind === "unknown-recipient"
          ? "Subscribe to a new analytics endpoint that is not on the approved vendor list."
          : "Buy a small, pre-approved compute package for the scheduled model evaluation.",
    });
  }

  function submitCustomProposal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!policy) return;
    const amountCents = Math.round(Number(customAmount) * 100);
    createProposal.mutate({
      workspaceId,
      vendor: customVendor,
      recipient: customRecipient.trim(),
      amountCents,
      currency: "USDC",
      destinationNetwork: policy.destinationNetwork as Network,
      purpose: customPurpose,
    });
  }

  function persistPolicy(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;
    const amount = Number(draft.maxSpend);
    if (!Number.isFinite(amount) || amount < 1) {
      toast.error("Enter a maximum amount of at least $1.00.");
      return;
    }
    const recipients = draft.recipients.split(/[\s,]+/).filter(Boolean);
    savePolicy.mutate({
      workspaceId,
      maxSpendCents: Math.round(amount * 100),
      allowedRecipients: recipients,
      destinationNetwork: draft.destinationNetwork,
      requireHumanApproval: draft.requireHumanApproval,
    });
  }

  if (dashboard.isLoading) {
    return <div className="loading-screen"><div className="brand-mark"><ShieldCheck size={23} /></div><span>Opening the approval desk…</span></div>;
  }

  if (dashboard.error) {
    return <main className="fatal-state"><ShieldAlert size={28} /><h1>Approval desk unavailable</h1><p>{dashboard.error.message}</p><button className="button button-primary" onClick={() => void dashboard.refetch()}>Try again</button></main>;
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
        <a className="brand" href="#overview" onClick={() => setActivePage("overview")} aria-label="ProofBuy home">
          <span className="brand-mark"><ShieldCheck size={20} strokeWidth={2.4} /></span>
          <span className="brand-name">proof<span>buy</span><small>PROCUREMENT CONTROL</small></span>
        </a>
        <div className="workspace-switch"><span className="workspace-dot" /> DEMO WORKSPACE <ChevronRight size={13} /></div>
        <div className="side-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Workspace navigation">
          <button className={activePage === "overview" ? "active" : ""} onClick={() => { setActivePage("overview"); setMobileNav(false); }}><LayoutDashboard size={17} /> Overview</button>
          <button className={activePage === "activity" ? "active" : ""} onClick={() => { setActivePage("activity"); setMobileNav(false); }}><Activity size={17} /> Decision log {events.length > 0 && <span className="nav-count">{events.length}</span>}</button>
          <button className={activePage === "policies" ? "active" : ""} onClick={() => { setActivePage("policies"); setMobileNav(false); }}><Settings2 size={17} /> Policies</button>
        </nav>
        <div className="sidebar-spacer" />
        <div className="sidebar-security"><span className="secure-icon"><LockKeyhole size={16} /></span><div><strong>Policy gate active</strong><span>Agent cannot authorize spend</span></div></div>
        <div className="sidebar-bottom"><span className="avatar">PB</span><div className="user-meta"><strong>Workspace operator</strong><span>Local demo session</span></div><button className="icon-button" aria-label="Workspace settings" onClick={() => setActivePage("policies")}><Settings2 size={16} /></button></div>
      </aside>

      {mobileNav && <button className="scrim" aria-label="Close navigation" onClick={() => setMobileNav(false)} />}

      <main className="main-area">
        <header className="topbar">
          <button className="mobile-menu icon-button" aria-label="Open navigation" onClick={() => setMobileNav(true)}><Menu size={20} /></button>
          <div className="breadcrumbs"><span>Workspace</span><ChevronRight size={13} /><strong>{activePage === "overview" ? "Overview" : activePage === "activity" ? "Decision log" : "Policies"}</strong></div>
          <div className="topbar-right"><div className="mode-pill"><span /> SIMULATION MODE</div><button className="live-link" onClick={() => setShowLiveInfo(true)}><WalletCards size={15} /> Live setup <ExternalLink size={12} /></button><button className="icon-button bell-button" aria-label={`${approvalCount} pending approvals`} onClick={() => setActivePage("overview")}><Bell size={17} />{approvalCount > 0 && <i />}</button></div>
        </header>

        <div className="content-wrap">
          {activePage === "policies" ? (
            <section className="page-enter">
              <PageHeading eyebrow="GUARDRAILS" title="Policy settings" subtitle="Set the rules your agent has to pass before a purchase can move forward." />
              <PolicyEditor draft={draft} setDraft={setDraft} save={persistPolicy} saving={savePolicy.isPending} version={policy?.version ?? 1} networkLabel={networkLabel} />
            </section>
          ) : activePage === "activity" ? (
            <section className="page-enter">
              <PageHeading eyebrow="AUDIT TRAIL" title="Decision log" subtitle="Every proposal, policy result and approval is recorded for this demo workspace." />
              <div className="log-panel">
                {events.length === 0 ? <EmptyState onCreate={() => setShowComposer(true)} /> : events.map(event => (
                  <button key={event.id} className="log-row" onClick={() => { setSelectedProposalId(event.proposalId); setActivePage("overview"); }}>
                    <span className={`event-mark ${event.eventType.includes("reject") ? "event-danger" : event.eventType.includes("approv") ? "event-warn" : ""}`}>{event.eventType.includes("reject") ? <ShieldAlert size={16} /> : event.eventType.includes("approv") ? <Clock3 size={16} /> : <ReceiptText size={16} />}</span>
                    <span className="log-copy"><strong>{event.message}</strong><small>{event.eventType.replaceAll("_", " ")} · {event.proposalId.slice(0, 8)}</small></span>
                    <time>{dateLabel(event.createdAt)}</time><ChevronRight size={15} />
                  </button>
                ))}
              </div>
            </section>
          ) : (
            <section className="page-enter">
              <PageHeading eyebrow="AI PROCUREMENT · NEAR × EVM" title="The approval desk" subtitle="Your agent can propose a purchase. Policy decides whether it can proceed." />

              <section className="welcome-banner">
                <div className="welcome-copy"><div className="eyebrow inverse"><Sparkles size={13} /> GUARDED PROCUREMENT</div><h2>Every purchase<br />has to <em>pass.</em></h2><p>One policy check between an agent’s intent and a transaction.</p><button className="button button-light" onClick={() => setShowComposer(true)}><Plus size={16} /> New proposal</button></div>
                <div className="route-visual" aria-label="NEAR policy gate to EVM destination, simulation only">
                  <div className="route-node node-near"><span className="route-node-icon">N</span><strong>NEAR</strong><small>POLICY GATE</small></div><div className="route-line"><span className="route-runner" /><ArrowRight size={16} /></div><div className="route-node node-evm"><span className="route-node-icon">◇</span><strong>{networkLabel(policy?.destinationNetwork ?? "base-sepolia")}</strong><small>DESTINATION</small></div><div className="route-caption"><LockKeyhole size={12} /> SIGNING DISABLED · SIMULATION ONLY</div>
                </div>
                <div className="banner-scribble" aria-hidden="true">PB</div>
              </section>

              <div className="stats-row">
                <StatCard icon={<ShieldAlert size={17} />} label="Policy blocks" value={blockedCount} note="Attempts stopped" tone="rose" />
                <StatCard icon={<Clock3 size={17} />} label="Awaiting review" value={approvalCount} note="Human approval needed" tone="amber" />
                <StatCard icon={<CheckCircle2 size={17} />} label="Simulations" value={completedCount} note="No funds moved" tone="green" />
                <div className="policy-mini"><span className="mini-label"><ShieldCheck size={14} /> ACTIVE POLICY</span><strong>{money(policy?.maxSpendCents ?? 5000)}<small> / purchase</small></strong><span>v{policy?.version ?? 1} · {policy?.allowedRecipients.length ?? 0} approved recipient{policy?.allowedRecipients.length === 1 ? "" : "s"}</span><button onClick={() => setActivePage("policies")}>Edit policy <ArrowRight size={13} /></button></div>
              </div>

              {showComposer && <div className="composer-panel page-enter">
                <div className="panel-head"><div><div className="eyebrow">AGENT REQUEST</div><h3>Propose a purchase</h3></div><button className="icon-button" aria-label="Close proposal composer" onClick={() => setShowComposer(false)}><X size={18} /></button></div>
                <form onSubmit={submitCustomProposal} className="proposal-form">
                  <label>Vendor<input value={customVendor} onChange={e => setCustomVendor(e.target.value)} minLength={2} maxLength={120} required /></label>
                  <label>Amount (USDC)<div className="input-prefix"><span>$</span><input type="number" min="0.01" step="0.01" value={customAmount} onChange={e => setCustomAmount(e.target.value)} required /></div></label>
                  <label className="form-wide">Recipient address<input value={customRecipient} onChange={e => setCustomRecipient(e.target.value)} placeholder="0x…" required /></label>
                  <label className="form-wide">Purpose<textarea value={customPurpose} onChange={e => setCustomPurpose(e.target.value)} rows={2} required /></label>
                  <div className="form-footer"><span><LockKeyhole size={13} /> Agent proposals cannot authorize spend.</span><button className="button button-primary" disabled={createProposal.isPending}>{createProposal.isPending ? "Checking policy…" : <>Evaluate proposal <ArrowRight size={15} /></>}</button></div>
                </form>
              </div>}

              <div className="section-heading"><div><div className="eyebrow">THE QUEUE</div><h3>Proposal review</h3></div><div className="section-actions"><span className="count-chip">{proposals.length} recent</span><button className="button button-outline" onClick={() => setShowComposer(value => !value)}><Plus size={15} /> Custom proposal</button></div></div>

              <div className="demo-strip"><div className="demo-intro"><span className="demo-spark"><Sparkles size={15} /></span><div><strong>Try the policy gate</strong><small>Run a prepared demo case to see the check in action.</small></div></div><div className="demo-actions"><button onClick={() => propose("over-limit")} disabled={createProposal.isPending}><span className="demo-dot dot-red" /> Over limit</button><button onClick={() => propose("unknown-recipient")} disabled={createProposal.isPending}><span className="demo-dot dot-amber" /> New recipient</button><button onClick={() => propose("compliant")} disabled={createProposal.isPending}><span className="demo-dot dot-green" /> Compliant</button></div></div>

              <div className="work-grid">
                <section className="proposal-panel">
                  <div className="panel-head"><div><div className="eyebrow">LATEST ACTIVITY</div><h3>Purchase proposals</h3></div><button className="text-button" onClick={() => setActivePage("activity")}>View decision log <ArrowRight size={14} /></button></div>
                  {proposals.length === 0 ? <EmptyState onCreate={() => setShowComposer(true)} /> : <div className="proposal-list">{proposals.slice(0, 6).map(proposal => <button key={proposal.id} className={`proposal-row ${selected?.id === proposal.id ? "selected" : ""}`} onClick={() => setSelectedProposalId(proposal.id)}>
                    <span className={`vendor-mark ${proposal.decision === "rejected" || proposal.status === "failed_simulated" ? "vendor-mark-red" : proposal.status === "awaiting_approval" ? "vendor-mark-amber" : "vendor-mark-green"}`}>{proposal.vendor.slice(0, 1).toUpperCase()}</span><span className="proposal-main"><strong>{proposal.vendor}</strong><small>{networkLabel(proposal.destinationNetwork)} <span>·</span> {shortAddress(proposal.recipient)}</small></span><span className="proposal-amount">{money(proposal.amountCents)}<small>{proposal.currency}</small></span><span className={`status-chip ${proposal.decision === "rejected" || proposal.status === "failed_simulated" ? "status-blocked" : proposal.status === "awaiting_approval" ? "status-pending" : proposal.status === "completed_simulated" ? "status-done" : "status-pass"}`}>{statusIcon(proposal.status)} {statusLabel(proposal.status)}</span><ChevronRight className="row-chevron" size={16} />
                  </button>)}</div>}
                </section>

                <aside className="receipt-panel" aria-live="polite">
                  <div className="receipt-top"><div className="receipt-title"><span className="receipt-icon"><ReceiptText size={16} /></span><div><div className="eyebrow">DECISION RECEIPT</div><strong>{selected ? `PB-${selected.id.slice(0, 6).toUpperCase()}` : "Nothing in review"}</strong></div></div><span className="receipt-stamp">AUDITABLE</span></div>
                  {selected ? <>
                    <div className={`verdict ${selected.decision === "rejected" || selected.status === "failed_simulated" ? "verdict-rejected" : selected.status === "awaiting_approval" ? "verdict-pending" : "verdict-passed"}`}>
                      <span>{statusIcon(selected.status)}</span><div><strong>{statusLabel(selected.status)}</strong><small>{selected.decision === "rejected" ? "Execution is blocked." : selected.status === "awaiting_approval" ? "Review before any execution step." : selected.status === "completed_simulated" ? "Lifecycle shown for demonstration." : selected.status === "failed_simulated" ? "Simulated failure only. No transaction was submitted." : "Policy checks passed."}</small></div>
                    </div>
                    <div className="receipt-fields"><ReceiptField label="REQUESTED BY" value="Purchasing agent" /><ReceiptField label="VENDOR" value={selected.vendor} /><ReceiptField label="AMOUNT" value={`${money(selected.amountCents)} ${selected.currency}`} /><ReceiptField label="RECIPIENT" value={selected.recipient} mono /><ReceiptField label="DESTINATION" value={networkLabel(selected.destinationNetwork)} /><ReceiptField label="POLICY VERSION" value={`v${selected.policyVersion}`} mono /><ReceiptField label="SNAPSHOT · SPEND CAP" value={`${money(selectedSnapshot?.maxSpendCents ?? 0)} USDC`} /><ReceiptField label="SNAPSHOT · DESTINATION" value={networkLabel(selectedSnapshot?.destinationNetwork ?? selected.destinationNetwork)} /><ReceiptField label="SNAPSHOT · HUMAN APPROVAL" value={selectedSnapshot?.requireHumanApproval ? "Required" : "Not required"} /><div className="receipt-field receipt-field-wide"><span>SNAPSHOT · APPROVED RECIPIENTS</span><div className="receipt-address-list">{selectedSnapshot?.allowedRecipients?.length ? selectedSnapshot.allowedRecipients.map(address => <code key={address}>{address}</code>) : <em>None approved</em>}</div></div><div className="receipt-field receipt-field-wide"><span>PURPOSE</span><strong>{selected.purpose}</strong></div>{selected.approvedAt && <ReceiptField label="HUMAN APPROVAL" value={`${selected.approvedBy ?? "Workspace operator"} · ${dateLabel(selected.approvedAt)}`} />}</div>
                    <div className="rule-block"><div className="rule-heading"><Fingerprint size={14} /> POLICY CHECKS <span>{selected.ruleResults.filter(rule => rule.passed).length}/{selected.ruleResults.length} PASSED</span></div>{selected.ruleResults.map(rule => <div className={`rule-row ${rule.passed ? "rule-pass" : "rule-fail"}`} key={rule.key}><span className="rule-state">{rule.passed ? <Check size={12} /> : <X size={12} />}</span><div><strong>{rule.label}</strong><small>{rule.detail}</small></div></div>)}</div>
                    <div className="receipt-timeline"><div className="rule-heading"><Activity size={13} /> LIFECYCLE EVIDENCE <span>{proposalEvents.isLoading ? "LOADING" : proposalEvents.isError ? "UNAVAILABLE" : `${selectedEvents.length} EVENTS`}</span></div>{proposalEvents.isLoading ? <p className="receipt-timeline-message">Loading complete proposal history…</p> : proposalEvents.isError ? <div className="receipt-timeline-error" role="alert"><span>Could not load the complete event history.</span><button className="text-button" onClick={() => void proposalEvents.refetch()}>Retry</button></div> : selectedEvents.map(event => <div className="timeline-row" key={event.id}><span className={`timeline-dot ${event.eventType.includes("reject") || event.eventType.includes("failed") ? "timeline-dot-red" : event.eventType.includes("approv") ? "timeline-dot-amber" : ""}`} /><div><strong>{event.message}</strong><small>{dateLabel(event.createdAt)}</small></div></div>)}</div>
                    <div className="receipt-foot"><span><Clock3 size={12} /> Created {dateLabel(selected.createdAt)}</span><span className="simulation-disclosure"><LockKeyhole size={12} /> SIMULATED ONLY</span></div>
                    {selected.status === "awaiting_approval" && <button className="button button-primary action-full" onClick={() => approveProposal.mutate({ workspaceId, proposalId: selected.id })} disabled={approveProposal.isPending}><ClipboardCheck size={16} /> {approveProposal.isPending ? "Recording approval…" : "Approve proposal"}</button>}
                    {(selected.status === "approved" || selected.status === "ready") && <div className="simulation-actions"><button className="button button-primary" onClick={() => simulate.mutate({ workspaceId, proposalId: selected.id, outcome: "completed" })} disabled={simulate.isPending}><Route size={16} /> {simulate.isPending ? "Running…" : "Simulate completion"}</button><button className="button button-outline" onClick={() => simulate.mutate({ workspaceId, proposalId: selected.id, outcome: "failed" })} disabled={simulate.isPending}><AlertTriangle size={14} /> Simulate failure</button></div>}
                    {selected.status === "completed_simulated" && <div className="completed-note"><CheckCircle2 size={15} /> Simulation complete. No signature, broadcast, payment, or vendor fulfillment occurred.</div>}
                    {selected.status === "failed_simulated" && <div className="completed-note failure-note"><AlertTriangle size={15} /> Failure state shown for testing. No live transaction or payment occurred.</div>}
                  </> : <div className="receipt-empty"><div className="empty-illustration"><ReceiptText size={25} /></div><strong>Evidence appears here</strong><p>Create a proposal or run a demo case to see the full policy receipt.</p><button className="text-button" onClick={() => propose("over-limit")}>Try a blocked case <ArrowRight size={14} /></button></div>}
                </aside>
              </div>

              <div className="bottom-notice"><Shield size={16} /><span><strong>Built to make the boundary visible.</strong> NEAR is the policy gate; the destination is {networkLabel(policy?.destinationNetwork ?? "base-sepolia")}. Chain signing and payments are not connected in this preview.</span><button onClick={() => setShowLiveInfo(true)}>About live execution <ArrowRight size={13} /></button></div>
            </section>
          )}
          <footer className="app-footer"><span>PROOFBUY · BUILD WITH A PAPER TRAIL</span><span>WORKSPACE DATA IS DEMO DATA</span></footer>
        </div>
      </main>

      {showLiveInfo && <div className="modal-scrim" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setShowLiveInfo(false); }}><section className="live-modal" role="dialog" aria-modal="true" aria-labelledby="live-title"><button className="icon-button modal-close" aria-label="Close live setup details" onClick={() => setShowLiveInfo(false)}><X size={18} /></button><div className="live-modal-icon"><WalletCards size={22} /></div><div className="eyebrow">LIVE EXECUTION SETUP</div><h2 id="live-title">Simulation is the only connected mode.</h2><p>This build does not request Chain Signatures or broadcast payments. Live execution needs a user-controlled NEAR wallet, a chain-specific derivation path, network-bound transaction data, and an exact transaction review before signing.</p><div className="live-checklist"><span><CheckCircle2 size={15} /> Policy gate and audit receipt are active</span><span><AlertTriangle size={15} /> No live signer or relayer is configured</span><span><LockKeyhole size={15} /> No funds have moved in this preview</span></div><div className="live-modal-foot"><button className="button button-outline" onClick={() => setShowLiveInfo(false)}>Back to simulation</button><span>Live signing, payment, and deployment require separate exact-action authorization.</span></div></section></div>}
    </div>
  );
}

function PageHeading({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return <div className="page-heading"><div className="eyebrow"><span className="eyebrow-line" />{eyebrow}</div><h1>{title}</h1><p>{subtitle}</p></div>;
}

function StatCard({ icon, label, value, note, tone }: { icon: React.ReactNode; label: string; value: number; note: string; tone: string }) {
  return <div className={`stat-card tone-${tone}`}><span className="stat-icon">{icon}</span><span className="stat-label">{label}</span><strong>{value.toString().padStart(2, "0")}</strong><small>{note}</small></div>;
}

function ReceiptField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return <div className="receipt-field"><span>{label}</span><strong className={mono ? "mono" : ""}>{value}</strong></div>;
}

function PolicyEditor({ draft, setDraft, save, saving, version, networkLabel }: {
  draft: PolicyDraft | null;
  setDraft: React.Dispatch<React.SetStateAction<PolicyDraft | null>>;
  save: (event: React.FormEvent<HTMLFormElement>) => void;
  saving: boolean;
  version: number;
  networkLabel: (network: string) => string;
}) {
  if (!draft) return <div className="loading-card">Loading policy…</div>;
  return <form className="policy-editor" onSubmit={save}>
    <div className="policy-editor-head"><div><span className="policy-status"><span /> ACTIVE POLICY</span><h2>Workspace guardrails</h2><p>Changes create a new policy version. Existing receipts keep the snapshot they were evaluated against.</p></div><span className="version-badge">VERSION {version}</span></div>
    <div className="policy-form-grid">
      <label className="policy-field"><span>Maximum per purchase</span><small>Proposals above this amount are blocked.</small><div className="money-input"><span>$</span><input type="number" min="1" step="0.01" value={draft.maxSpend} onChange={event => setDraft(current => current && { ...current, maxSpend: event.target.value })} required /><em>USDC</em></div></label>
      <label className="policy-field"><span>Destination network</span><small>One configured EVM destination at a time.</small><select value={draft.destinationNetwork} onChange={event => setDraft(current => current && { ...current, destinationNetwork: event.target.value as Network })}><option value="base-sepolia">Base Sepolia · test network</option><option value="base-mainnet">Base · main network</option></select><em className="field-warning"><AlertTriangle size={13} /> Mainnet selection is display-only in this build.</em></label>
      <label className="policy-field full-field"><span>Approved recipient addresses</span><small>One EVM address per line. Any other recipient fails closed.</small><textarea rows={4} spellCheck={false} value={draft.recipients} onChange={event => setDraft(current => current && { ...current, recipients: event.target.value })} placeholder="0x…" /></label>
      <div className="approval-setting"><span className="approval-setting-icon"><ClipboardCheck size={18} /></span><div><strong>Require a human approval</strong><small>Every policy-passing purchase waits for an operator.</small></div><button type="button" role="switch" aria-checked={draft.requireHumanApproval} className={`toggle ${draft.requireHumanApproval ? "toggle-on" : ""}`} onClick={() => setDraft(current => current && { ...current, requireHumanApproval: !current.requireHumanApproval })}><span /></button></div>
    </div>
    <div className="policy-editor-footer"><span><LockKeyhole size={14} /> Deterministic checks run server-side. Policy v{version} remains in prior receipts.</span><button className="button button-primary" disabled={saving}>{saving ? "Saving policy…" : <>Save guardrails <Check size={15} /></>}</button></div>
  </form>;
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return <div className="empty-state"><div className="empty-illustration"><ArrowDownToLine size={22} /></div><strong>No proposals yet</strong><p>Run a prepared case to see the policy gate block or pass a purchase.</p><button className="button button-outline" onClick={onCreate}><Plus size={15} /> Create a proposal</button></div>;
}
