```mermaid
flowchart LR
  subgraph Client["Client (React + TypeScript)"]
    UI[App UI\nVite build]
    AuthSDK[Firebase Web SDK]
  end

  subgraph Edge["Edge & Host"]
    Nginx[Nginx Reverse Proxy\nTLS termination\nStatic cache (Vite build)]
    Systemd[systemd Units\napp-backend.service\napp-worker.service\nHardening + cgroups]
  end

  subgraph Backend["Backend (Node.js / Express)"]
    API[Express API\nREST: /problems /attempts /sessions /personas /api/ai/* /api/auth/*]
    Prisma[Prisma ORM]
    Policy[Policy & Persona Engine\nCode gating & Escalation]
    Queue[Job Queue (in-proc)\nmakeJobQueue().enqueueAttempt]
  end

  subgraph Grader["Worker & Sandbox"]
    Worker[Worker Pool\nconcurrent processors]
    JSVM[JS Runner\nNode vm.Script\ntimeout=1s]
    PyProc[Python Runner\nchild_process.spawn\nlast non-empty line JSON]
    CPPRunner[C++ Runner (WIP)\ng++ compile + argv JSON]
    CGroups[systemd cgroups\n350MB RAM / 150% CPU / 512 tasks]
    (FutureDocker)[Planned: per-attempt Docker\n--network none, --read-only,\nnon-root, tighter caps]
  end

  subgraph Data["Data Stores"]
    PG[(PostgreSQL)]
    Secrets[backend.env]
  end

  subgraph ThirdParty["Third-Party"]
    Firebase[Firebase Admin\nJWT verify\nOAuth link]
    OpenAI[OpenAI API\nchat.completions]
  end

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
  Worker -->|logs/results| API
  API --> PG
  API -. reads .-> Secrets
  Worker -. reads .-> Secrets

  UI <--> |polling / SSE (attempt status)| API
  
```
