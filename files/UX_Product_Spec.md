# Reminder & Task Sharing App — UI/UX & Product Specification

> Purpose of this document: defines product behavior, screen flows, and edge-case handling for the React Native client. This is the source of truth for *how the app should behave*, separate from `Design_System.md`, which defines *how it should look*. A coding agent should treat both as binding unless the user explicitly overrides a point here.

---

## 1. App Concept

A phone-number-based reminder app. One user creates a task with a title, details, optional attachment, and a due date/time, and assigns it to another user by phone number. The receiver gets a notification, can view the task, comment on it (text, voice, image — chat-style, threaded per task), and mark it complete. Both sides see a synced, offline-capable view of the task and its chat thread.

This is **not** a simple personal to-do app — its core value is the social/shared layer (assigning, nudging, discussing a task with another person). All UX decisions should reinforce that shared, conversational nature rather than treat tasks as isolated personal items.

---

## 2. Screens & Core Flows

### Screen 1 — Phone Entry
- Country picker (library-driven), phone number input.
- Selected country sets the user's locale (used later for date/time formatting).
- On submit, trigger OTP send (Firebase Auth phone sign-in).
- Validate phone number format client-side before allowing submit.

### Screen 2 — OTP Verification + Profile Setup
- 6-digit OTP entry, auto-read where platform allows (Android SMS Retriever).
- On verify success:
  - If new user: prompt for name + profile picture (picture optional, show default avatar if skipped).
  - If existing user: skip straight to main app.
- **On first login, check the backend for any tasks pre-attached to this phone number** (created before this user registered — see Section 7) and surface them immediately so the user's first experience isn't an empty list.

### Screen 3 — Task List
Do **not** implement as four parallel tabs (Upcoming / Pending / My Tasks / Completed) — these overlap, since a task can be simultaneously "created by me" and "upcoming." Instead:

