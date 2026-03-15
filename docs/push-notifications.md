# Push Notifications — Zivug Mishamayim

## Architecture

| Layer | File | Role |
|---|---|---|
| Token registration | `lib/notificationService.ts` | Registers Expo push token on login, removes on logout |
| Sending | `lib/notificationService.ts → sendNotification()` | Calls the `send-notification` Edge Function with `{ userId, title, body, data }` |
| Edge Function | `supabase/functions/send-notification` | Uses service-role key to bypass RLS, looks up push token, sends via Expo API, writes to `notifications` table |
| Deep-link on tap (cold start) | `app/_layout.tsx → NotificationHandler` | `Notifications.addNotificationResponseReceivedListener` maps `data.type` → tab route |
| In-app panel | `components/NotificationPanel.tsx` | Slide-in modal; auto-marks all read on open; invalidates React Query cache on tap |
| Notifications screen | `app/(tabs)/notifications.tsx` | Full-screen list fallback |
| Badge count | `hooks/useUnreadNotificationsCount.ts` | Realtime subscription to `notifications` table |

---

## All Notification Types

### Intro / Matchmaker Flow — `lib/introService.ts`

| Event | `data.type` | Recipient | Icon |
|---|---|---|---|
| Single requests intro, picks a matchmaker | `matchmaker_request` | Matchmaker | 👥 blue |
| Matchmaker accepts the intro request | `matchmaker_responded` | Requester (single) | 👥 blue |
| Matchmaker declines the intro request | `matchmaker_responded` | Requester (single) | 👥 blue |
| Matchmaker forwards request to the other person | `intro_request_from_matchmaker` | Requested person | 👥 blue |
| Requested person responds (accept or decline) | `requested_responded` | Matchmaker | 💚 green heart |
| Requested person **accepts** | `match_accepted` | Requester (single) | 💚 green heart |

---

### Suggestion Flow — `lib/suggestionService.ts`

| Event | `data.type` | Recipient | Icon |
|---|---|---|---|
| New suggestion created | `suggestion` | Both suggested profiles | ✨ gold sparkles |
| One person declines a suggestion | `suggestion_rejected` | Suggester + other person | 🟡 amber close |
| A person reverts their decline | `suggestion_reverted` | Suggester + other person | ✨ gold sparkles |
| **Both** people accept the suggestion | `suggestion_both_accepted` | Suggester | 💚 green heart |

---

### Info Request Flow — `lib/infoRequestService.ts`

| Event | `data.type` | Recipient | Icon |
|---|---|---|---|
| User requests a private field | `info_request` | Profile owner | ℹ️ blue info |
| Profile owner approves the request | `info_request_approved` | Requester | ℹ️ blue info |
| Profile owner declines the request | `info_request_declined` | Requester | 🟡 amber close |

---

### Profile Review (Admin) — `lib/adminService.ts`

| Event | `data.type` | Recipient | Icon |
|---|---|---|---|
| Admin approves profile / profile update | `profile_approved` | The single (profile owner) | ✅ green checkmark |
| Admin rejects profile / profile update | `profile_rejected` | The single (profile owner) | 🟡 amber close |

---

### Matchmaker Selection — `lib/profileService.ts`

| Event | `data.type` | Recipient | Icon |
|---|---|---|---|
| Single selects a matchmaker (new profile) | `matchmaker_selected` | Matchmaker | 🎀 gold ribbon |
| Single changes to a new matchmaker (profile update) | `matchmaker_selected` | New matchmaker | 🎀 gold ribbon |

---

### Engagement — `components/EngagementButton.tsx`

| Event | `data.type` | Recipient | Icon |
|---|---|---|---|
| One side proposes engagement | `engagement_proposal` | Partner | 💎 gold diamond |
| Both sides confirm engagement | `engagement_confirmed` | Both partners | 💛 gold heart-circle |
| Both sides confirm engagement | `engagement_confirmed_admin` | All admins | 💛 gold heart-circle |

---

## Deep-Link Navigation (on tap)

| `data.type` | Navigates to |
|---|---|
| `profile_approved`, `profile_rejected` | `/(tabs)/profile` |
| Everything else | `/(tabs)/connect` |

---

## React Query Cache Invalidation (on tap in panel)

| `data.type` | Query key invalidated |
|---|---|
| `suggestion`, `suggestion_rejected`, `suggestion_reverted`, `suggestion_both_accepted` | `['suggestions']` |
| `matchmaker_request`, `matchmaker_responded`, `matchmaker_selected`, `intro_request_from_matchmaker`, `intro_accepted`, `intro_rejected`, `match_accepted`, `requested_responded`, `continuation_choice` | `['intro_requests']` |
| `info_request`, `info_request_approved`, `info_request_declined` | `['info_requests']` |
| `profile_approved`, `profile_rejected` | `['my_profile']` |

---

## Bugs Fixed Before Launch (2026-03-15)

| # | Bug | Fix |
|---|---|---|
| 1 | `suggestion_rejected` / `suggestion_reverted` had no icon config (showed generic bell) and no cache invalidation on tap | Added to `getIconConfig`, `getNavigationTarget`, `handleNotificationPress` in both `NotificationPanel.tsx` and `notifications.tsx` |
| 2 | `matchmaker_selected` / `intro_request_from_matchmaker` had no icon config and no cache invalidation — completely unhandled | Added ribbon / people icons; wired to `['intro_requests']` invalidation |
| 3 | `matchmaker_responded`, `requested_responded`, `match_accepted` missing from `_layout.tsx` switch (cold-start tap hit `default`) | Added all missing types explicitly to the switch |

---

## Adding a New Notification Type — Checklist

1. **Send it** — call `notificationService.sendNotification(userId, title, body, { type: 'your_type', ... })` in the relevant service
2. **Icon** — add a `case 'your_type':` to `getIconConfig()` in both `NotificationPanel.tsx` and `notifications.tsx`
3. **Navigation** — add a `case` to `getNavigationTarget()` in `NotificationPanel.tsx`
4. **Deep-link** — add a `case` to the `switch` in `app/_layout.tsx → NotificationHandler`
5. **Cache** — add the type to the correct `invalidateQueries` branch in `handleNotificationPress` in `NotificationPanel.tsx`
