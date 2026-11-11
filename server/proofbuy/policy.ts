export type PolicyForEvaluation = {
  maxSpendCents: number;
  allowedRecipients: string[];
  destinationNetwork: string;
};

export type ProposalForEvaluation = {
  amountCents: number;
  recipient: string;
  destinationNetwork: string;
};

export type PolicyRuleResult = {
  key: string;
  label: string;
  passed: boolean;
  detail: string;
};

export function evaluateProposal(proposal: ProposalForEvaluation, policy: PolicyForEvaluation): PolicyRuleResult[] {
  const validAmount = Number.isSafeInteger(proposal.amountCents) && proposal.amountCents > 0;
  const amountWithinLimit = validAmount && proposal.amountCents <= policy.maxSpendCents;
  const normalizedRecipient = proposal.recipient.trim().toLowerCase();
  const recipientIsApproved = /^0x[a-f0-9]{40}$/.test(normalizedRecipient)
    && policy.allowedRecipients.some(address => address.trim().toLowerCase() === normalizedRecipient);
  const networkMatches = proposal.destinationNetwork === policy.destinationNetwork;

  return [
    {
      key: "amount",
      label: "Amount within policy",
      passed: amountWithinLimit,
      detail: !validAmount
        ? "Purchase amount must be a positive whole number of minor currency units."
        : amountWithinLimit
          ? `Requested amount is within the $${(policy.maxSpendCents / 100).toFixed(2)} per-purchase cap.`
          : `Requested $${(proposal.amountCents / 100).toFixed(2)} exceeds the $${(policy.maxSpendCents / 100).toFixed(2)} per-purchase cap.`,
    },
    {
      key: "recipient",
      label: "Recipient is approved",
      passed: recipientIsApproved,
      detail: recipientIsApproved
        ? "The destination address is on the workspace allowlist."
        : "The destination address is not on the workspace allowlist.",
    },
    {
      key: "network",
      label: "Destination network matches",
      passed: networkMatches,
      detail: networkMatches
        ? `Proposal targets the configured ${policy.destinationNetwork} network.`
        : `Proposal targets ${proposal.destinationNetwork}; policy allows ${policy.destinationNetwork}.`,
    },
  ];
}
