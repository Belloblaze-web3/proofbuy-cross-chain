import { describe, expect, it } from "vitest";
import { evaluateProposal } from "./policy";

const recipient = "0x8ba1f109551bd432803012645ac136ddd64dba72";
const policy = { maxSpendCents: 5000, allowedRecipients: [recipient], destinationNetwork: "base-sepolia" };

function proposal(overrides: Partial<{ amountCents: number; recipient: string; destinationNetwork: string }> = {}) {
  return { amountCents: 2400, recipient, destinationNetwork: "base-sepolia", ...overrides };
}

describe("evaluateProposal", () => {
  it("passes amount, approved recipient, and configured network checks", () => {
    expect(evaluateProposal(proposal(), policy).every(rule => rule.passed)).toBe(true);
  });

  it("blocks an over-limit amount", () => {
    const results = evaluateProposal(proposal({ amountCents: 5001 }), policy);
    expect(results.find(rule => rule.key === "amount")?.passed).toBe(false);
    expect(results.filter(rule => !rule.passed)).toHaveLength(1);
  });

  it("blocks a recipient that is not allowlisted", () => {
    const results = evaluateProposal(proposal({ recipient: "0x1111111111111111111111111111111111111111" }), policy);
    expect(results.find(rule => rule.key === "recipient")?.passed).toBe(false);
  });

  it("blocks a different destination network", () => {
    const results = evaluateProposal(proposal({ destinationNetwork: "base-mainnet" }), policy);
    expect(results.find(rule => rule.key === "network")?.passed).toBe(false);
  });

  it("fails closed for invalid amounts and malformed recipients", () => {
    const results = evaluateProposal(proposal({ amountCents: 0, recipient: "not-an-address" }), policy);
    expect(results.filter(rule => !rule.passed).map(rule => rule.key)).toEqual(["amount", "recipient"]);
  });
});
