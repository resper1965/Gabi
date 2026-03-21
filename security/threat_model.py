#!/usr/bin/env python3
"""
Gabi Platform — Threat Model (pytm/OWASP)
==========================================
Generates STRIDE threat analysis from architecture definition.

Usage:
  python threat_model.py --dfd          # Data Flow Diagram (PNG)
  python threat_model.py --report       # Threat report (Markdown)
  python threat_model.py --seq          # Sequence Diagram
  python threat_model.py --list         # List all threats

Ness Processos e Tecnologia Ltda. · CNPJ 72.027.097/0001-37
DPO: Ricardo Esper · dpo@ness.com.br
"""

from pytm import (
    TM, Actor, Boundary, Dataflow, Datastore, Lambda, Server, Process,
    Classification, Data
)

# =============================================================
# THREAT MODEL DEFINITION
# =============================================================

tm = TM("Gabi Platform — Threat Model")
tm.description = (
    "Enterprise AI platform for legal, compliance, and business intelligence. "
    "2 vertical modules (Legal + Style), serving regulated sectors. "
    "Multi-tenant, LGPD-compliant, Cloud Run on GCP."
)
tm.isOrdered = True
tm.mergeResponses = True

# =============================================================
# TRUST BOUNDARIES
# =============================================================

internet = Boundary("Internet")
internet.levels = [0]

cloud_run = Boundary("GCP Cloud Run")
cloud_run.levels = [1]

gcp_services = Boundary("GCP Managed Services")
gcp_services.levels = [2]

internal_network = Boundary("GCP Private Network")
internal_network.levels = [3]

# =============================================================
# ACTORS
# =============================================================

user = Actor("User")
user.inBoundary = internet
user.levels = [0]

admin = Actor("Admin")
admin.inBoundary = internet
admin.levels = [0]

# =============================================================
# DATA DEFINITIONS
# =============================================================

pii_data = Data(
    name="PII Data",
    description="User personal data (name, email, org)",
    classification=Classification.RESTRICTED,
    isPII=True,
    isCredentials=False,
)

legal_docs = Data(
    name="Legal Documents",
    description="Juridical documents, contracts, legal analysis",
    classification=Classification.SENSITIVE,
    isPII=False,
)

chat_messages = Data(
    name="Chat Messages",
    description="User prompts and AI responses",
    classification=Classification.SENSITIVE,
    isPII=False,
)

auth_tokens = Data(
    name="Auth Tokens",
    description="Firebase JWT tokens",
    classification=Classification.RESTRICTED,
    isPII=False,
    isCredentials=True,
)

style_profiles = Data(
    name="Style Profiles",
    description="User writing style profiles (ex-GhostWriter)",
    classification=Classification.SENSITIVE,
    isPII=False,
)

embeddings = Data(
    name="Vector Embeddings",
    description="text-multilingual-embedding-002 vectors",
    classification=Classification.SENSITIVE,
)

# =============================================================
# SERVERS & PROCESSES
# =============================================================

web_app = Server("Next.js Web App")
web_app.OS = "Node.js 22"
web_app.inBoundary = cloud_run
web_app.isHardened = True
web_app.sanitizesInput = True
web_app.protocol = "HTTPS"
web_app.port = 3000

api_server = Server("FastAPI Server")
api_server.OS = "Python 3.12"
api_server.inBoundary = cloud_run
api_server.isHardened = True
api_server.sanitizesInput = True
api_server.hasAccessControl = True
api_server.protocol = "HTTPS"
api_server.port = 8000

auth_middleware = Process("Auth Middleware")
auth_middleware.inBoundary = cloud_run
auth_middleware.implementsAuthenticationScheme = True
auth_middleware.authorizesSource = True

rate_limiter = Process("Rate Limiter")
rate_limiter.inBoundary = cloud_run
rate_limiter.checksInputBounds = True

consent_middleware = Process("Consent Middleware")
consent_middleware.inBoundary = cloud_run

error_handler = Process("Error Handler")
error_handler.inBoundary = cloud_run
error_handler.sanitizesInput = True

rag_engine = Process("Dynamic RAG Engine")
rag_engine.inBoundary = cloud_run
rag_engine.sanitizesInput = True

multi_agent = Process("Multi-Agent Debate")
multi_agent.inBoundary = cloud_run

# =============================================================
# DATASTORES
# =============================================================

cloud_sql = Datastore("Cloud SQL PostgreSQL")
cloud_sql.inBoundary = internal_network
cloud_sql.isEncryptedAtRest = True
cloud_sql.isSQL = True
cloud_sql.protocol = "TCP"
cloud_sql.port = 5432
cloud_sql.hasAccessControl = True
cloud_sql.storesLogData = False
cloud_sql.storesPII = True
cloud_sql.storesSensitiveData = True

pgvector = Datastore("pgvector (Embeddings)")
pgvector.inBoundary = internal_network
pgvector.isEncryptedAtRest = True
pgvector.isSQL = True

