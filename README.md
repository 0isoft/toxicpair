# Agile Hostile - toxic pair programming simulator


---

##  Concept
Welcome to the world's most accurate corporate simulator: you're a developer forced into pair-programming with unhinged AI personalities who gaslight, procrastinate, and occasionally produce working code by accident.

Instead of solving problems directly, you get **tickets**.  The editor is **locked**. You talk to a rotating cast of **AI coworkers**; each with their own egos and failure modes. Your job is to manipulate them into solving problems before your timer runs out.

---

##  Technical Architecture

### Stack Overview

| Layer | Technologies |
|-------|-------------|
| **Frontend** | Vite + React + TypeScript |
| **Backend** | Express + Prisma + PostgreSQL |
| **Auth** | Firebase JWT |
| **Infrastructure** | Nginx + systemd + AWS Lightsail |

**Request Flow:**
```
Nginx → Express → Prisma → PostgreSQL
```

**Key Features**
- Stateless REST API with Firebase JWT authentication  
- Resource-based routes: `/problems`, `/attempts`, `/sessions`, `/personas`
- Worker-based sandbox for code execution (per-language subprocesses)
- Persona-based AI simulation engine
- Timed sessions with dynamic "switcheroos"

---

## Core Components
### System architecture
```mermaid
flowchart LR
  subgraph Client["Client (React + TypeScript)"]
    UI[App UI<br/>Vite build]
    AuthSDK[Firebase Web SDK]
  end

  subgraph Edge["Edge & Host"]
    Nginx[Nginx Reverse Proxy<br/>TLS termination<br/>Static cache]
    Systemd[systemd Units<br/>app-backend.service<br/>app-worker.service<br/>Hardening + cgroups]
  end

  subgraph Backend["Backend (Node.js / Express)"]
    API[Express API<br/>REST endpoints]
    Prisma[Prisma ORM]
    Policy[Policy & Persona Engine<br/>Code gating & Escalation]
    Queue[Job Queue<br/>in-process]
  end

  subgraph Grader["Worker & Sandbox"]
    Worker[Worker Pool<br/>concurrent processors]
    JSVM[JS Runner<br/>Node vm.Script<br/>timeout=1s]
    PyProc[Python Runner<br/>child_process.spawn]
    CPPRunner[C++ Runner WIP<br/>g++ compile]
    CGroups[systemd cgroups<br/>350MB RAM / 150% CPU / 512 tasks]
  end

  subgraph Data["Data Stores"]
    PG[(PostgreSQL)]
    Secrets[backend.env]
  end

  subgraph ThirdParty["Third-Party"]
    Firebase[Firebase Admin<br/>JWT verify<br/>OAuth link]
    OpenAI[OpenAI API<br/>chat.completions]
  end

  Client -->|HTTPS| Nginx
  Nginx --> API
  API --> Prisma
  Prisma --> PG
  API -->|JWT verify| Firebase
  API --> Policy
  Policy --> OpenAI
  API --> Queue
  Queue --> Worker
  Worker --> JSVM
  Worker --> PyProc
  Worker --> CPPRunner
  Worker -.-> CGroups
  Worker -->|results| API
  API --> PG
  API -.-> Secrets
  Worker -.-> Secrets
  UI <-->|polling/SSE| API

```

### Request Sequence: AI persona gating
```mermaid
sequenceDiagram
  autonumber
  participant FE as Frontend
  participant N as Nginx
  participant API as Express /api/ai/solve
  participant Auth as Firebase Admin
  participant DB as Prisma + PostgreSQL
  participant Pol as Persona Engine
  participant OAI as OpenAI API

  FE->>N: POST /api/ai/solve<br/>{problemId, language, prompt}
  N->>API: proxy request
  API->>Auth: verifyIdToken(accessToken)
  Auth-->>API: user {id, email}

  API->>DB: fetch Problem by id
  API->>DB: resolve/create Session
  API->>DB: persist user message
  API->>DB: load chat history

  API->>Pol: decide CodeMode<br/>(none | partial | full)
  Pol-->>API: CodeMode + temp adjustment

  API->>OAI: Compose request:<br/>System + Persona + Context
  OAI-->>API: {code?, message}

  API->>API: Sanitation pipeline:<br/>sanitize + degrade if partial
  API->>DB: save assistant message
  API-->>N: 200 {codeMode, code, message}
  N-->>FE: JSON response
```
#### Persona Escalation Logic
The system dynamically adjusts code availability based on conversation context:

| Input | Description |
|-------|-------------|
| **Assistant turns** | Number of AI replies so far |
| **User pressure** | Count of "write code / implement" prompts |
| **Persona policy** | Config thresholds for unlocking code |
| **Defense score** | (Optional) User's algorithm justification |

Simplified pseudocode:
```
if (writeCodeByDefault) mode = "full"
else if (turns < partialAfterTurns) mode = "none"
else if (pressure >= partialAfterPressure) mode = "partial"
else if (turns >= fullAfterTurns && pressure >= fullAfterPressure) mode = "full"
```

