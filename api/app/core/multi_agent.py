"""
Gabi Hub — Multi-Agent Orchestrator
Runs multiple specialized agents in parallel, then synthesizes their outputs.
Used by gabi.legal for auditor+researcher debate.
"""

import asyncio
from dataclasses import dataclass

from app.core.ai import generate, generate_json, ModuleName


@dataclass
class AgentConfig:
    name: str
    system_prompt: str
    module: ModuleName
    output_json: bool = False


SYNTHESIZER_PROMPT = """Você é a Gabi, Sintetizadora Jurídica Sênior.

Você recebeu análises de {n_agents} agentes especializados sobre a mesma consulta.
Sua tarefa: SINTETIZAR as perspectivas em uma resposta unificada e coerente.

REGRAS:
1. Combine insights sem repetir informações.
2. Se houver CONFLITO entre agentes, destaque-o explicitamente.
3. Priorize dados factuais sobre opiniões.
4. Mantenha citações de fontes quando disponíveis.
5. Estruture em: Resumo Executivo, Análise Combinada, Pontos de Atenção.

ANÁLISES DOS AGENTES:
{agent_outputs}

CONSULTA ORIGINAL: {query}

Sintetize agora."""


async def debate(
    agents: list[AgentConfig],
    query: str,
    rag_context: str,
    chat_history: list[dict] | None = None,
) -> dict:
    """
    Run multiple agents in parallel on the same query + RAG context,
    then synthesize their outputs into a unified response.
    """
    prompt = f"""
{rag_context}

[CONSULTA]
{query}

Execute a análise conforme suas instruções.
"""

    # Phase 1: Run agents in parallel
    async def run_agent(agent: AgentConfig) -> dict:
        try:
            if agent.output_json:
                result = await generate_json(
                    module=agent.module,
                    prompt=prompt,
                    system_instruction=agent.system_prompt,
                )
            else:
                text_result = await generate(
                    module=agent.module,
                    prompt=prompt,
                    system_instruction=agent.system_prompt,
                    chat_history=chat_history,
                )
                result = {"text": text_result}
            return {"agent": agent.name, "result": result, "status": "ok"}
        except Exception as e:
            return {"agent": agent.name, "result": {"error": str(e)}, "status": "error"}

    agent_results = await asyncio.gather(*[run_agent(a) for a in agents])

    # Phase 2: Synthesize
    agent_outputs_text = "\n\n".join(
        f"--- {r['agent'].upper()} ---\n"
        + (
            r["result"].get("text", "")
            or str(r["result"])
        )[:1500]
        for r in agent_results
        if r["status"] == "ok"
    )

    synthesis = await generate(
        module="law",
        prompt=SYNTHESIZER_PROMPT.format(
            n_agents=len(agents),
            agent_outputs=agent_outputs_text,
            query=query,
        ),
    )

    return {
        "synthesis": synthesis,
        "agents_used": [r["agent"] for r in agent_results],
        "agent_details": agent_results,
        "mode": "multi-agent-debate",
    }
