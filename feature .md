# Bama Backend — Feature Specification

## 1. Project Overview

Bama is an offline-first English ↔ Khamuri language application built for communication in Bama.

The mobile app should work without requiring users to register or log in. The backend is responsible for:

- Managing official Khamuri language content
- Synchronizing content to mobile devices
- Receiving user suggestions
- Receiving pronunciation/voice recordings
- Reviewing and approving community contributions
- Managing content versions
- Tracking anonymous app installations
- Providing lightweight analytics
- Supporting administration and moderation

### Backend Stack

- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT for admin authentication
- Cloud/object storage for audio files
- REST API
- Optional background jobs later

---

# 2. Core Architecture

```text
Mobile App
   |
   | REST API
   v
Express API
   |
   +-------------------+
   |                   |
MongoDB           File/Object Storage
   |                   |
   |              Audio recordings
   |
   +-- Words
   +-- Phrases
   +-- Categories
   +-- Content Versions
   +-- Installations
   +-- Contributions
   +-- Admins
   +-- Sync Logs
```

The application is **offline-first**.

The mobile app keeps a local copy of approved language content.

The server is the source of truth for official content.

---

# 3. Authentication Strategy

## 3.1 Mobile Users

Mobile users DO NOT need to create an account.

On first installation, the app generates an anonymous `installationId`.

Example:

```json
{
  "installationId": "01JXYZ..."
}
```

The installation ID is sent to the backend during synchronization.

Do not use the installation ID as a password or security credential.

### Installation information

Store:

- installationId
- appVersion
- platform
- device language
- contentVersion
- firstSeenAt
- lastSeenAt
- lastSyncAt

Avoid collecting unnecessary personal/device information.

---

# 4. Admin Authentication

Administrators MUST authenticate.

Use JWT access tokens.

Admin roles:

```text
SUPER_ADMIN
ADMIN
MODERATOR
EDITOR
```

Permissions should be role-based.

### Admin capabilities

- Login
- Manage words
- Manage phrases
- Manage categories
- Review suggestions
- Approve/reject contributions
- Manage audio
- Publish content
- View installations
- View analytics
- Manage admins (SUPER_ADMIN only)

---

# 5. Language Content

## 5.1 Word

A word should contain:

```json
{
  "english": "Water",
  "khamuri": "...",
  "description": "...",
  "categoryId": "...",
  "exampleSentence": {
    "english": "...",
    "khamuri": "..."
  },
  "audio": {
    "url": "...",
    "storageKey": "...",
    "duration": 2.4
  },
  "status": "PUBLISHED",
  "version": 12,
  "createdAt": "...",
  "updatedAt": "..."
}
```

Possible statuses:

```text
DRAFT
PUBLISHED
ARCHIVED
```

---

# 6. Phrases

Support phrases in addition to individual words.

Example:

```json
{
  "english": "How are you?",
  "khamuri": "...",
  "categoryId": "...",
  "audio": {
    "url": "...",
    "storageKey": "..."
  },
  "status": "PUBLISHED",
  "version": 15
}
```

This allows the application to grow beyond a dictionary into a practical communication tool.

---

# 7. Categories

Examples:

```text
Greetings
Food
School
Market
Family
Transportation
Health
Numbers
Religion
Emergency
Common Expressions
Classroom
Daily Conversation
```

Category fields:

```json
{
  "name": "Greetings",
  "slug": "greetings",
  "description": "...",
  "icon": "...",
  "status": "ACTIVE"
}
```

---

# 8. Content Versioning

This is one of the most important backend features.

The mobile app stores its current content version.

Example:

```text
Mobile:
contentVersion = 25

Server:
contentVersion = 29
```

The mobile app calls:

```http
GET /api/v1/sync?version=25
```

The backend returns only changes after version 25.

Example:

```json
{
  "latestVersion": 29,
  "hasUpdates": true,
  "changes": [
    {
      "type": "CREATE",
      "entity": "word",
      "data": {}
    },
    {
      "type": "UPDATE",
      "entity": "word",
      "data": {}
    },
    {
      "type": "DELETE",
      "entity": "word",
      "id": "..."
    }
  ]
}
```

This avoids downloading the entire language database every time.

---

# 9. Content Releases

For larger updates, support release snapshots.

Example:

