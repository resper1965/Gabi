import asyncio
import sys
import os

# Add api directory to sys.path
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from app.services.analyzer import analyze_normative
from dotenv import load_dotenv

load_dotenv()

SAMPLE_TEXT = """
RESOLUÇÃO BCB Nº 1, DE 12 DE AGOSTO DE 2020
Estabelece diretrizes para a implementação do Sistema de Pagamentos Instantâneos (PIX).

Art. 1º As instituições financeiras e demais instituições autorizadas a funcionar pelo Banco Central do Brasil que detiverem conta transacional para seus clientes devem aderir ao PIX.
§ 1º A adesão deve ocorrer até 16 de novembro de 2020.
§ 2º O descumprimento do prazo sujeita a instituição a multa diária de R$ 50.000,00, sem prejuízo de outras sanções administrativas.

Art. 2º O Sistema de Pagamentos Instantâneos será gerido pelo Departamento de Operações Bancárias e de Sistema de Pagamentos (Deban).
"""

async def main():
    print("Testing Normative Analyzer...")
    try:
        analysis = await analyze_normative(SAMPLE_TEXT)
        print("\n--- ANALYSIS RESULT ---")
        import json
        print(json.dumps(analysis, indent=2, ensure_ascii=False))
    except Exception as e:
        print(f"Error during analysis: {e}")

if __name__ == "__main__":
    asyncio.run(main())
