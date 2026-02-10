# @guilhermejansen/better-auth-waitlist

<p align="center">
  <a href="https://www.npmjs.com/package/@guilhermejansen/better-auth-waitlist"><img src="https://img.shields.io/npm/v/@guilhermejansen/better-auth-waitlist?style=flat-square&color=cb3837&label=npm" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/@guilhermejansen/better-auth-waitlist"><img src="https://img.shields.io/npm/dm/@guilhermejansen/better-auth-waitlist?style=flat-square&color=blue" alt="npm downloads"></a>
  <a href="https://github.com/guilhermejansen/better-auth-waitlist/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/@guilhermejansen/better-auth-waitlist?style=flat-square&color=green" alt="license"></a>
  <a href="https://github.com/guilhermejansen/better-auth-waitlist/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/guilhermejansen/better-auth-waitlist/ci.yml?branch=main&style=flat-square&label=CI" alt="CI"></a>
  <br>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.9+-3178c6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript"></a>
  <a href="https://www.better-auth.com"><img src="https://img.shields.io/badge/Better_Auth-^1.0.0-6c47ff?style=flat-square" alt="Better Auth"></a>
  <a href="https://bundlephobia.com/package/@guilhermejansen/better-auth-waitlist"><img src="https://img.shields.io/bundlephobia/minzip/@guilhermejansen/better-auth-waitlist?style=flat-square&label=bundle%20size&color=e8590c" alt="bundle size"></a>
  <a href="https://github.com/guilhermejansen/better-auth-waitlist"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square" alt="PRs Welcome"></a>
</p>