```text
Release 1
100 words
25 phrases

Release 2
+35 words
+12 phrases
+18 audio files

Release 3
+50 words
+20 phrases
```

A release should contain:

```json
{
  "version": 3,
  "name": "Khamuri Language Pack v3",
  "description": "Added school and market vocabulary",
  "status": "PUBLISHED",
  "publishedAt": "..."
}
```

---

# 10. Synchronization

## Endpoint

```http
GET /api/v1/sync
```

Query:

```text
?version=25
```

Response:

```json
{
  "success": true,
  "serverVersion": 29,
  "clientVersion": 25,
  "requiresFullSync": false,
  "changes": []
}
```

### Full Sync

If the local version is too old or incompatible:

```json
{
  "requiresFullSync": true,
  "downloadUrl": "..."
}
```

The app then downloads the latest language package.

---

# 11. User Contributions

Users should be able to suggest content.

Types:

```text
WORD
PHRASE
TRANSLATION
CORRECTION
AUDIO
```

Contribution example:

```json
{
  "type": "WORD",
  "english": "Water",
  "khamuri": "...",
  "notes": "...",
  "installationId": "...",
  "status": "PENDING"
}
```

Statuses:

```text
PENDING
UNDER_REVIEW
APPROVED
REJECTED
```

---

# 12. Voice/Audio Contributions

Users can record pronunciation for a word or phrase.

Flow:

```text
User selects word
       ↓
Record Khamuri pronunciation
       ↓
Upload audio
       ↓
Contribution created
       ↓
Admin reviews
       ↓
APPROVED
       ↓
Audio becomes official
       ↓
Included in next sync
```

Never automatically publish community audio.

---

# 13. Audio Storage

Do NOT store large audio binaries directly inside MongoDB.

Use object/file storage.

MongoDB stores metadata:

```json
{
  "storageKey": "khamuri/words/word-123.mp3",
  "url": "...",
  "mimeType": "audio/mpeg",
  "size": 182340,
  "duration": 2.3
}
```

Recommended audio format:

```text
MP3
or
AAC/M4A
```

Keep files compressed because the application is designed for environments where mobile data may be limited.

---

# 14. Contribution Review

Admin review screen should show:

```text
English:
Water

Submitted Khamuri:
...

Existing translation:
...

Submitted pronunciation:
▶ Play

Submitted by:
Anonymous installation

Actions:

[Approve]
[Reject]
[Request Correction]
```

When approved:

```text
Contribution
      ↓
Create/update official content
      ↓
Create content version
      ↓
Publish
      ↓
Available in next sync
```

---

# 15. Suggestions and Corrections

Users should be able to report incorrect content.

Example:

```json
{
  "type": "CORRECTION",
  "contentId": "...",
  "suggestedEnglish": "...",
  "suggestedKhamuri": "...",
  "reason": "...",
  "installationId": "...",
  "status": "PENDING"
}
```

This allows native speakers to continuously improve the dataset.

---

# 16. Search API

The backend should support search for online users.

```http
GET /api/v1/content/search?q=water
```

Filters:

```text
q
type
category
page
limit
```

Example:

```http
GET /api/v1/content/search?q=water&type=word
```

However, the mobile app should primarily search its local database while offline.

---

# 17. Content APIs

## Public

```text
GET    /api/v1/content
GET    /api/v1/content/:id
GET    /api/v1/content/search
GET    /api/v1/categories
GET    /api/v1/categories/:id/content
GET    /api/v1/sync
```

## Contributions

```text
POST   /api/v1/contributions
POST   /api/v1/contributions/:id/audio
GET    /api/v1/contributions/:id
```

Mobile contribution endpoints should apply strong rate limits.

---

# 18. Admin APIs

```text
POST   /api/v1/admin/auth/login
POST   /api/v1/admin/auth/refresh
POST   /api/v1/admin/auth/logout

GET    /api/v1/admin/dashboard

GET    /api/v1/admin/words
POST   /api/v1/admin/words
GET    /api/v1/admin/words/:id
PATCH  /api/v1/admin/words/:id
DELETE /api/v1/admin/words/:id

GET    /api/v1/admin/phrases
POST   /api/v1/admin/phrases
PATCH  /api/v1/admin/phrases/:id

GET    /api/v1/admin/contributions
GET    /api/v1/admin/contributions/:id
PATCH  /api/v1/admin/contributions/:id/approve
PATCH  /api/v1/admin/contributions/:id/reject

GET    /api/v1/admin/categories
POST   /api/v1/admin/categories
PATCH  /api/v1/admin/categories/:id

GET    /api/v1/admin/installations
GET    /api/v1/admin/sync-logs

GET    /api/v1/admin/releases
POST   /api/v1/admin/releases
POST   /api/v1/admin/releases/:id/publish
```

