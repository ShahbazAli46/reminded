# Visual Design System

> Purpose of this document: defines the visual language — color, type, spacing, and component styling — for the React Native client. Pair with `UX_Product_Spec.md`, which defines behavior. A coding agent implementing screens should derive all visual decisions from the tokens below rather than improvising new colors or spacing values per screen.

---

## 1. Design Intent

This is a **utility app used many times a day, often glanced at quickly** (checking a task list, reading a notification, replying to a comment). The design should prioritize fast scanning and clear status communication over decoration. Think "calm productivity tool," not "marketing landing page" — restrained color use, generous whitespace, and status communicated through color/iconography rather than text alone, since the core list screen is scanned, not read.

The one place this app earns a bit of personality is the chat thread inside a task — it's the most human-feeling part of the app (voice notes, photos, back-and-forth comments), so it can feel slightly warmer there than the otherwise utilitarian list/dashboard areas.

---

## 2. Color Tokens

Define these as a single source of truth (e.g. a `theme.js` / `colors.ts` file) — never hardcode hex values in components.

| Token | Hex | Usage |
|---|---|---|
| `color.primary` | `#3A6EA5` | Primary actions, active tab/segment, links |
| `color.primaryDark` | `#274A73` | Pressed states, headers |
| `color.background` | `#F7F8FA` | Screen background |
| `color.surface` | `#FFFFFF` | Cards, list rows, sheets |
| `color.textPrimary` | `#1C1F26` | Titles, primary text |
| `color.textSecondary` | `#6B7280` | Details preview, timestamps, captions |
| `color.border` | `#E3E6EA` | Hairlines, dividers, input borders |
| `color.success` | `#2E9E6B` | Completed status, confirm actions |
| `color.warning` | `#E0A93D` | Pending/overdue status |
| `color.danger` | `#D14B4B` | Cancel, block, destructive actions |
| `color.priorityHigh` | `#D14B4B` | High priority tag |
| `color.priorityMedium` | `#E0A93D` | Medium priority tag |
| `color.priorityLow` | `#3A9E6B` | Low priority tag |
| `color.unread` | `#3A6EA5` | Unread/new indicator dot |

Status and priority should **always** be communicated through one of these tokens, never through default OS colors or inline one-off hex values — this keeps every screen visually consistent without needing a designer to review every PR.

---

## 3. Typography

Use two type roles, not more — this app doesn't need a decorative display face:

- **Primary face:** the platform system font (San Francisco on iOS, Roboto on Android) for everything. Trying to bundle a custom font for a v1 utility app adds load-time and bundle-size cost without much payoff here.
- **Type scale:**

| Token | Size | Weight | Usage |
|---|---|---|---|
| `type.title` | 18px | 600 (semibold) | Task title in list row, screen headers |
| `type.body` | 15px | 400 (regular) | Task details, chat messages |
| `type.caption` | 13px | 400 (regular) | Timestamps, secondary metadata |
| `type.label` | 12px | 600 (semibold), uppercase, letter-spacing 0.5 | Priority tags, status badges |
| `type.button` | 16px | 600 (semibold) | Primary button text |

Keep line-height generous on `type.body` (around 1.4×) since chat threads and task details are read in short bursts, often one-handed.

---

## 4. Spacing & Layout

Use a consistent 4px base unit. Don't introduce arbitrary spacing values (e.g. 13px, 22px) — always a multiple of 4.

| Token | Value | Usage |
|---|---|---|
| `space.xs` | 4px | Icon-to-text gaps |
| `space.sm` | 8px | Internal card padding (compact) |
| `space.md` | 16px | Standard screen margin, card padding |
| `space.lg` | 24px | Section spacing |
| `space.xl` | 32px | Empty-state vertical spacing |

- Screen horizontal margin: `space.md` (16px) on both sides, consistently across all screens.
- List rows: full-width cards on `color.surface`, separated by `space.sm` vertical gap (not hairline dividers) — gives a slightly softer, less dense feel appropriate for a personal task list.
- Border radius: 12px on cards and buttons, 8px on small tags/chips, full-round on avatars. Keep this consistent — don't mix radius values across components.

