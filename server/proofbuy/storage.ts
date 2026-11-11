import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../db";
import { proofbuyEvents, proofbuyPolicies, proofbuyProposals } from "../../drizzle/schema";
import type { PolicyRuleResult } from "./policy";

export type PolicyInput = {
  workspaceId: string;
  maxSpendCents: number;
  allowedRecipients: string[];
  destinationNetwork: "base-sepolia" | "base-mainnet";
  requireHumanApproval: boolean;
};

export type CreateProposalInput = {
  workspaceId: string;
  vendor: string;
  recipient: string;
  amountCents: number;
  currency: "USDC";
  destinationNetwork: "base-sepolia" | "base-mainnet";
  purpose: string;
  ruleResults: PolicyRuleResult[];
};

const demoRecipients = ["0x8ba1f109551bd432803012645ac136ddd64dba72"];

async function database() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available. Enable the ProofBuy project database first.");
  return db;
}

export async function ensurePolicy(workspaceId: string) {
  const db = await database();
  const [existing] = await db.select().from(proofbuyPolicies).where(eq(proofbuyPolicies.workspaceId, workspaceId)).limit(1);
  if (existing) return existing;
  await db.insert(proofbuyPolicies).values({
    workspaceId,
    maxSpendCents: 5000,
    allowedRecipients: demoRecipients,
    destinationNetwork: "base-sepolia",
    requireHumanApproval: true,
    version: 1,
  }).onDuplicateKeyUpdate({ set: { updatedAt: new Date() } });
  const [created] = await db.select().from(proofbuyPolicies).where(eq(proofbuyPolicies.workspaceId, workspaceId)).limit(1);
  if (!created) throw new Error("Could not create the default policy.");
  return created;
}

export async function savePolicy(input: PolicyInput) {
  const db = await database();
  const current = await ensurePolicy(input.workspaceId);
  await db.update(proofbuyPolicies).set({
    maxSpendCents: input.maxSpendCents,
    allowedRecipients: input.allowedRecipients.map(address => address.trim().toLowerCase()),
    destinationNetwork: input.destinationNetwork,
    requireHumanApproval: input.requireHumanApproval,
    version: current.version + 1,
  }).where(eq(proofbuyPolicies.workspaceId, input.workspaceId));
  return ensurePolicy(input.workspaceId);
}

async function appendEvent(workspaceId: string, proposalId: string, eventType: string, message: string, metadata: Record<string, unknown> = {}) {
  const db = await database();
  await db.insert(proofbuyEvents).values({ workspaceId, proposalId, eventType, message, metadata });
}

export async function createProposal(input: CreateProposalInput, policy: Awaited<ReturnType<typeof ensurePolicy>>) {
  const db = await database();
  const id = crypto.randomUUID();
  const failed = input.ruleResults.filter(rule => !rule.passed);
  const decision = failed.length ? "rejected" : "passed";
  const status = failed.length ? "rejected" : policy.requireHumanApproval ? "awaiting_approval" : "ready";
  const policySnapshot = {
    version: policy.version,
    maxSpendCents: policy.maxSpendCents,
    allowedRecipients: policy.allowedRecipients,
    destinationNetwork: policy.destinationNetwork,
    requireHumanApproval: policy.requireHumanApproval,
  };
  await db.insert(proofbuyProposals).values({
    id,
    workspaceId: input.workspaceId,
    vendor: input.vendor,
    recipient: input.recipient.toLowerCase(),
    amountCents: input.amountCents,
    currency: input.currency,
    destinationNetwork: input.destinationNetwork,
    purpose: input.purpose,
    status,
    decision,
    policyVersion: policy.version,
    policySnapshot,
    ruleResults: input.ruleResults,
  });
  await appendEvent(input.workspaceId, id, "proposal_created", "Agent submitted a purchase proposal. The agent cannot authorize it.", {
    amountCents: input.amountCents,
    vendor: input.vendor,
  });
  await appendEvent(input.workspaceId, id, failed.length ? "policy_rejected" : "policy_passed", failed.length
    ? `Policy blocked this proposal: ${failed.map(rule => rule.label.toLowerCase()).join(", ")}.`
    : `All configured policy checks passed under policy v${policy.version}.`, { ruleResults: input.ruleResults });
  if (!failed.length && policy.requireHumanApproval) {
    await appendEvent(input.workspaceId, id, "approval_requested", "Human approval is required before any execution step.");
  }
  return getProposal(input.workspaceId, id);
}

