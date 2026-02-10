import type { BetterAuthClientPlugin } from "better-auth/client";
import { useAuthQuery } from "better-auth/client";
import { atom } from "nanostores";
import type { waitlist } from "./index";
import type { WaitlistClientOptions, WaitlistEntry } from "./types";

interface WaitlistStats {
	total: number;
	pending: number;
	approved: number;
	rejected: number;
	registered: number;
}

export const waitlistClient = (_options?: WaitlistClientOptions) => {
	const $waitlistSignal = atom<boolean>(false);

	return {
		id: "waitlist",
		$InferServerPlugin: {} as ReturnType<typeof waitlist>,
		getActions: ($fetch) => ({
			waitlist: {
				join: async (
					data: {
						email: string;
						referredBy?: string;
						metadata?: Record<string, unknown>;
					},
					fetchOptions?: RequestInit,
				) => {
					return $fetch("/waitlist/join", {
						method: "POST",
						body: data,
						...fetchOptions,
					});
				},
				status: async (data: { email: string }, fetchOptions?: RequestInit) => {
					return $fetch("/waitlist/status", {
						method: "GET",
						query: data,
						...fetchOptions,
					});
				},
				verifyInvite: async (
					data: { inviteCode: string },
					fetchOptions?: RequestInit,
				) => {
					return $fetch("/waitlist/verify-invite", {
						method: "POST",
						body: data,
						...fetchOptions,
					});
				},
			},
			$Infer: {} as {
				WaitlistEntry: WaitlistEntry;
			},
		}),
		getAtoms($fetch) {
			const waitlistStats = useAuthQuery<WaitlistStats>(
				$waitlistSignal,
				"/waitlist/stats",
				$fetch,
				{
					method: "GET",
				},
			);
			return {
				$waitlistSignal,
				waitlistStats,
			};
		},
		pathMethods: {
			"/waitlist/join": "POST",
			"/waitlist/status": "GET",
			"/waitlist/verify-invite": "POST",
			"/waitlist/approve": "POST",
			"/waitlist/reject": "POST",
			"/waitlist/bulk-approve": "POST",
			"/waitlist/list": "GET",
			"/waitlist/stats": "GET",
		},
		atomListeners: [
			{
				matcher(path) {
					return (
						path === "/waitlist/approve" ||
						path === "/waitlist/reject" ||
						path === "/waitlist/bulk-approve"
					);
				},
				signal: "$waitlistSignal",
			},
			{
				matcher: (path) => path === "/waitlist/join",
				signal: "$waitlistSignal",
			},
		],
	} satisfies BetterAuthClientPlugin;
};

export type { WaitlistClientOptions, WaitlistEntry } from "./types";
