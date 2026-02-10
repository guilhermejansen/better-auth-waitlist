// NOTE: Error code const must be all capital of string (ref https://github.com/better-auth/better-auth/issues/4386)
import { defineErrorCodes } from "@better-auth/core/utils";

export const WAITLIST_ERROR_CODES = defineErrorCodes({
	EMAIL_ALREADY_IN_WAITLIST: "This email is already on the waitlist",
	WAITLIST_ENTRY_NOT_FOUND: "Waitlist entry not found",
	NOT_APPROVED: "You must be approved from the waitlist to register",
	INVALID_INVITE_CODE: "Invalid or expired invite code",
	INVITE_CODE_REQUIRED: "An invite code is required to register",
	ALREADY_REGISTERED:
		"This waitlist entry has already been used for registration",
	WAITLIST_FULL: "The waitlist is currently full",
	UNAUTHORIZED_ADMIN_ACTION: "You are not authorized to perform this action",
});
