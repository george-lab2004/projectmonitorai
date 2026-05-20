# Project Monitor AI - Backend Architecture & API Documentation

Welcome to the official technical documentation for the **Project Monitor AI Backend**. This document provides an exhaustive, production-grade map of the backend's directory structure, architectural layers, critical middleware syntax, secure WebSocket real-time triggers, and the complete REST API reference.

---

## 📂 1. Directory Structure

The project is structured following clean, modular design principles that separate models, controllers, routing layers, validations, and utility files.

```text
Backend/
├── config/                  # Global connection configurations
│   ├── db.config.ts         # MongoDB Mongoose database client
│   └── pusher.config.ts     # Pusher Sockets Cloud client
├── controllers/             # Core business logic handlers
│   ├── auth.controller.ts
│   ├── message.controller.ts
│   ├── notification.controller.ts
│   ├── project.controller.ts
│   ├── pusher.controller.ts  # Private channels socket handshakes
│   └── task.controller.ts
├── docs/                    # Architectural and API documentation
│   └── documentation.md     # This file
├── middlewares/             # Request lifecycle hook layers
│   ├── async-handler.middleware.ts
│   ├── auth.middleware.ts   # JWT and role-based guards
│   ├── error.middleware.ts  # Global boundaries and translations
│   ├── rate-limiter.middleware.ts
│   └── validate.middleware.ts
├── models/                  # Database schema mappings (Mongoose)
│   ├── message.model.ts
│   ├── notification.model.ts
│   ├── project.model.ts
│   ├── task.model.ts
│   └── user.model.ts
├── routes/                  # Express Router mounting points
│   ├── auth.route.ts
│   ├── cron.route.ts        # Vercel Cron trigger gateway
│   ├── message.route.ts
│   ├── notification.route.ts
│   ├── project.route.ts
│   ├── pusher.route.ts
│   └── task.route.ts
├── utils/                   # Reusable utility scripts
│   ├── cron.ts              # Background job handlers
│   └── notification.util.ts # Automated db-write + Pusher push helper
├── validators/              # Joi request body schema validators
│   ├── auth.validator.ts
│   ├── project.validator.ts
│   └── task.validator.ts
├── package.json             # Engine and npm dependencies
├── tsconfig.json            # Strict TypeScript configuration parameters
├── vercel.json              # Vercel Serverless Routing & Cron Schedules
└── server.ts                # Application bootstrapper and core pipeline
```

---

## ⚙️ 2. Core Architecture & Boilerplate Syntax

### 2.1 Server Pipeline & Request Parsers (`server.ts`)
*   **`express.json()`**: Standard HTTP POST requests send payloads as raw binary text streams. This middleware intercepts incoming requests, identifies JSON payloads, parses them, and makes them accessible as a clean Javascript object under `req.body`.
*   **`express.urlencoded({ extended: true })`**: Parses incoming URL-encoded form submissions (often sent by standard HTML forms). Setting `extended: true` allows the parser to construct rich nested objects and arrays.
*   **`cookieParser()`**: Intercepts the HTTP `Cookie` header string, decodes it, and populates `req.cookies` as a key-value object. This is essential for secure, automated session checks.
*   **`cors()`**: Configures Cross-Origin Resource Sharing. It validates that requests originating from the client browser are authorized to communicate with our API. Credentials are set to `true` to allow the automated passing of secure cookies.

### 2.2 Reusable Async Handling (`async-handler.middleware.ts`)
Standard Mongoose database operations return Promises and can fail (due to connection timeouts, duplicate keys, etc.). To avoid wrapping every single controller endpoint in duplicate `try/catch` boilerplate, we utilize `asyncHandler`:

```typescript
export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
```
*   **Logic**: It wraps the async controller. If the controller executes successfully, it proceeds as normal. If any line of code crashes, the Promise is rejected and `.catch(next)` is automatically triggered, shifting the error into the global Express error boundary.

### 2.3 Global Error Boundaries (`error.middleware.ts`)
We maintain two key error handlers to ensure the server never hangs, never crashes, and never exposes dirty system logs to clients.