export async function getProposal(workspaceId: string, proposalId: string) {
  const db = await database();
  const [proposal] = await db.select().from(proofbuyProposals)
    .where(and(eq(proofbuyProposals.workspaceId, workspaceId), eq(proofbuyProposals.id, proposalId))).limit(1);
  return proposal ?? null;
}

export async function approveProposal(workspaceId: string, proposalId: string) {
  const db = await database();
  const proposal = await getProposal(workspaceId, proposalId);
  if (!proposal) throw new Error("Proposal not found in this workspace.");
  if (proposal.status !== "awaiting_approval" || proposal.decision !== "passed") {
    throw new Error("Only a policy-passed proposal awaiting human review can be approved.");
  }
  const approvedAt = new Date();
  await db.update(proofbuyProposals).set({ status: "approved", approvedAt, approvedBy: "Workspace operator" })
    .where(and(eq(proofbuyProposals.workspaceId, workspaceId), eq(proofbuyProposals.id, proposalId)));
  await appendEvent(workspaceId, proposalId, "human_approved", "A workspace operator approved the proposal. No funds moved.", {
    approvedBy: "Workspace operator",
    approvedAt: approvedAt.toISOString(),
  });
  return getProposal(workspaceId, proposalId);
}

export async function simulateExecution(workspaceId: string, proposalId: string, outcome: "completed" | "failed") {
  const db = await database();
  const proposal = await getProposal(workspaceId, proposalId);
  if (!proposal) throw new Error("Proposal not found in this workspace.");
  if (proposal.decision !== "passed" || !["approved", "ready"].includes(proposal.status)) {
    throw new Error("Only an approved, policy-passed proposal can enter the simulation.");
  }
  if (proposal.status === "awaiting_approval") throw new Error("Human approval is still required.");
  await appendEvent(workspaceId, proposalId, "signature_simulated", "SIMULATION ONLY — Chain Signature step represented; no signature was requested.");
  if (outcome === "failed") {
    await appendEvent(workspaceId, proposalId, "submission_failed_simulated", "SIMULATION ONLY — sample broadcast failure shown; no transaction was submitted.");
    await db.update(proofbuyProposals).set({ status: "failed_simulated" })
      .where(and(eq(proofbuyProposals.workspaceId, workspaceId), eq(proofbuyProposals.id, proposalId)));
    await appendEvent(workspaceId, proposalId, "failed_simulated", "SIMULATION ONLY — lifecycle stopped at a simulated broadcast failure; no funds moved.");
    return getProposal(workspaceId, proposalId);
  }
  await appendEvent(workspaceId, proposalId, "submission_simulated", "SIMULATION ONLY — broadcast step represented; no transaction was submitted.");
  await db.update(proofbuyProposals).set({ status: "completed_simulated" })
    .where(and(eq(proofbuyProposals.workspaceId, workspaceId), eq(proofbuyProposals.id, proposalId)));
  await appendEvent(workspaceId, proposalId, "completed_simulated", "SIMULATION ONLY — lifecycle demo completed; no payment or vendor fulfillment occurred.");
  return getProposal(workspaceId, proposalId);
}

export async function getDashboard(workspaceId: string) {
  const db = await database();
  const policy = await ensurePolicy(workspaceId);
  const [proposals, events] = await Promise.all([
    db.select().from(proofbuyProposals).where(eq(proofbuyProposals.workspaceId, workspaceId))
      .orderBy(desc(proofbuyProposals.createdAt)).limit(30),
    db.select().from(proofbuyEvents).where(eq(proofbuyEvents.workspaceId, workspaceId))
      .orderBy(desc(proofbuyEvents.createdAt)).limit(60),
  ]);
  return { policy, proposals, events };
}