---

# 19. MongoDB Collections

Initial collections:

```text
admins
installations
words
phrases
categories
audio
contributions
contentChanges
contentReleases
syncLogs
```

Later:

```text
reports
notifications
auditLogs
feedback
appVersions
```

---

# 20. Installation Tracking

Endpoint:

```http
POST /api/v1/installations/register
```

Payload:

```json
{
  "installationId": "...",
  "appVersion": "1.0.0",
  "platform": "android",
  "contentVersion": 20
}
```

Update `lastSeenAt` whenever synchronization occurs.

Do not treat this as a login account.

---

# 21. Sync Algorithm

Basic:

```text
1. Mobile starts
2. Check internet
3. If offline → use local database
4. If online → register/update installation
5. Send local contentVersion
6. Server compares versions
7. Server returns changes
8. Mobile applies changes transactionally
9. Mobile updates local contentVersion
10. App continues normally
```

Important:

The local database must not be left in a partially updated state if synchronization fails.

---

# 22. Sync Safety

Every sync response should have a predictable structure.

Example:

```json
{
  "success": true,
  "data": {
    "serverVersion": 30,
    "clientVersion": 27,
    "requiresFullSync": false,
    "changes": []
  }
}
```

If sync fails:

```json
{
  "success": false,
  "error": {
    "code": "SYNC_FAILED",
    "message": "Unable to synchronize content"
  }
}
```

The mobile app should continue using its existing local content.

---

# 23. Rate Limiting

Apply rate limits to public endpoints.

More restrictive:

```text
POST /contributions
POST /contributions/:id/audio
POST /installations/register
```

Less restrictive:

```text
GET /content
GET /categories
GET /sync
```

Admin endpoints should have separate rate limits.

---

# 24. Validation

Use request validation.

Recommended:

```text
Zod
Joi
express-validator
```

Reject:

- Missing English text
- Missing Khamuri translation
- Invalid IDs
- Oversized audio files
- Unsupported audio formats
- Excessively long text
- Malformed requests

---

# 25. Security

Implement:

```text
Helmet
CORS
Rate limiting
Input validation
JWT
Password hashing
Request size limits
File upload validation
MongoDB query sanitization
Audit logging
```

Admin passwords must never be stored as plain text.

Use:

```text
bcrypt
or
argon2
```

---

# 26. API Response Standard

Use one response structure throughout the API.

Success:

```json
{
  "success": true,
  "data": {}
}
```

Error:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request",
    "details": []
  }
}
```

---

# 27. Error Handling

Create centralized Express error handling.

Handle:

```text
ValidationError
CastError
DuplicateKeyError
AuthenticationError
AuthorizationError
NotFoundError
FileUploadError
RateLimitError
DatabaseError
```

Never expose raw MongoDB errors to users.

---

# 28. Logging

Use structured logging.

Track:

```text
HTTP requests
Errors
Authentication events
Admin actions
Sync events
Contribution events
File upload events
```

Recommended:

```text
Pino
```

Do not log passwords, JWTs, or sensitive user information.

---

# 29. Analytics

Keep analytics lightweight.

Track:

```text
Total installations
Active installations
Total words
Total phrases
Total approved contributions
Pending contributions
Rejected contributions
Most searched words
Most played audio
Sync success/failure
App versions
```

Analytics should be privacy-conscious and based primarily on anonymous installation IDs.

---

# 30. Admin Dashboard Statistics

Example:

```text
HausaBridge Dashboard

Installations       1,240
Active this week      430

Words                 1,820
Phrases                 340
Audio recordings        890

Pending reviews          42
Approved today           18
Rejected today            5