*   **`notFound`**: Runs only if a client requests an API path that does not exist. It intercepts the request, generates a clean 404 Error object, and hands it off to `errorHandler`.
*   **`errorHandler`**:
    *   *Dynamic Status Codes*: Reads `let statusCode = res.statusCode === 200 ? 500 : res.statusCode`. If a crash occurred but the network status code was somehow still marked as `200 Success`, it overrides it to a standard `500 Internal Server Error`.
    *   *Mongoose CastError Conversion*:
        ```typescript
        if (err.name === 'CastError' && err.kind === "ObjectId") {
            message = `Resource not found`;
            statusCode = 404;
        }
        ```
        If a user queries `/api/tasks/invalid-id`, Mongoose throws a `CastError` because the ID is not a valid 24-character hexadecimal representation. The handler catches this database-level error and translates it to a clean 404 JSON response.

### 2.4 Joi Input Validation (`validate.middleware.ts`)
To prevent invalid database writes or missing keys, every critical write endpoint is protected by a Joi validation middleware:
*   It takes a validator schema (e.g. `createTaskValidator`).
*   Runs `schema.validate(req.body, { abortEarly: false })`.
*   If validation fails, it aggregates every validation error (e.g. *“Email is required, Password must be at least 6 characters”*) and throws a `400 Bad Request` before the controller can run, protecting our database from corrupt data.

---

## ⚡ 3. Sockets & Real-Time Notifications Flow

To keep the application highly interactive and collaborative, real-time messaging and events are built using **Pusher Cloud managed sockets**.

### 3.1 Network Communication Loop
Unlike raw self-hosted Socket.io (which keeps long-lived TCP connections directly on your server, making it incompatible with serverless environments like Vercel), Pusher operates using a delegated network flow:

1.  **Frontend Subscriptions**: The client browser establishes a persistent WebSocket connection directly to **Pusher's cloud servers**.
2.  **Server Triggers**: When a backend controller performs an action (e.g., saving a task), it sends a lightning-fast HTTP POST REST request to Pusher's servers using `pusher.trigger(channel, event, payload)`. This request executes in under 50 milliseconds.
3.  **Pusher Broadcast**: Pusher instantly broadcasts the data down the WebSocket channel to the respective client browsers.

### 3.2 Private Channel Security
All chat rooms and notifications are protected by **Private Channels** (`private-user-[userId]`, `private-chat-project-[projectId]`, `private-project-[projectId]`). 

Pusher enforces a secure verification handshake:
*   Before a client can listen to a private channel, Pusher requests permission from our server via `/api/pusher/auth`.
*   Our controller validates the user's logged-in identity against the target channel:
    *   *User Feed*: Confirms `req.user._id` matches the user ID in the channel name.
    *   *Project Feed/Chat*: Queries MongoDB and confirms `req.user._id` is either the Project Manager or a member of the project team.
*   If validated, the backend uses its private `PUSHER_SECRET` to sign an HMAC SHA256 signature key. Pusher's cloud validates this signature and officially opens the real-time websocket stream.

---

## 📋 4. REST API Endpoint Reference

### 4.1 Authentication Endpoints (`/api/auth`)

| Endpoint | Method | Access | Logical Flow | Expected Payload |
| :--- | :--- | :--- | :--- | :--- |
| `/signup` | `POST` | Public | Validates input using `signUpValidator` -> Checks if email exists -> Encrypts password using `bcrypt` -> Creates User in DB (defaults `isVerified` to `false`) -> Generates JWT -> Sets cookie. | `name`, `email`, `password` |
| `/login` | `POST` | Public | Validates input using `signInValidator` -> Finds user -> Verifies password -> Generates JWT -> Saves cookie. | `email`, `password` |
| `/logout` | `POST` | Public | Resets the HTTP session cookie to an empty value and expires it immediately. | None |
| `/me` | `GET` | Authenticated | Decodes JWT -> Retrieves logged-in user profile, excluding the password field. | None |
| `/forgot-password` | `POST` | Public | Validates email -> Generates secure 6-digit OTP and 10-minute expiry -> Persists in User schema -> Sends password reset template via NodeMailer. | `email` |
| `/reset-password` | `POST` | Public | Validates request -> Verifies OTP matches and is not expired -> Hashes new password -> Wipes reset fields -> Saves changes. | `email`, `otp`, `newPassword` |
| `/verify-email` | `POST` | Public | Toggled on email callback. Locates user by email -> Flips `isVerified` flag to `true`. | `email` |

---

### 4.2 Project Endpoints (`/api/projects`)