---

## 5. Key Components

### Task List Row
- `color.surface` card, 12px radius, `space.md` internal padding.
- Avatar (32px circle) top-left.
- Title (`type.title`) truncated to 1 line.
- Details preview (`type.body`, `color.textSecondary`) truncated to 2 lines.
- Date/time + priority tag aligned on the same row, right-aligned or below title depending on available width.
- Read-state tick icon (single/double, `color.textSecondary` / `color.primary`) bottom-right of the card, echoing the WhatsApp pattern referenced in the product spec.

### Priority Tag
- Small pill, `type.label` text, background = priority color at ~15% opacity, text = full-strength priority color. Never rely on color alone — always pair with the text label (High / Medium / Low) for accessibility.

### Status Badge
- Same pill style as priority tags, but using `color.success` / `color.warning` / `color.textSecondary` (for cancelled) — keep these visually distinct enough from priority tags that the two aren't confused (e.g. priority tags top-right of the card, status badge inline with the title).

### Chat Bubble (Task Detail)
- Sender's own messages: right-aligned, `color.primary` at low opacity background, `color.textPrimary` text.
- Other party's messages: left-aligned, `color.surface` background, subtle `color.border` outline.
- System messages (edits, cancellations, completions): centered, `type.caption`, `color.textSecondary`, no bubble background — should read clearly as "not a message from a person."
- Voice note bubble: play/pause icon button + duration label + optional waveform, same bubble shell as text.
- Image bubble: rounded image thumbnail (max height ~200px, preserve aspect ratio), tap to open full-screen pinch-zoom viewer.

### Buttons
- Primary: solid `color.primary` background, white text, 12px radius, full-width on forms (e.g. "Create Task"), inline-width elsewhere.
- Destructive: solid `color.danger` background, white text — reserved for Cancel/Block/Delete only, never used for routine actions, so its color always signals "this undoes something."
- Secondary/ghost: `color.border` outline, `color.textPrimary` text, transparent background — used for "Decline," "Reopen," etc.

### Banners (Notification permission, Pending requests)
- Full-width, `space.md` padding, soft background tint of the relevant token (`color.warning` at low opacity for permission nudges, `color.primary` at low opacity for pending requests), dismissible with a small close icon unless the underlying issue is unresolved (e.g. don't let the user permanently dismiss the notification-permission banner if notifications are still off — re-show it on next relevant app open).

### Empty States
- Centered icon + short message + single action button where relevant (e.g. empty "Created by me" tab: icon, "No tasks yet," "Create a task" button). Treat empty states as an invitation to act, not just a placeholder message.

---

## 6. Iconography

Use a single consistent icon set across the app (e.g. Feather, Phosphor, or similar outline-style set) — never mix icon families. Outline style (not filled) fits the calm/utility tone better than heavier filled icons; reserve filled icons only for active/selected states (e.g. an active tab icon can switch to filled to show selection).

---

## 7. Motion

Keep animation minimal and functional, not decorative:

- Screen transitions: standard platform-native push/pop (don't override with custom transitions).
- New chat message appearing: a quick fade/slide-in (150–200ms), not a bounce or elaborate entrance.
- Status changes (e.g. marking done): a brief checkmark animation is fine as the one moment of "delight" in the app, but keep it short and skip-able — this app is used too often, too quickly, for animation to get in the way of speed.
- Respect OS-level "reduce motion" accessibility settings — disable non-essential transitions when that setting is on.

---

## 8. Accessibility Notes

- Never use color as the only signal for status or priority — always pair with text or icon.
- Maintain minimum 4.5:1 contrast ratio for body text against its background (verify `color.textSecondary` on `color.background` specifically, as gray-on-light-gray combinations are the easiest contrast mistake to make).
- Tap targets minimum 44×44pt, especially on list row actions and chat bubble controls (play/pause, image tap).
- Support dynamic font scaling (respect the OS text-size setting) rather than hardcoding pixel sizes that ignore accessibility scaling preferences.
