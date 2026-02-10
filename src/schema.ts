import type { BetterAuthPluginDBSchema } from "@better-auth/core/db";

export const schema = {
	waitlist: {
		fields: {
			email: {
				type: "string",
				required: true,
				unique: true,
			},
			status: {
				type: "string",
				required: true,
				defaultValue: "pending",
			},
			inviteCode: {
				type: "string",
				required: false,
				unique: true,
			},
			inviteExpiresAt: {
				type: "date",
				required: false,
			},
			position: {
				type: "number",
				required: false,
			},
			referredBy: {
				type: "string",
				required: false,
			},
			metadata: {
				type: "string",
				required: false,
			},
			approvedAt: {
				type: "date",
				required: false,
			},
			rejectedAt: {
				type: "date",
				required: false,
			},
			registeredAt: {
				type: "date",
				required: false,
			},
			createdAt: {
				type: "date",
				required: true,
			},
			updatedAt: {
				type: "date",
				required: true,
			},
		},
	},
} satisfies BetterAuthPluginDBSchema;