| Endpoint | Method | Access | Logical Flow | Expected Payload |
| :--- | :--- | :--- | :--- | :--- |
| `/` | `GET` | Manager Only | Restricts global project list lookups to users with System Manager roles. Resolves cross-tenant data visibility issues. | None |
| `/:id` | `GET` | Authenticated | Fetches a specific project by ID. Returns `404` if not found. Access control checks project membership or manager role (BOLA/IDOR prevention). | None |
| `/` | `POST` | Manager Only | Creates a project. Automatically stores the manager's ID. **Automated Notification**: Loops through assigned members and creates dynamic database notifications and Pusher notifications informing them of their project and new group chat assignment. | `title`, `description`, `status`, `deadline`, `color`, `icon`, `members` (optional) |
| `/:id` | `PUT` | Manager Only | Updates project metadata (title, description, status, deadlines, members). Access restricted strictly to the project manager. | `title`, `description`, `status`, `deadline`, `color`, `icon`, `members` (optional) |
| `/:id` | `DELETE` | Manager Only | Deletes the project from MongoDB. | None |

---

### 4.3 Task Endpoints (`/api/tasks`)

| Endpoint | Method | Access | Logical Flow | Expected Payload |
| :--- | :--- | :--- | :--- | :--- |
| `/` | `GET` | Authenticated | Managers see all tasks. Team members see only tasks assigned to their MongoDB User ID. | None |
| `/:id` | `GET` | Authenticated | Fetches a task populated with its assignee, project details, and comments (with comment author avatars). Verifies that the user is the project manager, a project team member, or the task assignee to block BOLA/IDOR brute-force attacks. | None |
| `/` | `POST` | Manager Only | Creates a task. **Automated Notification**: Triggers a notification to the assigned developer: *"You have been assigned task X in Project Y"* | `title`, `description`, `project`, `assignee`, `deadline`, `priority` |
| `/:id` | `PUT` | Manager / Assignee | Updates task fields. Standard authorization ensures only the manager or the assigned developer can edit. | Any task fields |
| `/:id` | `DELETE` | Manager Only | Deletes the task. | None |
| `/:id/status`| `PATCH`| Authenticated | Updates task status. **Real-time triggers**: 1. Broadcasts `task-updated` via Pusher to `private-project-[projectId]` for immediate Kanban board shifts. 2. Notifies the Project Manager if updated by assignee, or notifies assignee if updated by Manager. | `status` |
| `/:id/comments`| `POST`| Authenticated | Adds a comment to the task's array. **Automated Notification**: Identifies task participants and sends real-time notifications to both the Assignee and Project Manager (excluding the comment author). | `body` |
| `/:id/comments/:cid`| `DELETE`| Comment Creator / Manager | Deletes the specified comment by ID. Authorized for comment author or project manager only. | None |

---

### 4.4 Messaging Endpoints (`/api/messages`)

| Endpoint | Method | Access | Logical Flow | Expected Payload |
| :--- | :--- | :--- | :--- | :--- |
| `/:channel`| `GET` | Authenticated | Retrieves last 50 chat messages for a channel/project, sorted newest first (paginated). | None |
| `/` | `POST` | Authenticated | Creates a new chat message. **Real-time triggers**: Calls `pusher.trigger()` to broadcast the message instantly to the project group chat stream: `private-chat-project-[id]`. | `channel`, `body`, `fileUrl` (optional), `fileName` (optional) |
| `/:id` | `DELETE` | Message Creator | Validates that `req.user._id` matches the message sender. Deletes the message. | None |
| `/:channel/read`| `PATCH` | Authenticated | Pushes the logged-in user's ID into the message's `readBy` array using `$addToSet` to avoid duplicates. | None |

---

### 4.5 Notification Endpoints (`/api/notifications`)

| Endpoint | Method | Access | Logical Flow | Expected Payload |
| :--- | :--- | :--- | :--- | :--- |
| `/` | `GET` | Authenticated | Fetches all notifications belonging to the logged-in user, sorted newest first. | None |
| `/:id/read` | `PATCH` | Authenticated | Marks a single notification as read. | None |
| `/read-all`| `PATCH` | Authenticated | Marks all notifications belonging to the logged-in user as read in bulk. | None |
| `/:id` | `DELETE` | Authenticated | Deletes a specific notification belonging to the logged-in user. | None |
| `/` | `DELETE` | Authenticated | Deletes all notifications belonging to the logged-in user. | None |

