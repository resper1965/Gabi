# Gabi Hub — Architecture Guide

> Enterprise-grade AI platform for legal, compliance, and business intelligence.

---

## High-Level Architecture

```mermaid
graph TB
    subgraph "Frontend (Next.js)"
        WEB["gabi-web<br/>Next.js 14 · Port 3000"]
    end

    subgraph "Backend (FastAPI)"
        API["gabi-api<br/>FastAPI · Port 8080"]
        AUTH["Auth Middleware<br/>Firebase ID Token"]
        FINOPS["FinOps Engine<br/>Seats · Ops · Sessions"]
    end

    subgraph "AI Layer"
        VERTEX["Vertex AI<br/>Gemini 1.5 Pro"]
        EMBED["Embeddings<br/>text-multilingual-004"]
    end

    subgraph "Data Layer"
        PG["Cloud SQL<br/>PostgreSQL 15"]
        VECTOR["pgvector<br/>Cosine Similarity"]
    end

    subgraph "Infrastructure"
        CR["Cloud Run<br/>Managed Containers"]
        CB["Cloud Build<br/>CI/CD Pipeline"]
        SM["Secret Manager<br/>Credentials"]
        FB["Firebase<br/>Auth + Storage"]
    end

    WEB -->|HTTPS| API
    API --> AUTH
    AUTH --> FB
    API --> FINOPS
    FINOPS --> PG
    API --> VERTEX
    API --> EMBED
    EMBED --> VECTOR
    VERTEX --> PG
    API --> PG
    CR --> API
    CR --> WEB
    CB --> CR
    SM --> API
```

---

## Module Architecture

```mermaid
graph LR
    subgraph "Modules"
        GHOST["nGhost<br/>Ghost Writer"]
        LAW["Law & Comply<br/>Legal AI Agent"]
        NTALK["nTalkSQL<br/>Natural Language → SQL"]
        CHAT["Chat<br/>Session Management"]
    end

    subgraph "Core Services"
        AUTH["Auth & RBAC"]
        ORG["Organizations"]
        PLATFORM["Platform Admin"]
        ADMIN["Admin Dashboard"]
        LGPD["LGPD Compliance"]
    end

    subgraph "Shared Infrastructure"
        RAG["RAG Pipeline<br/>Upload → Chunk → Embed → Store"]
        AI["AI Service<br/>Vertex AI Abstraction"]
        LIMITS["FinOps<br/>Rate Limiting"]
    end

    GHOST --> RAG
    GHOST --> AI
    LAW --> RAG
    LAW --> AI
    NTALK --> AI
    GHOST --> LIMITS
    LAW --> LIMITS
    NTALK --> LIMITS
    ORG --> LIMITS
```

---

## Data Model (ERD)

```mermaid
erDiagram
    USERS {
        uuid id PK
        string firebase_uid UK
        string email UK
        string name
        string role "superadmin | admin | user"
        string status "approved | pending | blocked"
        string[] allowed_modules
        uuid org_id FK
    }

    ORGANIZATIONS {
        uuid id PK
        string name
        string cnpj UK
        string sector
        uuid plan_id FK
        string domain
        boolean is_active
        datetime trial_expires_at
    }

    PLANS {
        uuid id PK
        string name UK "trial | starter | pro | enterprise"
        int max_seats
        int max_ops_month
        int max_concurrent
        float price_brl
        boolean is_trial
    }

    ORG_MEMBERS {
        uuid id PK
        uuid org_id FK
        uuid user_id FK
        string role "owner | admin | member"
    }

    ORG_MODULES {
        uuid id PK
        uuid org_id FK
        string module "ghost | law | ntalk"
        boolean enabled
    }

    ORG_USAGE {
        uuid id PK
        uuid org_id FK
        string month "YYYY-MM"
        int ops_count
        datetime last_op_at
    }

    ORG_SESSIONS {
        uuid id PK
        uuid org_id FK
        uuid user_id FK
        datetime last_active
    }

    ORGANIZATIONS ||--o{ ORG_MEMBERS : "has members"
    ORGANIZATIONS ||--o{ ORG_MODULES : "has modules"
    ORGANIZATIONS ||--o{ ORG_USAGE : "tracks usage"
    ORGANIZATIONS ||--o{ ORG_SESSIONS : "tracks sessions"
    ORGANIZATIONS }o--|| PLANS : "subscribes to"
    USERS ||--o{ ORG_MEMBERS : "belongs to"
    USERS ||--o{ ORG_SESSIONS : "has sessions"
```

