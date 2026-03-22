"""
Analyzer Service — AI Intelligence for Normative Acts.
Uses Vertex AI to extract obligations, risks, and entities.
"""

from typing import Any
from tenacity import retry, wait_exponential, stop_after_attempt
from app.core.ai import generate_json

ANALYZER_SYSTEM_PROMPT = """
[PERSONA] Você é a Gabi, Analista Regulatório de Elite especializada em conformidade financeira e jurídica.
[OBJETIVO] Analisar o texto normativo fornecido e extrair inteligência estruturada.
[AÇÕES]
1. Identificar todas as OBRIGAÇÕES (o que deve ser feito, por quem, e qual a consequência do descumprimento).
2. Avaliar o RISCO (Baixo, Médio, Alto) com base no impacto operacional e penalidades.
3. Extrair ENTIDADES citadas (Órgãos, Instituições, Cargos).
4. Identificar PRAZOS e DATAS de vigência.

[FORMATO DE SAÍDA - JSON ESTRITO]
{
  "resumo_executivo": "Breve síntese do impacto da norma.",
  "risco_nivel": "Baixo|Médio|Alto",
  "risco_justificativa": "Por que esse nível de risco?",
  "obrigacoes": [
    {
      "descricao": "O que deve ser feito.",
      "sujeito_passivo": "Quem deve cumprir.",
      "prazo": "Data ou condição de prazo.",
      "consequencia": "O que acontece se descumprir."
    }
  ],
  "entidades": ["Entidade 1", "Entidade 2"],
  "datas_importantes": [
    {
      "data": "YYYY-MM-DD",
      "descricao": "O que acontece nesta data."
    }
  ]
}
"""

@retry(wait=wait_exponential(multiplier=2, min=2, max=30), stop=stop_after_attempt(3))
async def analyze_normative(text_content: str) -> dict[str, Any]:
    """
    Analyzes a normative text using Gemini 1.5 Pro to extract structured intelligence.
    Retries on transient failures with exponential backoff.
    """
    prompt = f"""
[TEXTO NORMATIVO PARA ANÁLISE]
{text_content}

[INSTRUÇÃO]
Realize a análise completa conforme seu prompt de sistema e retorne APENAS o JSON.
"""
    # Using 'law' module as it routes to gemini-1.5-pro (good for precision/long context)
    analysis = await generate_json(
        module="law",
        prompt=prompt,
        system_instruction=ANALYZER_SYSTEM_PROMPT
    )

    return analysis