---

### 🔐 4.6 Pusher Sockets Endpoints (`/api/pusher`)

| Endpoint | Method | Access | Logical Flow | Expected Payload |
| :--- | :--- | :--- | :--- | :--- |
| `/auth` | `POST` | Authenticated | Authenticates and signs private channel subscriptions: 1. `private-user-[id]`: Checks user ownership. 2. `private-chat-project-[id]` / `private-project-[id]`: Confirms project membership. Generates secure HMAC SHA256 signature using `PUSHER_SECRET`. | `socket_id`, `channel_name` |

---

### 🧠 4.7 AI Endpoints (`/api/projects/:id/audit`)

| Endpoint | Method | Access | Logical Flow | Expected Payload |
| :--- | :--- | :--- | :--- | :--- |
| `/:id/audit`| `POST` | Manager Only | Performs a manual project audit. Verifies the user is the project manager, checks daily project quota (max 5 runs), triggers Gemini analysis, updates DB (`healthScore` and `aiSummary`), and dispatches Pusher alerts. | None |

---

### ⏱️ 4.8 Cron Endpoints (`/api/cron`)

| Endpoint | Method | Access | Logical Flow | Expected Payload |
| :--- | :--- | :--- | :--- | :--- |
| `/` | `GET` | Trigger/Cron Only | Triggered by Vercel Scheduler or local call. If production environment, verifies `Authorization: Bearer <CRON_SECRET>` headers before asynchronously invoking project AI reviews. | None |

---

## 🤖 5. Proactive AI Auditor & Event-Driven System

Instead of a passive conversational chatbot, the Project Monitor features a **Proactive AI Agent** designed to run autonomously in the background to detect team bottlenecks and update project metrics.

### 5.1 The Analysis Pipeline
When triggered, the proactive auditor executes the following pipeline:
1. **Quota Guard**: Checks MongoDB project fields (`aiRunsToday` and `lastAiRunAt`). If the calendar day is new, it resets `aiRunsToday` to `0`. If the count is $\ge 5$, it rejects the run (`429 Too Many Requests`).
2. **Context Compilation**: Gathers status counts, overdue tasks (with assigned developer names), team workloads, and approaching deadlines.
3. **Structured Gemini Audit**: Packages these details and posts them to Gemini, requesting a strict JSON analysis payload:
   ```json
   {
     "healthScore": 85,
     "aiSummary": "Project is on-track. However, John is overloaded...",
     "riskAlerts": [...],
     "workloadAlerts": [...]
   }
   ```
4. **Database Write**: Automatically saves the `healthScore` and `aiSummary` into the `Project` document in MongoDB.
5. **Team WebSocket Dispatch**: Dispatches any flagged risk/workload alerts to team members using our database notifications and real-time Pusher broadcasts.

### 5.2 Background Scheduling (Cron Job)
Proactive project analysis runs in the background using a hybrid scheduled runner architecture:
*   **Local Node-Cron Execution**: In development mode (`NODE_ENV=development`), `utils/cron.ts` runs locally every 8 hours (`0 */8 * * *`) on your local Node runtime.
*   **Vercel Serverless Scheduler**: In production mode (`NODE_ENV=production`), Vercel’s built-in cron trigger hits our secure `GET /api/cron` route every 24 hours at midnight UTC (`0 0 * * *`) as allowed under Vercel Hobby limits.
*   **Scope**: Both trigger types pull all active projects and query Gemini for updated progress, workloads, and risks, writing the summaries directly to MongoDB and broadcasting notifications via Pusher.

### 5.3 Development Data Seeder
For testing, demoing, and evaluation, a command-line seeder script is provided in `utils/seeder.ts`:
* **Command**: `npx tsx utils/seeder.ts`
* **Actions**:
  1. Wipes all existing database collections (Users, Projects, Tasks, Notifications, Messages).
  2. Seeds **2 Managers** and **20 Team Members** with dynamic, initials-based SVG avatars and active hashed credentials (password: `password123`).
  3. Seeds **5 distinct projects** with varied health profiles, colors, deadlines, and task counts.
  4. Seeds **realistic task loads** (completed on-time, in-progress, overdue, and overloaded developer allocations).
  5. Automatically triggers a manual AI audit run for all 5 seeded projects, filling out their initial health scores, summaries, and notifications.

