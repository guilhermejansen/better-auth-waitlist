export type WaitlistStatus = "pending" | "approved" | "rejected" | "registered";

export interface WaitlistEntry {
	id: string;
	email: string;
	status: WaitlistStatus;
	inviteCode: string | null;
	inviteExpiresAt: Date | null;
	position: number | null;
	referredBy: string | null;
	metadata: string | null;
	approvedAt: Date | null;
	rejectedAt: Date | null;
	registeredAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
}

export interface WaitlistOptions {
	/** Whether the waitlist gate is active. Defaults to true. */
	enabled?: boolean;
	/** Require an invite code to register instead of just being approved. */
	requireInviteCode?: boolean;
	/** Invite code TTL in seconds. Defaults to 172800 (48 hours). */
	inviteCodeExpiration?: number;
	/** Maximum number of entries allowed on the waitlist. */
	maxWaitlistSize?: number;
	/** Skip waitlist checks for anonymous sign-ins. Defaults to false. */
	skipAnonymous?: boolean;
	/**
	 * Automatically approve entries when they join.
	 * Pass `true` to auto-approve all, or a function for conditional logic.
	 */
	autoApprove?: boolean | ((email: string) => boolean | Promise<boolean>);
	/**
	 * List of Better Auth paths to intercept. Defaults to all registration paths.
	 */
	interceptPaths?: string[];
	/**
	 * Roles that are allowed to perform admin actions.
	 * Defaults to ["admin"].
	 */
	adminRoles?: string[];
	/** Called after an entry joins the waitlist. */
	onJoinWaitlist?: (entry: WaitlistEntry) => void | Promise<void>;
	/** Called after an entry is approved. */
	onApproved?: (entry: WaitlistEntry) => void | Promise<void>;
	/** Called after an entry is rejected. */
	onRejected?: (entry: WaitlistEntry) => void | Promise<void>;
	/**
	 * Called when an entry is approved to send the invite email.
	 * You must implement this to deliver invite codes to users.
	 */
	sendInviteEmail?: (data: {
		email: string;
		inviteCode: string;
		expiresAt: Date;
	}) => void | Promise<void>;
	/** Customise table and field names for the waitlist schema. */
	schema?: {
		waitlist?: {
			modelName?: string;
			fields?: Record<string, string>;
		};
	};
}

export interface WaitlistClientOptions {
	/** Base URL override for waitlist API calls. */
	baseURL?: string;
}