A [Better Auth](https://www.better-auth.com) community plugin that adds **waitlist and early-access gating** to your authentication system. Intercepts all registration paths and gates sign-ups behind an invite-based waitlist.

## Features

- **Intercepts all registration paths** -- email/password, OAuth, magic link, OTP, phone, anonymous, one-tap, and SIWE are all gated automatically
- **Dual-layer protection** -- hooks intercept requests before processing _and_ database hooks block user creation as a safety net
- **Admin dashboard endpoints** -- approve, reject, bulk approve, list entries, and view statistics
- **Invite code system** -- unique codes with configurable expiration (default 48 hours)
- **Auto-approve mode** -- pass `true` to approve everyone, or a function for conditional logic
- **Bulk approve** -- approve specific emails or the next N entries in the queue
- **Referral tracking** -- track referrals and attach arbitrary JSON metadata to entries
- **Lifecycle callbacks** -- `onJoinWaitlist`, `onApproved`, `onRejected`, and `sendInviteEmail` for email notifications
- **Full TypeScript support** -- type-safe client and server APIs with inference
- **Works with any Better Auth adapter** -- Prisma 5/6/7, Drizzle, MongoDB, SQLite, MySQL, PostgreSQL, and more
- **Framework agnostic** -- Next.js 14-16, Nuxt, SvelteKit, Solid, Remix, Hono, Express, and any other framework Better Auth supports

## Requirements

- `better-auth` >= 1.0.0
- Node.js >= 18 (or Bun, Deno, etc.)

## Installation

```bash
npm install @guilhermejansen/better-auth-waitlist
```

```bash
pnpm add @guilhermejansen/better-auth-waitlist
```

```bash
bun add @guilhermejansen/better-auth-waitlist
```

```bash
yarn add @guilhermejansen/better-auth-waitlist
```

## Quick Start

### Server Setup

```typescript
import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins/admin";
import { waitlist } from "@guilhermejansen/better-auth-waitlist";

export const auth = betterAuth({
  // ... your config
  plugins: [
    admin(), // Required for admin role checking
    waitlist({
      requireInviteCode: true,
      sendInviteEmail: async ({ email, inviteCode, expiresAt }) => {
        await sendEmail({
          to: email,
          subject: "You're invited!",
          body: `Use code: ${inviteCode}`,
        });
      },
    }),
  ],
});
```

### Client Setup

```typescript
import { createAuthClient } from "better-auth/client";
import { waitlistClient } from "@guilhermejansen/better-auth-waitlist/client";

export const authClient = createAuthClient({
  plugins: [waitlistClient()],
});
```

## API Reference

### Public Endpoints

These endpoints are available without authentication.

#### Join the Waitlist

```typescript
const { data, error } = await authClient.waitlist.join({
  email: "user@example.com",
  referredBy: "friend-id", // optional
  metadata: { source: "landing-page" }, // optional
});
// data: { id, email, status, position, createdAt }
```

#### Check Waitlist Status

```typescript
const { data } = await authClient.waitlist.status({
  email: "user@example.com",
});
// data: { status: "pending" | "approved" | "rejected" | "registered", position: number }
```

#### Verify Invite Code

```typescript
const { data } = await authClient.waitlist.verifyInvite({
  inviteCode: "abc-123-def",
});
// data: { valid: boolean, email: string | null }
```

#### Register with Invite Code

When `requireInviteCode` is enabled, pass the invite code during sign-up:

```typescript
const { data } = await authClient.signUp.email({
  email: "user@example.com",
  password: "securepassword",
  name: "User",
  inviteCode: "abc-123-def", // Required when requireInviteCode is true
});
```

Or via header:

```typescript
const { data } = await authClient.signUp.email(
  { email: "user@example.com", password: "securepassword", name: "User" },
  { headers: { "x-invite-code": "abc-123-def" } },
);
```

### Admin Endpoints

All admin endpoints require an authenticated session with an admin role.

#### Approve Entry

```typescript
await auth.api.approveEntry({
  body: { email: "user@example.com" },
});
```

#### Reject Entry

```typescript
await auth.api.rejectEntry({
  body: { email: "user@example.com", reason: "Not qualified" },
});
```

#### Bulk Approve

```typescript
// Approve specific emails
await auth.api.bulkApprove({
  body: { emails: ["a@test.com", "b@test.com"] },
});

// Approve next N entries in the queue (ordered by position)
await auth.api.bulkApprove({
  body: { count: 10 },
});
```

#### List Entries

```typescript
const data = await auth.api.listWaitlist({
  query: {
    status: "pending", // optional: filter by status
    page: 1,
    limit: 20,
    sortBy: "createdAt", // "createdAt" | "position" | "email" | "status"
    sortDirection: "desc", // "asc" | "desc"
  },
});
// data: { entries: WaitlistEntry[], total: number, page: number, totalPages: number }
```

#### Get Statistics

```typescript
const stats = await auth.api.getWaitlistStats();
// stats: { total, pending, approved, rejected, registered }
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | `boolean` | `true` | Enable or disable the waitlist gate |
| `requireInviteCode` | `boolean` | `false` | Require an invite code during registration |
| `inviteCodeExpiration` | `number` | `172800` | Invite code TTL in seconds (48 hours) |
| `maxWaitlistSize` | `number` | `undefined` | Maximum number of entries allowed on the waitlist |
| `skipAnonymous` | `boolean` | `false` | Skip waitlist checks for anonymous sign-ins |
| `autoApprove` | `boolean \| (email: string) => boolean \| Promise<boolean>` | `undefined` | Auto-approve entries on join. Pass `true` for all, or a function for conditional logic |
| `interceptPaths` | `string[]` | All registration paths | Override which Better Auth paths are intercepted |
| `adminRoles` | `string[]` | `["admin"]` | Roles that are allowed to perform admin actions |
| `onJoinWaitlist` | `(entry: WaitlistEntry) => void \| Promise<void>` | `undefined` | Called after an entry joins the waitlist |
| `onApproved` | `(entry: WaitlistEntry) => void \| Promise<void>` | `undefined` | Called after an entry is approved |
| `onRejected` | `(entry: WaitlistEntry) => void \| Promise<void>` | `undefined` | Called after an entry is rejected |
| `sendInviteEmail` | `(data: { email, inviteCode, expiresAt }) => void \| Promise<void>` | `undefined` | Called on approval to deliver the invite code |
| `schema` | `object` | `undefined` | Customize table and field names |

### Default Intercepted Paths

When `interceptPaths` is not set, these registration paths are intercepted:

- `/sign-up/email`
- `/callback/` (OAuth)
- `/oauth2/callback/` (OAuth2)
- `/magic-link/verify`
- `/sign-in/email-otp`
- `/email-otp/verify-email`
- `/phone-number/verify`
- `/sign-in/anonymous`
- `/one-tap/callback`
- `/siwe/verify`

## Database Schema

The plugin creates a `waitlist` table with the following fields:

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Primary key |
| `email` | `string` | Email address (unique, indexed) |
| `status` | `string` | `pending` / `approved` / `rejected` / `registered` |
| `inviteCode` | `string?` | Unique invite code (generated on approval) |
| `inviteExpiresAt` | `date?` | Invite code expiration timestamp |
| `position` | `number?` | Queue position (assigned on join) |
| `referredBy` | `string?` | Referral identifier |
| `metadata` | `string?` | JSON-serialized metadata |
| `approvedAt` | `date?` | Approval timestamp |
| `rejectedAt` | `date?` | Rejection timestamp |
| `registeredAt` | `date?` | Registration timestamp |
| `createdAt` | `date` | Created timestamp |
| `updatedAt` | `date` | Updated timestamp |

## How It Works

The plugin uses a dual-layer interception strategy to ensure no unapproved user can register, regardless of which authentication method they use:

1. **Hooks Layer** -- `hooks.before` intercepts registration endpoints and validates waitlist status _before_ the request is processed. This catches email/password sign-ups, OTP, magic links, and any path that includes the email in the request body.

2. **Database Hooks Layer** -- `databaseHooks.user.create.before` acts as a safety net, blocking user creation at the database level if the email does not have an approved waitlist entry. This catches OAuth callbacks and any other flow where the email is not available in the request body.

3. **Post-Registration** -- `databaseHooks.user.create.after` automatically marks the waitlist entry as `registered` after successful sign-up, preventing the invite code from being reused.

## Schema Customization

You can customize the table and field names to match your existing database conventions:

```typescript
waitlist({
  schema: {
    waitlist: {
      modelName: "WaitlistEntry", // Custom table name
      fields: {
        email: "emailAddress", // Custom field names
      },
    },
  },
});
```

## Error Codes

The plugin exports `WAITLIST_ERROR_CODES` for programmatic error handling:

| Code | Message |
|------|---------|
| `EMAIL_ALREADY_IN_WAITLIST` | This email is already on the waitlist |
| `WAITLIST_ENTRY_NOT_FOUND` | Waitlist entry not found |
| `NOT_APPROVED` | You must be approved from the waitlist to register |
| `INVALID_INVITE_CODE` | Invalid or expired invite code |
| `INVITE_CODE_REQUIRED` | An invite code is required to register |
| `ALREADY_REGISTERED` | This waitlist entry has already been used for registration |
| `WAITLIST_FULL` | The waitlist is currently full |
| `UNAUTHORIZED_ADMIN_ACTION` | You are not authorized to perform this action |

```typescript
import { WAITLIST_ERROR_CODES } from "@guilhermejansen/better-auth-waitlist";

if (error.message === WAITLIST_ERROR_CODES.NOT_APPROVED) {
  // Handle not approved
}
```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines on how to contribute to this project.

## License

[MIT](./LICENSE) -- Guilherme Jansen

---

<p align="center">
  <sub>Built with love for the open source community by <a href="https://github.com/guilhermejansen">Guilherme Jansen</a>.</sub>
  <br>
  <sub>I built this plugin because manually implementing waitlist gating for every SaaS project was a recurring pain point. Now I use it in production across all my projects, including <a href="https://insightzap.setupautomatizado.com.br">InsightZap</a>. I hope it saves you time too.</sub>
</p>
