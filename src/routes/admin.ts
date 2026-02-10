import {
	createAuthEndpoint,
	createAuthMiddleware,
} from "@better-auth/core/api";
import { APIError, sessionMiddleware } from "better-auth/api";
import * as z from "zod";
import { WAITLIST_ERROR_CODES } from "../error-codes";
import type { WaitlistEntry, WaitlistOptions } from "../types";

const adminMiddleware = (options: WaitlistOptions) =>
	createAuthMiddleware(
		{
			use: [sessionMiddleware],
		},
		async (ctx) => {
			const adminRoles = options.adminRoles ?? ["admin"];
			const userRole = (ctx.context.session.user as Record<string, unknown>)
				.role as string | undefined;
			if (!userRole || !adminRoles.includes(userRole)) {
				throw new APIError("FORBIDDEN", {
					message: WAITLIST_ERROR_CODES.UNAUTHORIZED_ADMIN_ACTION,
				});
			}
			return {
				session: ctx.context.session,
			};
		},
	);

export const approveEntry = (options: WaitlistOptions) =>
	createAuthEndpoint(
		"/waitlist/approve",
		{
			method: "POST",
			body: z.object({
				email: z.email(),
			}),
			use: [adminMiddleware(options)],
			metadata: {
				openapi: {
					description: "Approve a waitlist entry",
					responses: { 200: { description: "Entry approved" } },
				},
			},
		},
		async (ctx) => {
			const normalizedEmail = ctx.body.email.toLowerCase();
			const entry = (await ctx.context.adapter.findOne({
				model: "waitlist",
				where: [{ field: "email", value: normalizedEmail }],
			})) as Record<string, unknown> | null;
			if (!entry) {
				throw new APIError("NOT_FOUND", {
					message: WAITLIST_ERROR_CODES.WAITLIST_ENTRY_NOT_FOUND,
				});
			}
			if (entry.status === "registered") {
				throw new APIError("BAD_REQUEST", {
					message: WAITLIST_ERROR_CODES.ALREADY_REGISTERED,
				});
			}

			const inviteCode = crypto.randomUUID();
			const expSeconds = options.inviteCodeExpiration ?? 172800;
			const inviteExpiresAt = new Date(Date.now() + expSeconds * 1000);
			const now = new Date();

			const updated = (await ctx.context.adapter.update({
				model: "waitlist",
				where: [{ field: "email", value: normalizedEmail }],
				update: {
					status: "approved",
					inviteCode,
					inviteExpiresAt,
					approvedAt: now,
					updatedAt: now,
				},
			})) as Record<string, unknown>;

			const updatedEntry = { ...entry, ...updated } as unknown as WaitlistEntry;

			if (options.sendInviteEmail) {
				await options.sendInviteEmail({
					email: normalizedEmail,
					inviteCode,
					expiresAt: inviteExpiresAt,
				});
			}
			if (options.onApproved) {
				await options.onApproved(updatedEntry);
			}

			return ctx.json(updatedEntry);
		},
	);

export const rejectEntry = (options: WaitlistOptions) =>
	createAuthEndpoint(
		"/waitlist/reject",
		{
			method: "POST",
			body: z.object({
				email: z.email(),
				reason: z.string().optional(),
			}),
			use: [adminMiddleware(options)],
			metadata: {
				openapi: {
					description: "Reject a waitlist entry",
					responses: { 200: { description: "Entry rejected" } },
				},
			},
		},
		async (ctx) => {
			const normalizedEmail = ctx.body.email.toLowerCase();
			const entry = (await ctx.context.adapter.findOne({
				model: "waitlist",
				where: [{ field: "email", value: normalizedEmail }],
			})) as Record<string, unknown> | null;
			if (!entry) {
				throw new APIError("NOT_FOUND", {
					message: WAITLIST_ERROR_CODES.WAITLIST_ENTRY_NOT_FOUND,
				});
			}

			const now = new Date();
			const updated = (await ctx.context.adapter.update({
				model: "waitlist",
				where: [{ field: "email", value: normalizedEmail }],
				update: {
					status: "rejected",
					rejectedAt: now,
					updatedAt: now,
				},
			})) as Record<string, unknown>;

			const updatedEntry = { ...entry, ...updated } as unknown as WaitlistEntry;
			if (options.onRejected) {
				await options.onRejected(updatedEntry);
			}

			return ctx.json(updatedEntry);
		},
	);

