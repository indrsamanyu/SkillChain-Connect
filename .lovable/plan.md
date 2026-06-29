# What's Left — Milestone 4: Admin + Polish

M1 (Foundation), M2 (Freelancer), and M3 (Client) are done. The final milestone covers admin tooling and platform-wide polish.

## Admin
- User management table: list all users with role, status, signup date; promote/demote roles via `user_roles`; suspend/reactivate accounts.
- Moderation: review/remove flagged jobs, applications, and portfolio items; reason log.
- Platform analytics dashboard (Recharts): signups over time, jobs posted, applications submitted, role mix, top skills.
- Reports queue: simple table of user-submitted reports with resolve/dismiss actions.
- All admin server fns gated by `has_role(auth.uid(), 'admin')`.

## Polish (cross-app)
- Empty states and loading skeletons for every list view (jobs, applications, candidates, portfolio).
- Page transitions via Framer Motion on route changes; stagger on card grids.
- Per-route SEO metadata pass: unique `title`/`description`/`og:*` on landing, auth, freelancer, client, admin, and dynamic job detail pages.
- 404 / error boundary visual polish to match the warm/glass design system.
- Accessibility pass: focus rings, aria-labels on icon buttons, keyboard nav for sidebar and dialogs, color-contrast spot-check.
- Notifications surface: dropdown in dashboard header reading from `notifications` table with mark-as-read.
- Performance: lazy-load Recharts and heavy AI panels; verify build size; image alt text everywhere.

## Quick fix folded in
- Resolve the `/auth` hydration mismatch (server-rendered `<div>` vs client `<Suspense>`) by aligning the AuthPage root element across SSR/CSR.

## Technical notes
- New tables (if needed): `reports` (id, reporter_id, target_type, target_id, reason, status). Add GRANTs + RLS (reporters insert own; admins select/update all via `has_role`).
- Admin server fns in `src/lib/admin.functions.ts`; admin routes under `src/routes/_authenticated/admin.*.tsx` with role check in `beforeLoad` + handler-side `has_role` enforcement.
- Notifications: server fn `listMyNotifications` + `markNotificationRead`; realtime optional, polling on focus is fine for v1.

Approve to build M4.
