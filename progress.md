# Reminder++ Project Progress & Roadmap

**Date & Time**: September 22, 2026 · Latest Update  
**Project**: Reminder++ (Reminded) — Phone-Number-Based Shared Reminder App  
**Architecture**: Zero-Knowledge E2EE (Curve25519 + AES-256-GCM), Push-First Sync (FCM HTTP v1 + Expo Push Gateway), Offline-First Local Database Store, Multi-Trigger Local Alarm Scheduler, Bun + Express + MySQL 8.

---

## 1. Executive Summary & Current Status

The application features a complete **Push-First Sync & Local Reminder Engine**. When a task is assigned, the backend immediately dispatches a high-priority FCM / Expo push notification. The receiver's device ingests the payload, saves it to the persistent local database for offline access, renders an in-app slide-in banner (or OS notification), and schedules exact local OS reminder alarms (both at due time and configured pre-reminder offsets).

---

## 2. Completed Milestones

### Firebase Push Notifications & Backend Dispatch Layer
- [x] **Zero-Dependency Google FCM HTTP v1 Dispatcher ([`fcm.service.ts`](file:///Users/shahbazali/Desktop/reminder++/backend/src/services/fcm.service.ts))**:
  - Implemented Google Service Account OAuth2 token generation using native `node:crypto` (`RSA-SHA256`) with 55-minute in-memory caching (zero external SDK bloat).
  - Native dispatch to `https://fcm.googleapis.com/v1/projects/{projectId}/messages:send`.
- [x] **Expo Push Gateway Adapter**:
  - Automatic routing to `https://exp.host/--/api/v2/push/send` when tokens start with `ExponentPushToken[...]` or `ExpoPushToken[...]`.
- [x] **Rich Task Payload Serialization**:
  - Delivers complete task metadata: `taskId`, `title`, `note`, `senderName`, `senderPhone`, `senderInitials`, `assigneeName`, `assigneePhone`, `priority`, `dueAt` (UTC ISO-8601), `dueDateText`, `remindBefore`, `attachmentName`, `audioNoteDuration`.
  - **4KB FCM Limit Safeguard**: Automatically caps notes to 500 characters in push packets to avoid `MESSAGE_TOO_BIG` rejections.
- [x] **Dead Token Auto-Pruning**:
  - Asynchronously purges `UNREGISTERED` and `404 Not Found` tokens from `user_devices` upon FCM dispatch failure.
- [x] **Task Mutation & Status Update Broadcasts**:
  - Broadcasts `task_update` notifications with `newStatus` and `newDueAt` when tasks are edited or completed.

---

### Local Database & Partitioned Storage Engine
- [x] **Storage Engine Partitioning ([`storageService.ts`](file:///Users/shahbazali/Desktop/reminder++/frontend/src/services/storageService.ts))**:
  - Preserves `SecureStore` strictly for small credentials (auth token, E2EE keypairs).
  - Uses structured local database storage for tasks and scheduled alarm mappings to prevent Android Keystore 2048-byte limit crashes.
- [x] **Idempotent Upserting (`upsertLocalTask`)**:
  - Matches on unique `taskId` to protect against duplicate rows and duplicated alarm triggers under at-least-once FCM delivery.
- [x] **7-Day Completed Task Retention Pruning (`pruneExpiredCompletedTasks`)**:
  - Automatically cleans up tasks marked `Completed` or `Cancelled` more than 7 days ago upon app startup (with architectural extensibility for premium retention).
- [x] **Scheduled Reminder Mappings**:
  - Tracks active OS notification IDs mapped to `taskId` (`saveScheduledReminder`, `loadScheduledReminders`, `removeScheduledReminder`).
- [x] **Global Teardown on Logout**:
  - Clears all cached tasks, wipes session data, and purges all scheduled OS alarms on `logout`.

---

### Frontend Notification Engine & Multi-Trigger Scheduler
- [x] **Multi-Trigger Local Reminders ([`notificationService.ts`](file:///Users/shahbazali/Desktop/reminder++/frontend/src/services/notificationService.ts))**:
  - Schedules exact due alarm at `dueAt` timestamp with `AndroidImportance.MAX`, custom sound, and vibration.
  - Schedules pre-reminder notifications for each offset (e.g. 15 min, 5 min before).
- [x] **Timezone Normalization**:
  - Parses UTC ISO-8601 timestamps and computes display text (`formatLocalDueDate`) in the recipient's local device timezone.
- [x] **Past-Due Task Ingestion Guard**:
  - Checks `triggerTime > Date.now()` before scheduling, preventing spurious immediate alarms or crashes when receiving expired tasks after offline periods.
- [x] **Lifecycle Alarm Cancellation**:
  - Automatically cancels OS scheduled notifications when a task is completed, cancelled, or rescheduled.
- [x] **Boot-Time Alarm Reconciliation (`reconcileScheduledReminders`)**:
  - Verifies and restores scheduled alarms for all active upcoming tasks on app initialization.

---

### In-App Toast Banner & Deep-Linking UX
- [x] **Animated Foreground Toast ([`IncomingTaskToast.tsx`](file:///Users/shahbazali/Desktop/reminder++/frontend/src/components/common/IncomingTaskToast.tsx))**:
  - Slide-in top banner displayed when a task is assigned while the user is inside the app.
  - Features sender avatar, task title, due badge, and a direct **"View"** button.
  - Auto-dismisses after 6 seconds with smooth spring animations.
- [x] **Cold-Start Notification Recovery ([`App.tsx`](file:///Users/shahbazali/Desktop/reminder++/frontend/App.tsx))**:
  - `Notifications.getLastNotificationResponseAsync()` recovers the initial push notification when launched from a terminated/killed state.
  - Deep-links straight into `TaskDetailScreen` for the assigned task.

---

### Audio Notes API & In-Task Voice Messaging
- [x] **Backend Media Upload Endpoint**:
  - Configured `multer` to handle `multipart/form-data` uploads securely with 50MB file size limits.
  - Generates cryptographically random UUID filenames to prevent collisions and directory traversal.
  - Automatically mounts static `/uploads` directory on Express server for rapid streaming to frontend clients.
- [x] **Standalone `AudioPlayer` UI Component**:
  - Built a resilient `AudioPlayer.tsx` powered by `expo-av`.
  - Implemented real-time playback synchronization, animated progress waveforms, and smart buffering logic.
  - Design dynamically adapts to theme contexts (e.g., matching the primary accent color or turning white inside sent chat bubbles).
- [x] **Task Detail Embedded Playback & Recording**:
  - Embedded `AudioPlayer` directly inside the Task Meta Card if the task was initially created with an attached voice note.
  - Added a one-tap microphone icon to the chat input bar that seamlessly expands the `VoiceNoteRecorder`.
  - Uploads raw audio buffers via `api.uploadMedia(uri)` and posts them as type `'voice'` directly into the active chat thread.
- [x] **Chat Thread Voice Playback**:
  - Replaced the previous static placeholder in `ChatBubble.tsx` with fully functional, streaming `AudioPlayer` instances for voice messages sent by either party.

---

### 3-Tier Delivery & Reminder Ticks Architecture
- [x] **3-Tier Delivery & Reminder Ticks Model ([`TaskRowCard.tsx`](file:///Users/shahbazali/Desktop/reminder++/frontend/src/components/tasks/TaskRowCard.tsx))**:
  - **1 Tick (`✓`) `sent`**: Task created by assigner and safely recorded in server DB.
  - **2 Ticks (`✓✓`) `delivered`**: Receiver's phone received the FCM/Expo push notification and persisted the task to local DB.
  - **3 Ticks (`✓✓✓`) `notified`**: The reminder alarm popped up on receiver's screen at the scheduled reminder/due time.
  - **Colored 3 Ticks (`✓✓✓` Steel Blue `#3A6EA5`) `opened`**: Receiver opened/viewed the task detail card.
- [x] **Monotonic State Machine & Anti-Regression Guard ([`task.model.ts`](file:///Users/shahbazali/Desktop/reminder++/backend/src/models/task.model.ts) & [`useAppStore.ts`](file:///Users/shahbazali/Desktop/reminder++/frontend/src/store/useAppStore.ts))**:
  - Protected by SQL `CASE` statement on backend and monotonic order comparator on frontend (`sent` (1) ➔ `delivered` (2) ➔ `notified` (3) ➔ `opened` (4)) preventing delayed network ACKs from reverting states.
- [x] **Silent Data-Only Push Dispatch ([`fcm.service.ts`](file:///Users/shahbazali/Desktop/reminder++/backend/src/services/fcm.service.ts))**:
  - Backend dispatches silent data-only push notifications (`task_tick_update`) directly to the assigner's devices upon receiving delivery or alarm ACKs, updating their task card ticks live without audio alerts.
- [x] **Offline ACK Outbox & Auto-Drain Engine ([`storageService.ts`](file:///Users/shahbazali/Desktop/reminder++/frontend/src/services/storageService.ts) & [`notificationService.ts`](file:///Users/shahbazali/Desktop/reminder++/frontend/src/services/notificationService.ts))**:
  - Buffers delivery and notified ACKs in `pendingAcks` local outbox when network is offline.
  - Automatically drains outbox on app boot, network recovery, and app foreground transitions via `AppState.addEventListener('change')`.
- [x] **Catch-Up Alarm Reconciler (`reconcileDueAlarms`)**:
  - Detects if scheduled reminder alarms elapsed while device was asleep or powered down and sends notified ACK to assigner on next wake.

---

## 3. Next Steps

1. **End-to-End Push Testing with Live Firebase Credentials**:
   - Supply `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY` in `backend/.env`.
   - Test cross-device push delivery between two real physical devices.
2. **Audio & Media Offline Sync**:
   - Cache downloaded voice notes and photo attachments in local filesystem on demand.

