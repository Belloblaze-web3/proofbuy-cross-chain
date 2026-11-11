import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { evaluateProposal } from "./proofbuy/policy";
import { approveProposal, createProposal, getDashboard, savePolicy, simulateExecution } from "./proofbuy/storage";

const workspaceIdSchema = z.string().regex(/^pb_[a-f0-9-]{36}$/i, "Invalid demo workspace id");
const networkSchema = z.enum(["base-sepolia", "base-mainnet"]);
const evmAddressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Enter a valid EVM address");

function asInternalError(error: unknown): never {
  console.error("[ProofBuy] Request failed:", error);
  const message = error instanceof Error && /^(Proposal not found|Only a policy-passed|Only an approved|Human approval is still|required|Database is not available)/.test(error.message)
    ? error.message
    : "The request could not be completed. Check database readiness and try again.";
  throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message });
}

export const appRouter = router({
  system: systemRouter,
  proofbuy: router({
    getDashboard: publicProcedure.input(z.object({ workspaceId: workspaceIdSchema })).query(async ({ input }) => {
      try { return await getDashboard(input.workspaceId); } catch (error) { return asInternalError(error); }
    }),
    updatePolicy: publicProcedure.input(z.object({
      workspaceId: workspaceIdSchema,
      maxSpendCents: z.number().int().min(100).max(10_000_000),
      allowedRecipients: z.array(evmAddressSchema).max(12),
      destinationNetwork: networkSchema,
      requireHumanApproval: z.boolean(),
    })).mutation(async ({ input }) => {
      try { return await savePolicy(input); } catch (error) { return asInternalError(error); }
    }),
    createProposal: publicProcedure.input(z.object({
      workspaceId: workspaceIdSchema,
      vendor: z.string().trim().min(2).max(120),
      recipient: evmAddressSchema,
      amountCents: z.number().int().min(1).max(1_000_000_000),
      currency: z.literal("USDC").default("USDC"),
      destinationNetwork: networkSchema,
      purpose: z.string().trim().min(3).max(1000),
    })).mutation(async ({ input }) => {
      try {
        const { policy } = await getDashboard(input.workspaceId);
        const ruleResults = evaluateProposal(input, policy);
        return await createProposal({ ...input, ruleResults }, policy);
      } catch (error) { return asInternalError(error); }
    }),
    approve: publicProcedure.input(z.object({ workspaceId: workspaceIdSchema, proposalId: z.string().uuid() }))
      .mutation(async ({ input }) => {
        try { return await approveProposal(input.workspaceId, input.proposalId); } catch (error) { return asInternalError(error); }
      }),
    simulate: publicProcedure.input(z.object({
      workspaceId: workspaceIdSchema,
      proposalId: z.string().uuid(),
      outcome: z.enum(["completed", "failed"]).default("completed"),
    }))
      .mutation(async ({ input }) => {
        try { return await simulateExecution(input.workspaceId, input.proposalId, input.outcome); } catch (error) { return asInternalError(error); }
      }),
  }),
  auth: router({
    me: publicProcedure.query(({ ctx }) => ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
});

export type AppRouter = typeof appRouter;