---

## Request Flow

```mermaid
sequenceDiagram
    participant U as User Browser
    participant W as gabi-web
    participant F as Firebase Auth
    participant A as gabi-api
    participant M as Middleware
    participant DB as PostgreSQL
    participant AI as Vertex AI

    U->>W: Click action
    W->>F: Get ID Token
    F-->>W: JWT Token
    W->>A: API Request + Bearer Token
    A->>M: Security Headers
    M->>M: Request Logging
    M->>M: Error Handler
    A->>A: Verify Firebase Token
    A->>DB: Upsert User + Resolve Org
    A->>A: Check FinOps Limits
    A->>A: Check Module Access
    A->>AI: Generate AI Response
    AI-->>A: Response
    A->>DB: Store Result + Increment Ops
    A-->>W: JSON Response
    W-->>U: Render UI
```

---

## Deployment Pipeline

```mermaid
graph LR
    subgraph "Development"
        DEV["git push"]
    end

    subgraph "Cloud Build Pipeline"
        TEST["Step 1: pytest"]
        SAST["Step 2: Bandit SAST"]
        SCA["Step 3: pip-audit SCA"]
        SECRETS["Step 4: Gitleaks"]
        BUILD_API["Step 5: Docker Build API"]
        BUILD_WEB["Step 6: Docker Build Web"]
        PUSH["Step 7: Push to Artifact Registry"]
        DEPLOY_API["Step 8: Deploy API to Cloud Run"]
        DEPLOY_WEB["Step 9: Deploy Web to Cloud Run"]
    end

    DEV --> TEST
    DEV --> SAST
    DEV --> SCA
    DEV --> SECRETS
    TEST --> BUILD_API
    TEST --> BUILD_WEB
    BUILD_API --> PUSH
    BUILD_WEB --> PUSH
    PUSH --> DEPLOY_API
    PUSH --> DEPLOY_WEB
```

---

## Security Architecture

| Layer | Control | Implementation |
|-------|---------|----------------|
| **Auth** | Firebase ID Token | JWT verification on every request |
| **RBAC** | Role-based access | superadmin → admin → user |
| **Module** | Hybrid access | org_modules (org-level) + allowed_modules (user-level) |
| **FinOps** | Rate limiting | Seats, ops/month, concurrent sessions per plan |
| **SSDLC** | Security pipeline | Bandit SAST + pip-audit SCA + Gitleaks + pytest |
| **Headers** | Security headers | HSTS, CSP, X-Frame-Options, X-Content-Type-Options |
| **LGPD** | Data protection | Right to access, deletion, portability |
| **Secrets** | Secret Manager | DB URL, Firebase key stored in GCP Secret Manager |
| **Error** | Sanitization | Production errors never leak stack traces |

---

## Technology Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Frontend | Next.js | 14.x |
| Backend | FastAPI | 0.100+ |
| Language | Python | 3.12 |
| Database | PostgreSQL | 15 |
| Vector | pgvector | 0.7+ |
| AI | Vertex AI (Gemini) | 1.5 Pro |
| Auth | Firebase Auth | — |
| Container | Cloud Run | Gen2 |
| CI/CD | Cloud Build | — |
| Registry | Artifact Registry | — |
| Region | southamerica-east1 | São Paulo |