secret_manager = Datastore("GCP Secret Manager")
secret_manager.inBoundary = gcp_services
secret_manager.isEncryptedAtRest = True
secret_manager.hasAccessControl = True
secret_manager.storesSensitiveData = True

cloud_logging = Datastore("Cloud Logging")
cloud_logging.inBoundary = gcp_services
cloud_logging.isEncryptedAtRest = True
cloud_logging.storesLogData = True

# =============================================================
# EXTERNAL SERVICES (Lambdas as proxy for external)
# =============================================================

firebase_auth = Lambda("Firebase Auth")
firebase_auth.inBoundary = gcp_services
firebase_auth.hasAccessControl = True
firebase_auth.implementsAuthenticationScheme = True

vertex_ai = Lambda("Vertex AI Gemini")
vertex_ai.inBoundary = gcp_services
vertex_ai.sanitizesInput = False  # LLM can be prompt-injected

embedding_api = Lambda("Embedding API")
embedding_api.inBoundary = gcp_services

# =============================================================
# DATA FLOWS
# =============================================================

# User → Web App
user_to_web = Dataflow(user, web_app, "HTTPS Request")
user_to_web.protocol = "HTTPS"
user_to_web.isEncrypted = True
user_to_web.data = pii_data
user_to_web.note = "TLS 1.3"

# Web App → API Server
web_to_api = Dataflow(web_app, api_server, "API Call + JWT")
web_to_api.protocol = "HTTPS"
web_to_api.isEncrypted = True
web_to_api.data = auth_tokens

# API Server → Auth Middleware
api_to_auth = Dataflow(api_server, auth_middleware, "Verify Token")
api_to_auth.data = auth_tokens

# Auth Middleware → Firebase
auth_to_firebase = Dataflow(auth_middleware, firebase_auth, "Verify JWT")
auth_to_firebase.protocol = "HTTPS"
auth_to_firebase.isEncrypted = True
auth_to_firebase.data = auth_tokens

# API → Rate Limiter
api_to_rate = Dataflow(api_server, rate_limiter, "Check Rate")
api_to_rate.note = "Per-user in-memory rate limiting"

# API → Consent Middleware
api_to_consent = Dataflow(api_server, consent_middleware, "Check Consent")
api_to_consent.data = pii_data

# API → Error Handler
api_to_error = Dataflow(api_server, error_handler, "Handle Errors")
api_to_error.note = "No stack traces in responses"

# API → RAG Engine
api_to_rag = Dataflow(api_server, rag_engine, "Query + Context")
api_to_rag.data = chat_messages

# RAG → Cloud SQL
rag_to_sql = Dataflow(rag_engine, cloud_sql, "SQL Query")
rag_to_sql.protocol = "TCP"
rag_to_sql.isEncrypted = True
rag_to_sql.data = legal_docs
rag_to_sql.note = "ALLOWED_TABLE_PAIRS allowlist + parameterized"

# RAG → pgvector
rag_to_pgvector = Dataflow(rag_engine, pgvector, "Similarity Search")
rag_to_pgvector.protocol = "TCP"
rag_to_pgvector.isEncrypted = True
rag_to_pgvector.data = embeddings

# RAG → Embedding API
rag_to_embed = Dataflow(rag_engine, embedding_api, "Generate Embedding")
rag_to_embed.protocol = "HTTPS"
rag_to_embed.isEncrypted = True
rag_to_embed.data = chat_messages

# API → Multi-Agent
api_to_agent = Dataflow(api_server, multi_agent, "Debate Request")
api_to_agent.data = chat_messages

# Multi-Agent → Vertex AI
agent_to_vertex = Dataflow(multi_agent, vertex_ai, "LLM Prompt")
agent_to_vertex.protocol = "HTTPS"
agent_to_vertex.isEncrypted = True
agent_to_vertex.data = chat_messages
agent_to_vertex.note = "Zero-training agreement, ephemeral processing"

# API → Cloud SQL (CRUD)
api_to_sql = Dataflow(api_server, cloud_sql, "CRUD Operations")
api_to_sql.protocol = "TCP"
api_to_sql.isEncrypted = True
api_to_sql.data = pii_data
api_to_sql.note = "Private IP, RLS by org_id"

# API → Secret Manager
api_to_secrets = Dataflow(api_server, secret_manager, "Fetch Secrets")
api_to_secrets.protocol = "HTTPS"
api_to_secrets.isEncrypted = True

# API → Cloud Logging
api_to_logs = Dataflow(api_server, cloud_logging, "Structured Logs")
api_to_logs.protocol = "HTTPS"
api_to_logs.isEncrypted = True
api_to_logs.note = "JSON structured, no PII in logs"

# Admin → API (LGPD)
admin_to_api = Dataflow(admin, api_server, "LGPD Admin Operations")
admin_to_api.protocol = "HTTPS"
admin_to_api.isEncrypted = True
admin_to_api.data = pii_data
admin_to_api.note = "export/purge endpoints, superadmin only"

# =============================================================
# GENERATE
# =============================================================

if __name__ == "__main__":
    tm.process()
