# Architecture, Hosting & Scalability Guidelines

> **Purpose**: This document defines the technical architecture, deployment strategy, and hosting constraints for Reminder++. It serves as a binding reference for backend, frontend, and sync engine design.

---

## 1. Hosting Environment: Hostinger Business Shared Hosting (Node.js)

### Constraints & Target Environment
- **Node.js runtime** managed via LiteSpeed / cPanel (Phusion Passenger reverse proxy).
- **RAM Limit**: ~1.5 GB – 2 GB per account.
- **Entry Processes (EP) Limit**: Max 30 – 50 concurrent active connections.
- **MySQL / MariaDB Connection Limit**: Max 30 – 50 simultaneous connections.
- **Socket / Long-Lived Connection Handling**: Reverse proxy terminates idle persistent TCP connections and will throw `503 Service Unavailable` if EP limits are exhausted.

---

## 2. Core Architectural Decisions

### ❌ What We Avoid
- **No 24/7 Persistent Open WebSockets (e.g. raw socket.io cluster)**: Holding open thousands of idle TCP connections will rapidly exhaust the Hostinger Entry Process limit (capped at 30–50), crashing the server for all users.

### ✅ What We Implement

1. **Push-First Real-Time Sync via Firebase Cloud Messaging (FCM)**:
   - **Cost**: 100% Free with unlimited push notifications from Google Firebase.
   - **Mechanism**: When User A sends a message or creates/mutates a task, Node.js commits the change to MySQL and immediately dispatches a high-priority FCM data & notification payload to User B's device token(s).
   - **Result**: Zero idle connection overhead on the Hostinger server; instant delivery matching WhatsApp/Slack behavior.

2. **Ultra-Fast Stateless REST API**:
   - Endpoints designed for microsecond/millisecond response times (e.g. `POST /api/tasks`, `POST /api/tasks/:id/comments`, `GET /api/sync`).
   - Requests release server process slots within 5–20ms, allowing 30–50 EP slots to serve **150–300 requests/second** and **thousands of Daily Active Users (DAU)** smoothly.

3. **Offline-First Local Storage on Mobile**:
   - SQLite / local cache on the React Native client.
   - UI updates instantly for the user upon sending a comment/creating a task, then syncs to the server in the background with status ticks (single tick = sent, double tick = delivered/opened).

4. **Active Thread Sync (Foreground Polling / SSE Fallback)**:
   - When a user is actively viewing a specific task chat thread on screen, lightweight polling (every 3–5 seconds) or Server-Sent Events (SSE) runs *only while that screen is mounted*, stopping immediately on unmount.

---

## 3. Database & Connection Management
- Use connection pooling in Node.js (e.g. `mysql2` with `connectionLimit: 10 - 15` max).
- Proper indexing on all lookup keys (`phone_number`, `task_id`, `created_by`, `assigned_to`, `status`, `created_at`).
- Keep queries lightweight, parameterized, and avoid N+1 query patterns.

---

## 4. Media Storage (Attachments & Voice Notes)
- Voice notes capped at ~2 minutes.
- Images compressed client-side before upload (target max 1–2MB).
- Upload endpoints write to a public/media directory or Cloudflare R2 / S3-compatible storage if local disk quota is approached.