Content version          37
```

---

# 31. Feedback

Allow users to submit general feedback.

```http
POST /api/v1/feedback
```

Example:

```json
{
  "message": "The school vocabulary is very useful.",
  "rating": 5,
  "installationId": "..."
}
```

Optional categories:

```text
BUG
CONTENT
AUDIO
TRANSLATION
FEATURE_REQUEST
GENERAL
```

---

# 32. Reporting Incorrect Content

Provide:

```http
POST /api/v1/content/:id/report
```

Example reasons:

```text
WRONG_TRANSLATION
WRONG_PRONUNCIATION
WRONG_SPELLING
DUPLICATE
OTHER
```

Reports enter the moderation queue.

---

# 33. Recommended Project Structure

```text
src/
│
├── config/
│   ├── database.js
│   ├── env.js
│   └── storage.js
│
├── controllers/
│   ├── content.controller.js
│   ├── contribution.controller.js
│   ├── sync.controller.js
│   ├── installation.controller.js
│   ├── feedback.controller.js
│   └── admin/
│
├── models/
│   ├── Admin.js
│   ├── Word.js
│   ├── Phrase.js
│   ├── Category.js
│   ├── Audio.js
│   ├── Contribution.js
│   ├── Installation.js
│   ├── ContentChange.js
│   ├── ContentRelease.js
│   └── SyncLog.js
│
├── routes/
│   ├── content.routes.js
│   ├── contribution.routes.js
│   ├── sync.routes.js
│   ├── installation.routes.js
│   ├── feedback.routes.js
│   └── admin.routes.js
│
├── middleware/
│   ├── auth.js
│   ├── adminAuth.js
│   ├── errorHandler.js
│   ├── rateLimiter.js
│   ├── validate.js
│   └── upload.js
│
├── services/
│   ├── sync.service.js
│   ├── content.service.js
│   ├── contribution.service.js
│   ├── audio.service.js
│   ├── release.service.js
│   └── analytics.service.js
│
├── validators/
│
├── utils/
│
├── jobs/
│
├── app.js
└── server.js
```

---

# 34. Development Phases

## Phase 1 — Basic MVP

Build first:

- Express setup
- MongoDB connection
- Word model
- Phrase model
- Category model
- Public content APIs
- Admin login
- Admin CRUD
- Basic installation registration
- Basic sync endpoint
- Validation
- Error handling

Goal:

```text
Admin adds Khamuri content
        ↓
Mobile synchronizes
        ↓
User uses content offline
```

---

## Phase 2 — Community Content

Add:

- Contributions
- Suggestions
- Corrections
- Audio uploads
- Admin moderation
- Approve/reject workflow

Goal:

```text
User → Suggest → Review → Approve → Publish → Sync
```

---

## Phase 3 — Advanced Offline Sync

Add:

- Content versions
- Incremental changes
- Full sync fallback
- Release management
- Sync logs
- Transaction-safe sync
- Content checksums/hashes

---

## Phase 4 — Analytics & Administration

Add:

- Dashboard
- Search analytics
- Audio analytics
- Installation analytics
- App version tracking
- Audit logs
- Feedback management

---

# 35. Important Product Rule

The backend must NEVER become a requirement for basic app usage.

If the server is unavailable:

```text
Internet unavailable
       ↓
No API
       ↓
No problem
       ↓
Use local Khamuri database
       ↓
Play downloaded audio
       ↓
Search normally
```

The backend enhances the application; it should not make the offline application unusable.

---

# 36. Future Features

Potential future additions:

- English → Khamuri translation
- Khamuri → English translation
- Text-to-speech if reliable Khamuri support becomes available
- Voice recognition
- Conversation mode
- Classroom mode
- Learning exercises
- Flashcards
- User accounts
- Contributor profiles
- Native-speaker verification
- Multiple local languages
- Push notifications for new language packs
- Downloadable regional language packs

---

# 37. MVP Success Criteria

The first backend is successful when this complete flow works:

```text
Admin Login
     ↓
Create Khamuri word
     ↓
Publish word
     ↓
Content version increases
     ↓
Mobile connects
     ↓
Mobile sends current version
     ↓
Server returns new content
     ↓
Mobile stores content locally
     ↓
Internet disappears
     ↓
User searches word
     ↓
User plays pronunciation
     ↓
Everything still works
```

Then:

```text
User suggests word
       ↓
User records pronunciation
       ↓
Backend stores contribution
       ↓
Admin reviews
       ↓
Admin approves
       ↓
Content becomes official
       ↓
Content version increases
       ↓
All connected devices receive update
       ↓
New content works offline
```

This is the core backend architecture for HausaBridge.