Prompt Composition Pipeline:
```mermaid
flowchart TB
  subgraph Compose["Prompt Composition"]
    Sys[Authoritative System Block<br/>STRICT JSON contract<br/>CODE_MODE setting]
    Persona[Persona System Prompt<br/>tone, quirks, quips]
    Context[Problem Context + Examples]
    History[Prior Messages last 50]
    UserMsg[User Prompt]
    Overrides[Overrides: force code empty if needed]
  end

  Compose --> OAI[OpenAI Chat API]
  OAI --> Post[Post-Response Sanitation]
  Post --> Sanitize[sanitizeCode / sanitizeMessage]
  Post --> Degrade[degradeCode if mode=partial]
  Post --> Enforce[enforce code empty if mode=none]
  Post --> StrictJSON[Strict JSON parse]
  StrictJSON --> Persist[Persist assistant message + code]
```

## Sandboxed code execution
```mermaid
sequenceDiagram
  autonumber
  participant FE as Frontend
  participant API as Express /api/attempts
  participant Auth as Firebase Admin
  participant DB as Prisma + PostgreSQL
  participant Q as Job Queue
  participant W as Worker Pool
  participant JS as JS VM
  participant PY as Python Proc
  participant CPP as C++ (WIP)
  participant CG as systemd cgroups

  FE->>API: POST /api/attempts<br/>{problemId, code, language}
  API->>Auth: verify access token
  Auth-->>API: ok / 401
  API->>DB: read problem metadata
  API->>DB: validate session + deadline
  API-->>FE: 201 Attempt created
  API->>Q: enqueueAttempt

  Q->>W: dispatch job
  W->>CG: apply cgroup limits
  
  alt language == javascript
    W->>JS: load code in vm.Script
  else language == python
    W->>PY: spawn python3 subprocess
  else language == cpp
    W->>CPP: compile with g++
  end

  W->>DB: update attempt status + logs
  FE->>API: GET /api/attempts/id (polling)
  API-->>FE: attempt status + logs
```
### Worker-based Isolated Runners

- Node.js VM for JavaScript (timeout: 1s)
- Python via child_process.spawn 
- C++ (WIP) compilation via g++

#### System Limits (cgroups):
- RAM: 350MB
- CPU: 150%
- PIDs: 512 max

**System limits (cgroups):**

Hosted on AWS Lightsail, managed with systemd services:

Service	Role
app-backend.service	API server
app-worker.service	Code grader queue

Hardening:
NoNewPrivileges, read-only filesystem, CPU/RAM cgroups.


## Session lifecycle
```mermaid
stateDiagram-v2
  [*] --> Idle

  Idle --> Active: POST /api/sessions

  state Active {
    [*] --> Running
    Running: snapshot persona config<br/>start timer (deadlineAt)
    Running --> Running: GET /api/sessions/id<br/>apply switcheroos
  }

  Active --> Expired: deadline reached
  Active --> Completed: last attempt PASSED

  state Expired {
    [*] --> Cleanup
    Cleanup: mark RUNNING attempts as FAILED<br/>clear chat history
  }

  state Completed {
    [*] --> Preserved
    Preserved: preserve conversation context
  }

  Expired --> [*]
  Completed --> [*]
```

## Authentication flow (jwt, oauth)
```mermaid
sequenceDiagram
  autonumber
  participant FE as Frontend
  participant API as Express /api/auth
  participant FB as Firebase Admin
  participant DB as Prisma + PostgreSQL

  rect rgb(250,250,250)
  Note over FE,API: OAuth via Firebase
  FE->>API: POST /api/auth/firebase<br/>{idToken}
  API->>FB: verifyIdToken(idToken)
  FB-->>API: {uid, email, claims}
  API->>DB: find or create user
  API-->>FE: 200 {accessToken}<br/>+ HttpOnly refresh cookie
  end

  rect rgb(245,245,245)
  Note over FE,API: Local register / login
  FE->>API: POST /api/auth/register<br/>{email, password}
  API->>DB: create user + bcrypt hash
  API-->>FE: 201 {accessToken}<br/>+ refresh cookie

  FE->>API: POST /api/auth/login<br/>{email, password}
  API->>DB: verify bcrypt
  API-->>FE: 200 {accessToken}<br/>+ refresh cookie
  end

  rect rgb(240,240,240)
  Note over FE,API: Token refresh
  FE->>API: POST /api/auth/refresh<br/>(cookie: refreshToken)
  API->>DB: verify refresh token
  API-->>FE: 200 {accessToken}<br/>+ rotated refresh cookie
  end
```
## Persona system
Each AI coworker has:

- Personality traits (procrastinator, perfectionist, gaslighter)
- Code gating policy (when they'll actually write code)
- Escalation thresholds (how much pressure before they cave)
- Custom prompt engineering (their unique voice/behavior)

## some API Routes
### Authentication
- `POST /api/auth/register` - Create new user account
- `POST /api/auth/login` - Email/password login
- `POST /api/auth/firebase` - OAuth via Firebase
- `POST /api/auth/refresh` - Refresh access token

### Problems & Sessions
- `GET /api/problems` - List available problems
- `GET /api/problems/:id` - Get problem details
- `POST /api/sessions` - Start new problem session
- `GET /api/sessions/:id` - Get session status
- `POST /api/sessions/:id/complete` - Mark session complete
- `POST /api/sessions/:id/expire` - Expire session

### AI Interaction
- `POST /api/ai/solve` - Chat with AI persona
- `GET /api/personas` - List available personas

### Code Execution
- `POST /api/attempts` - Submit code for grading
- `GET /api/attempts/:id` - Get attempt results

---




### Environment variables 
These are held as GitHub secrets, no API key was pushed to prod :)

 