export const bulkApprove = (options: WaitlistOptions) =>
	createAuthEndpoint(
		"/waitlist/bulk-approve",
		{
			method: "POST",
			body: z.object({
				emails: z.array(z.email()).optional(),
				count: z.number().int().positive().optional(),
			}),
			use: [adminMiddleware(options)],
			metadata: {
				openapi: {
					description: "Bulk approve waitlist entries",
					responses: { 200: { description: "Entries approved" } },
				},
			},
		},
		async (ctx) => {
			const { emails, count } = ctx.body;
			const approved: WaitlistEntry[] = [];
			const inviteExpSeconds = options.inviteCodeExpiration ?? 172800;

			if (emails && emails.length > 0) {
				for (const email of emails) {
					const normalizedEmail = email.toLowerCase();
					const entry = (await ctx.context.adapter.findOne({
						model: "waitlist",
						where: [{ field: "email", value: normalizedEmail }],
					})) as Record<string, unknown> | null;
					if (!entry || entry.status !== "pending") continue;

					const inviteCode = crypto.randomUUID();
					const inviteExpiresAt = new Date(
						Date.now() + inviteExpSeconds * 1000,
					);
					const now = new Date();

					await ctx.context.adapter.update({
						model: "waitlist",
						where: [{ field: "email", value: normalizedEmail }],
						update: {
							status: "approved",
							inviteCode,
							inviteExpiresAt,
							approvedAt: now,
							updatedAt: now,
						},
					});

					const updatedEntry = {
						...entry,
						status: "approved",
						inviteCode,
						inviteExpiresAt,
						approvedAt: now,
						updatedAt: now,
					} as unknown as WaitlistEntry;
					approved.push(updatedEntry);

					if (options.sendInviteEmail) {
						await options.sendInviteEmail({
							email: normalizedEmail,
							inviteCode,
							expiresAt: inviteExpiresAt,
						});
					}
					if (options.onApproved) {
						await options.onApproved(updatedEntry);
					}
				}
			} else if (count) {
				const pending = (await ctx.context.adapter.findMany({
					model: "waitlist",
					where: [{ field: "status", value: "pending" }],
					sortBy: { field: "position", direction: "asc" },
					limit: count,
				})) as Record<string, unknown>[];

				for (const entry of pending) {
					const inviteCode = crypto.randomUUID();
					const inviteExpiresAt = new Date(
						Date.now() + inviteExpSeconds * 1000,
					);
					const now = new Date();

					await ctx.context.adapter.update({
						model: "waitlist",
						where: [{ field: "id", value: entry.id as string }],
						update: {
							status: "approved",
							inviteCode,
							inviteExpiresAt,
							approvedAt: now,
							updatedAt: now,
						},
					});

					const updatedEntry = {
						...entry,
						status: "approved",
						inviteCode,
						inviteExpiresAt,
						approvedAt: now,
						updatedAt: now,
					} as unknown as WaitlistEntry;
					approved.push(updatedEntry);

					if (options.sendInviteEmail) {
						await options.sendInviteEmail({
							email: entry.email as string,
							inviteCode,
							expiresAt: inviteExpiresAt,
						});
					}
					if (options.onApproved) {
						await options.onApproved(updatedEntry);
					}
				}
			}

			return ctx.json({ approved: approved.length, entries: approved });
		},
	);

export const listWaitlist = (options: WaitlistOptions) =>
	createAuthEndpoint(
		"/waitlist/list",
		{
			method: "GET",
			query: z.object({
				status: z
					.enum(["pending", "approved", "rejected", "registered"])
					.optional(),
				page: z.coerce.number().int().positive().optional(),
				limit: z.coerce.number().int().positive().max(100).optional(),
				sortBy: z.enum(["createdAt", "position", "email", "status"]).optional(),
				sortDirection: z.enum(["asc", "desc"]).optional(),
			}),
			use: [adminMiddleware(options)],
			metadata: {
				openapi: {
					description: "List waitlist entries with pagination",
					responses: {
						200: { description: "Paginated waitlist entries" },
					},
				},
			},
		},
		async (ctx) => {
			const page = ctx.query.page ?? 1;
			const limit = ctx.query.limit ?? 20;
			const offset = (page - 1) * limit;

			const where = ctx.query.status
				? [{ field: "status" as const, value: ctx.query.status }]
				: undefined;

			const entries = await ctx.context.adapter.findMany({
				model: "waitlist",
				where,
				sortBy: {
					field: ctx.query.sortBy ?? "createdAt",
					direction: ctx.query.sortDirection ?? "desc",
				},
				limit,
				offset,
			});

			const total = await ctx.context.adapter.count({
				model: "waitlist",
				where,
			});

			return ctx.json({
				entries,
				total,
				page,
				totalPages: Math.ceil(total / limit),
			});
		},
	);

export const getWaitlistStats = (options: WaitlistOptions) =>
	createAuthEndpoint(
		"/waitlist/stats",
		{
			method: "GET",
			use: [adminMiddleware(options)],
			metadata: {
				openapi: {
					description: "Get waitlist statistics",
					responses: { 200: { description: "Waitlist statistics" } },
				},
			},
		},
		async (ctx) => {
			const total = await ctx.context.adapter.count({
				model: "waitlist",
			});
			const pending = await ctx.context.adapter.count({
				model: "waitlist",
				where: [{ field: "status", value: "pending" }],
			});
			const approved = await ctx.context.adapter.count({
				model: "waitlist",
				where: [{ field: "status", value: "approved" }],
			});
			const rejected = await ctx.context.adapter.count({
				model: "waitlist",
				where: [{ field: "status", value: "rejected" }],
			});
			const registered = await ctx.context.adapter.count({
				model: "waitlist",
				where: [{ field: "status", value: "registered" }],
			});

			return ctx.json({ total, pending, approved, rejected, registered });
		},
	);
