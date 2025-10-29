flowchart LR
  %% ===== Client =====
  subgraph Client["Client (React + TypeScript)"]
    UI[App UI\nVite build]
    AuthSDK[Firebase Web SDK]
  end

  %% ===== Edge / Host =====
  subgraph Edge["Edge & Host"]
    Nginx[Nginx Reverse Proxy\nTLS termination\nStatic cache (Vite build)]
    Systemd[systemd Units\napp-backend.service\napp-worker.service\nHardening + cgroups]
  end

  %% ===== Backend =====
  subgraph Backend["Backend (Node.js / Express)"]
    API[Express API\nREST: /problems /attempts /sessions /personas\n/api/ai/* /api/auth/*]
    Prisma[Prisma ORM]
    Policy[Policy & Persona Engine\nCode gating & Escalation]
    Queue[Job Queue (in-proc)\nmakeJobQueue().enqueueAttempt]
  end

  %% ===== Worker / Sandbox =====
  subgraph Grader["Worker & Sandbox"]
    Worker[Worker Pool\nConcurrent processors]
    JSVM[JS Runner\nNode vm.Script\nTimeout = 1s]
    PyProc[Python Runner\nchild_process.spawn\nParse last non-empty line (JSON)]
    CPPRunner[C++ Runner (WIP)\ng++ compile + argv JSON]
    CGroups[systemd cgroups\nRAM 350MB • CPU 150% • PIDs ≤ 512]
    FutureDocker[Planned: per-attempt Docker\n--network none • --read-only • non-root\nStricter resource caps]
  end

  %% ===== Data Stores =====
  subgraph Data["Data Stores"]
    PG[(PostgreSQL)]
    Secrets[backend.env]
  end

  %% ===== Third-Party =====
  subgraph ThirdParty["Third-Party"]
    Firebase[Firebase Admin\nJWT verify • OAuth link]
    OpenAI[OpenAI API\nchat.completions]
  end

  %% ===== Edges =====
  Client -->|HTTPS| Nginx
  Nginx --> API

  API --> Prisma
  Prisma --> PG

  API -->|verifyIdToken / JWT| Firebase

  API --> Policy
  Policy --> OpenAI

  API --> Queue
  Queue --> Worker
  Worker --> JSVM
  Worker --> PyProc
  Worker --> CPPRunner
  Worker -. limits .-> CGroups
  Worker -->|logs / results| API

  API --> PG
  API -. reads .-> Secrets
  Worker -. reads .-> Secrets

  UI <--> |polling / attempt status| API
