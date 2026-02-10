import { createAuthMiddleware } from "@better-auth/core/api";
import type { BetterAuthPlugin } from "better-auth";
import { APIError } from "better-auth/api";
import { mergeSchema } from "better-auth/db";
import { WAITLIST_ERROR_CODES } from "./error-codes";
import {
	approveEntry,
	bulkApprove,
	getWaitlistStats,
	listWaitlist,
	rejectEntry,
} from "./routes/admin";
import {
	getWaitlistStatus,
	joinWaitlist,
	verifyInviteCode,
} from "./routes/public";
import { schema } from "./schema";
import type { WaitlistOptions } from "./types";

export { WAITLIST_ERROR_CODES } from "./error-codes";
export type { WaitlistOptions, WaitlistEntry, WaitlistStatus } from "./types";

const DEFAULT_INTERCEPT_PATHS = [
	"/sign-up/email",
	"/callback/",
	"/oauth2/callback/",
	"/magic-link/verify",
	"/sign-in/email-otp",
	"/email-otp/verify-email",
	"/phone-number/verify",
	"/sign-in/anonymous",
	"/one-tap/callback",
	"/siwe/verify",
];

export const waitlist = (options?: WaitlistOptions) => {
	const opts: WaitlistOptions = {
		enabled: true,
		requireInviteCode: false,
		inviteCodeExpiration: 172800,
		skipAnonymous: false,
		adminRoles: ["admin"],
		...options,
	};

	return {
		id: "waitlist",

		init() {
			return {
				options: {
					databaseHooks: {
						user: {
							create: {
								async before(user, ctx) {
									if (opts.enabled === false) return;

									// Skip anonymous users if configured
									if (
										opts.skipAnonymous &&
										(user as Record<string, unknown>).isAnonymous
									)
										return;

									// No email means we can't check waitlist
									if (!user.email) return;

									const email = user.email.toLowerCase();

									if (!ctx) return;
									const adapter = ctx.context?.adapter;
									if (!adapter) return;

									const entry = await adapter.findOne({
										model: "waitlist",
										where: [
											{ field: "email", value: email },
											{ field: "status", value: "approved" },
										],
									});

									// If no approved entry, block user creation
									if (!entry) {
										return false;
									}
								},
								async after(user, ctx) {
									if (opts.enabled === false) return;
									if (!user.email) return;
									if (!ctx) return;

									const email = user.email.toLowerCase();
									const adapter = ctx.context?.adapter;
									if (!adapter) return;

									// Mark waitlist entry as registered
									const entry = await adapter.findOne({
										model: "waitlist",
										where: [{ field: "email", value: email }],
									});

									if (entry) {
										await adapter.update({
											model: "waitlist",
											where: [{ field: "email", value: email }],
											update: {
												status: "registered",
												registeredAt: new Date(),
												updatedAt: new Date(),
											},
										});
									}
								},
							},
						},
					},
				},
			};
		},

		endpoints: {
			joinWaitlist: joinWaitlist(opts),
			getWaitlistStatus: getWaitlistStatus(opts),
			verifyInviteCode: verifyInviteCode(opts),
			approveEntry: approveEntry(opts),
			rejectEntry: rejectEntry(opts),
			bulkApprove: bulkApprove(opts),
			listWaitlist: listWaitlist(opts),
			getWaitlistStats: getWaitlistStats(opts),
		},

		hooks: {
			before: [
				{
					matcher(context: { path?: string }) {
						if (opts.enabled === false) return false;
						const paths = opts.interceptPaths ?? DEFAULT_INTERCEPT_PATHS;
						return paths.some(
							(p) => context.path === p || context.path?.startsWith(p),
						);
					},
					handler: createAuthMiddleware(async (ctx) => {
						// Extract email from request body
						const email = ctx.body?.email as string | undefined;

						if (email) {
							const normalizedEmail = email.toLowerCase();

							// Check if this is a login (user already exists) vs signup
							const existingUser =
								await ctx.context.internalAdapter.findUserByEmail(
									normalizedEmail,
								);
							if (existingUser) {
								// Existing user -- this is a login, let it through
								return;
							}
						}

						if (opts.requireInviteCode) {
							// Require invite code in body or header
							const code =
								(ctx.body?.inviteCode as string | undefined) ||
								ctx.headers?.get("x-invite-code");
							if (!code) {
								throw new APIError("FORBIDDEN", {
									message: WAITLIST_ERROR_CODES.INVITE_CODE_REQUIRED,
								});
							}

							const entry = (await ctx.context.adapter.findOne({
								model: "waitlist",
								where: [
									{ field: "inviteCode", value: code },
									{ field: "status", value: "approved" },
								],
							})) as Record<string, unknown> | null;

							if (!entry) {
								throw new APIError("FORBIDDEN", {
									message: WAITLIST_ERROR_CODES.INVALID_INVITE_CODE,
								});
							}

							// Check expiration
							if (
								entry.inviteExpiresAt &&
								new Date(entry.inviteExpiresAt as string) < new Date()
							) {
								throw new APIError("FORBIDDEN", {
									message: WAITLIST_ERROR_CODES.INVALID_INVITE_CODE,
								});
							}
						} else if (email) {
							// No invite code required -- just check approval status
							const normalizedEmail = email.toLowerCase();
							const entry = (await ctx.context.adapter.findOne({
								model: "waitlist",
								where: [{ field: "email", value: normalizedEmail }],
							})) as Record<string, unknown> | null;

							if (!entry || entry.status !== "approved") {
								throw new APIError("FORBIDDEN", {
									message: WAITLIST_ERROR_CODES.NOT_APPROVED,
								});
							}
						}
						// If no email in body (e.g., OAuth callbacks), the databaseHooks
						// will catch it
					}),
				},
			],
		},

		schema: mergeSchema(schema, opts.schema),
		$ERROR_CODES: WAITLIST_ERROR_CODES,
	} satisfies BetterAuthPlugin;
};