- **Top-level segmented control, two segments:**
  - **Assigned to me** (tasks where I'm the receiver)
  - **Created by me** (tasks where I'm the sender)
- **Filter chips inside each segment:** All / Upcoming / Pending / Completed.
- A small icon or label on each row indicates direction (created vs. assigned) if you ever merge into a single unified list later — but for v1, the segmented control above is sufficient.
- **Pending requests banner:** if there are unanswered first-contact requests (see Section 4), show a dismissible banner or badge above the list — not a full tab, since it's usually empty.

**Each list row should show:**
- Assignee/sender profile image
- Task title (bold, 1 line, truncate with ellipsis)
- Date and time (formatted in the viewer's local timezone — see Section 8)
- Details preview (2 lines, smaller/secondary text)
- Priority indicator (color-coded tag, not just text — see Design_System.md)
- **Last comment preview + read-state tick** (same mental model as a WhatsApp chat list): one tick = delivered/synced, two ticks = opened by the other party. This reinforces the chat-thread nature of each task.

### Screen 4 — Task Detail
- Full task details: title, description, attachment (tap to preview), date/time, priority.
- Status controls:
  - If I'm the receiver: "Mark Done" button (triggers two-step completion handshake — see Section 5).
  - If I'm the creator: "Edit" and "Cancel" actions, plus "Confirm" / "Reopen" if the receiver has marked it done-pending-confirmation.
- **Chat thread below the task details**, ordered oldest to newest:
  - Text comments.
  - Voice comments: tap to play/pause, show duration, WhatsApp-style waveform is a nice-to-have but a simple play/pause + duration label is acceptable for v1.
  - Image comments: thumbnail inline, tap opens full-screen viewer with pinch-to-zoom.
  - **System messages** rendered inline in the same thread for any task mutation: time changed, title changed, cancelled, marked done, confirmed, reopened (see Section 6). These should be visually distinct from user messages (e.g., centered, muted style, no avatar) so they read as system events, not chat.
- Chat is stored in local DB first, then synced to server (offline-first — see Section 9 of the backend notes once we get there).
- **Opening this screen from a notification must deep-link directly here**, not to the list screen.
- Opening this screen as the receiver flips the read-state to "opened" — sender's list view updates to double-tick.

### Screen 5 — Create Task
- Pick a contact from the phone's address book (native contact picker).
- While entering task details, call the registration-check API in the background:
  - If the number is confirmed registered, cache that result locally so it isn't re-checked on every keystroke/edit.
  - If **not registered**, do not block task creation — see Section 7 for the invite-share flow.
- Fields: title, details, date/time picker, priority selector, optional image attachment, "remind before" multi-select (15 / 10 / 5 minutes — user can select more than one).
- Create button disabled until required fields (title, assignee, date/time) are valid; show inline validation, not a blocking alert.

---

## 3. Consent & Spam Prevention

This is a first-class product concern, not an afterthought — phone-number-based push access to someone's task list is a real harassment vector if left ungated.

- **First-contact request gate:** the first task from sender A to receiver B does not land directly in B's main list. It arrives as a request: "A wants to send you reminders," with Accept / Decline / Block actions. Once accepted, all future tasks from A go straight through with no further friction.
- **Block:** persistent server-side, keyed on the (sender, receiver) pair. A blocked sender's future tasks should never reach the receiver's device or generate a push — this is enforced server-side, not just hidden client-side.
- **Mute:** softer than block — task still arrives and is visible in the list, but generates no notification.
- Do **not** restrict senders to "must already be in receiver's contacts" — it doesn't solve the harassment case (an unwanted contact often does have the person's number) and adds friction without real protection.
- Surface block/mute as a simple action from both the task detail screen (overflow menu) and from the incoming-request prompt.

---

## 4. Task & Completion Lifecycle

Status is not a simple boolean. Model it as a state machine:

```
upcoming → pending (time passed, not marked done)
upcoming/pending → done_pending_confirmation (receiver marked done)
done_pending_confirmation → completed (creator confirms, OR auto-confirms after 24–48h of no response)
done_pending_confirmation → upcoming/pending (creator reopens — disputes completion)
any active state → cancelled (creator cancels; task is hidden from active lists but not deleted)
```

- Receiver tapping "Mark Done" never instantly closes a task — it requests confirmation from the creator. This avoids one-sided disputes about whether something actually got done.
- A cancelled task is never hard-deleted from the receiver's view — it should still be visible if they look at history, with a clear "cancelled" badge, so it doesn't feel like the task silently vanished.

---

## 5. Editing & Cancelling

- **Never mutate a task silently.** Any edit (time, title, details) or cancellation must drop a system message into that task's chat thread, e.g. "A changed the time to 5:00 PM."
- **Time/date changes must re-trigger a push notification** to the receiver — this is the one edit type that materially affects what the receiver needs to do.
- Title/detail edits can be silent-push (system message in thread, no new notification) since they're lower urgency.
- Only the creator can edit or cancel. The receiver can comment and mark done, not edit core fields.

---

## 6. Invite Flow for Unregistered Numbers

When the registration-check API returns "not registered" for the selected contact:

1. Still allow task creation — attach it to the phone number even though no account exists yet.
2. Immediately trigger the device's native Share sheet with a prefilled message and a deep link to a lightweight web landing page (e.g. `yourapp.com/t/{taskId}`) — something like: "Hey, I sent you a reminder on [AppName], tap to view it: [link]." The sender chooses the channel (SMS, WhatsApp, etc.) via the OS share sheet — the app itself does not send the message or pay for delivery.
3. The web landing page explains what the app does and links to the Play Store / App Store, while preserving the task ID through signup (referrer param, clipboard, or query string depending on what's feasible).
4. When that phone number eventually completes OTP signup, the app checks the backend for any tasks already attached to this number and attaches them to the new account immediately — see Screen 2 behavior above.

---

## 7. Notifications

- Two notifications per task: one at creation/assignment time (immediate), and one at the configured "remind before" offset(s) before the due time, plus one at the due time itself.
- Tapping any notification deep-links straight into Screen 4 for that specific task, not the list screen.
- Notifications should be treated as server-triggered (FCM) rather than relying solely on the OS to wake a backgrounded app at the exact local time — see backend notes for why this matters on Android.
- **Push permission denial handling:** check notification permission status on every app foreground. If denied, show a persistent, dismissible banner at the top of the task list ("Notifications are off — turn them on so you don't miss reminders") with a button that opens the OS notification settings directly. Never let this fail silently.

---

## 8. Timezones

Always store and transmit timestamps in UTC. Render in each user's local device timezone on display. Do not store or transmit a "local time string" — sender and receiver may be in different timezones, and this will silently produce wrong reminder times if not handled correctly from day one.

---

## 9. Attachments & Media

- Images: compress client-side before upload (target roughly 1–2MB max after compression). Tap to open full-screen viewer with pinch-to-zoom.
- Voice notes: cap recording length (e.g. 2 minutes). Play/pause control with visible duration, inline in the chat thread.
- Both should upload in the background and show a clear pending/sent/failed state in the chat thread, consistent with offline-first behavior (message appears immediately locally, then syncs).

---

## 10. Recurring Reminders (Not in v1 — Design For It Now)

V1 ships one-off tasks only, but the data model and screens should not assume every task is single-occurrence:

- Leave room in the Create Task screen's design for a future "repeat" option (e.g. None / Daily / Weekly / Custom) without needing to redesign the screen later.
- See backend notes for the corresponding schema implication (a task can be a "template" that generates instances).

---

## 11. Multi-Device

V1 assumes one active device per user is the common case, but the client should register its push token per-device (not assume a single token replaces all previous ones), so that adding multi-device support later doesn't require a client-side rework — only a backend fan-out change.

---

## 12. Open Decisions Log

Track anything intentionally deferred here so it isn't silently forgotten:

- [ ] Group tasks / multiple assignees per task — not in v1, schema should not block it later.
- [ ] Recurring reminders — not in v1, see Section 10.
- [ ] Read-receipt opt-out (disable the double-tick) — not in v1.
- [ ] Monetization / plan gating — not in v1, no paywalled features yet.
