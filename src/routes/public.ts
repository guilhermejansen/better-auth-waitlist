import { createAuthEndpoint } from "@better-auth/core/api";
import { APIError } from "better-auth/api";
import * as z from "zod";
import { WAITLIST_ERROR_CODES } from "../error-codes";
import type { WaitlistEntry, WaitlistOptions } from "../types";

export const joinWaitlist = (options: WaitlistOptions) =>
	createAuthEndpoint(
		"/waitlist/join",
		{
			method: "POST",
			body: z.object({
				email: z.email(),
				referredBy: z.string().optional(),
				metadata: z.record(z.string(), z.unknown()).optional(),
			}),
			metadata: {
				openapi: {
					description: "Join the waitlist",
					responses: {
						200: { description: "Successfully joined the waitlist" },
					},
				},
			},
		},
		async (ctx) => {
			const { email, referredBy, metadata } = ctx.body;
			const normalizedEmail = email.toLowerCase();

			// Check for duplicate
			const existing = await ctx.context.adapter.findOne({
				model: "waitlist",
				where: [{ field: "email", value: normalizedEmail }],
			});
			if (existing) {
				throw new APIError("BAD_REQUEST", {
					message: WAITLIST_ERROR_CODES.EMAIL_ALREADY_IN_WAITLIST,
				});
			}

			// Check max size
			if (options.maxWaitlistSize) {
				const count = await ctx.context.adapter.count({
					model: "waitlist",
				});
				if (count >= options.maxWaitlistSize) {
					throw new APIError("BAD_REQUEST", {
						message: WAITLIST_ERROR_CODES.WAITLIST_FULL,
					});
				}
			}

			// Calculate position
			const totalCount = await ctx.context.adapter.count({
				model: "waitlist",
			});

			// Check auto-approve
			let status = "pending";
			let inviteCode: string | null = null;
			let inviteExpiresAt: Date | null = null;
			let approvedAt: Date | null = null;

			if (options.autoApprove) {
				const shouldApprove =
					typeof options.autoApprove === "function"
						? await options.autoApprove(normalizedEmail)
						: true;
				if (shouldApprove) {
					status = "approved";
					inviteCode = crypto.randomUUID();
					const expSeconds = options.inviteCodeExpiration ?? 172800;
					inviteExpiresAt = new Date(Date.now() + expSeconds * 1000);
					approvedAt = new Date();
				}
			}

			const now = new Date();
			const entry = (await ctx.context.adapter.create({
				model: "waitlist",
				data: {
					email: normalizedEmail,
					status,
					inviteCode,
					inviteExpiresAt,
					position: totalCount + 1,
					referredBy: referredBy ?? null,
					metadata: metadata ? JSON.stringify(metadata) : null,
					approvedAt,
					rejectedAt: null,
					registeredAt: null,
					createdAt: now,
					updatedAt: now,
				},
			})) as Record<string, unknown>;

			// Callbacks
			if (options.onJoinWaitlist) {
				await options.onJoinWaitlist(entry as unknown as WaitlistEntry);
			}
			if (
				status === "approved" &&
				options.sendInviteEmail &&
				inviteCode &&
				inviteExpiresAt
			) {
				await options.sendInviteEmail({
					email: normalizedEmail,
					inviteCode,
					expiresAt: inviteExpiresAt,
				});
			}
			if (status === "approved" && options.onApproved) {
				await options.onApproved(entry as unknown as WaitlistEntry);
			}

			return ctx.json({
				id: entry.id,
				email: entry.email,
				status: entry.status,
				position: entry.position,
				createdAt: entry.createdAt,
			});
		},
	);

export const getWaitlistStatus = (_options: WaitlistOptions) =>
	createAuthEndpoint(
		"/waitlist/status",
		{
			method: "GET",
			query: z.object({
				email: z.email(),
			}),
			metadata: {
				openapi: {
					description: "Check waitlist status for an email",
					responses: {
						200: { description: "Waitlist status" },
					},
				},
			},
		},
		async (ctx) => {
			const normalizedEmail = ctx.query.email.toLowerCase();
			const entry = (await ctx.context.adapter.findOne({
				model: "waitlist",
				where: [{ field: "email", value: normalizedEmail }],
			})) as Record<string, unknown> | null;
			if (!entry) {
				throw new APIError("NOT_FOUND", {
					message: WAITLIST_ERROR_CODES.WAITLIST_ENTRY_NOT_FOUND,
				});
			}
			return ctx.json({
				status: entry.status as string,
				position: entry.position as number,
			});
		},
	);

export const verifyInviteCode = (_options: WaitlistOptions) =>
	createAuthEndpoint(
		"/waitlist/verify-invite",
		{
			method: "POST",
			body: z.object({
				inviteCode: z.string(),
			}),
			metadata: {
				openapi: {
					description: "Verify a waitlist invite code",
					responses: {
						200: { description: "Invite code verification result" },
					},
				},
			},
		},
		async (ctx) => {
			const { inviteCode } = ctx.body;
			const entry = (await ctx.context.adapter.findOne({
				model: "waitlist",
				where: [
					{ field: "inviteCode", value: inviteCode },
					{ field: "status", value: "approved" },
				],
			})) as Record<string, unknown> | null;
			if (!entry) {
				return ctx.json({ valid: false, email: null });
			}
			if (
				entry.inviteExpiresAt &&
				new Date(entry.inviteExpiresAt as string) < new Date()
			) {
				return ctx.json({ valid: false, email: null });
			}
			return ctx.json({ valid: true, email: entry.email as string });
		},
	);
