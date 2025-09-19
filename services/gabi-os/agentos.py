#!/usr/bin/env python3
"""
Gabi AgentOS - Runtime para agentes dinâmicos
Baseado no Agno SDK
"""

import os
import asyncio
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()

app = FastAPI(
    title="Gabi AgentOS",
    description="Runtime para agentes dinâmicos do Gabi",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {
        "service": "Gabi AgentOS",
        "status": "running",
        "version": "1.0.0",
        "description": "Runtime para agentes dinâmicos"
    }

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "gabi-os"}

@app.get("/agents")
async def list_agents():
    """Lista agentes disponíveis"""
    return {
        "agents": [
            {"id": "orchestrator", "name": "Orquestrador", "status": "active"},
            {"id": "assistant", "name": "Assistente", "status": "active"},
            {"id": "researcher", "name": "Pesquisador", "status": "active"}
        ]
    }

@app.post("/agents/{agent_id}/chat")
async def chat_with_agent(agent_id: str, message: dict):
    """Chat com um agente específico"""
    return {
        "agent_id": agent_id,
        "response": f"Resposta do agente {agent_id}: {message.get('message', 'Olá!')}",
        "timestamp": "2024-01-01T00:00:00Z"
    }

if __name__ == "__main__":
    port = int(os.getenv("PORT", 7777))
    uvicorn.run(app, host="0.0.0.0", port=port)
