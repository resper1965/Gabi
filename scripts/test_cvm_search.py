#!/usr/bin/env python3
"""
Simple test script to simulate RAG retrieval over the extracted CVM chunks.
It loads the chunks, performs a basic keyword search, and formats the output 
following the compliance-grade guardrails.
"""

import json
import os
import sys

HISTORICAL_FILE = os.path.join(os.path.dirname(__file__), "..", "api", "seeds", "regulatory", "cvm", "cvm_atos_historico.jsonl")

def load_chunks():
    chunks = []
    if os.path.exists(HISTORICAL_FILE):
        with open(HISTORICAL_FILE, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    chunks.append(json.loads(line))
    return chunks

def search_chunks(query: str, chunks: list, top_k=2):
    """Extremely basic string matching for demonstration purposes."""
    query_terms = set(query.lower().split())
    
    scored_chunks = []
    for chunk in chunks:
        text = chunk.get("texto_integral", "").lower()
        score = sum(1 for term in query_terms if term in text)
        if score > 0:
            scored_chunks.append((score, chunk))
            
    # Sort by score descending
    scored_chunks.sort(key=lambda x: x[0], reverse=True)
    return [c[1] for c in scored_chunks[:top_k]]

def display_rag_response(query: str, retrieved_chunks: list):
    print(f"=== TESTE RAG CVM (COMPLIANCE-GRADE) ===")
    print(f"Pergunta: '{query}'\n")
    
    if not retrieved_chunks:
        print("Agente: Não encontrei base normativa no acervo em relação à sua pergunta.")
        print("Sugestão: Consulte as atualizações no site da CVM ou no Diário Oficial.")
        return
        
    print("Contexto Recuperado (Para o LLM):")
    for i, chunk in enumerate(retrieved_chunks):
        title = f"{chunk.get('tipo_ato')} {chunk.get('numero')}"
        print(f"  [Trecho {i+1}] {title} (Chunk {chunk.get('chunk_index')}/{chunk.get('chunk_total')})")
        print(f"  URL: {chunk.get('id_fonte')}")
        snippet = chunk.get("texto_integral", "")[:150].replace('\n', ' ')
        print(f"  Texto: {snippet}...\n")
        
    print("--- Simulação da Resposta do Agente ---\n")
    best_chunk = retrieved_chunks[0]
    
    # Simulating what the LLM would write based on the system prompt:
    print(f"O texto normativo estabelece regras aplicáveis a este caso.")
    print("\nReferências:")
    print(f"- Ato: {best_chunk.get('tipo_ato')} {best_chunk.get('numero')}")
    print(f"- Data: {best_chunk.get('capturado_em')} (Data de Captura/Seed)")
    print(f"- Trecho Citável: \"{best_chunk.get('texto_integral')[:100].strip()}...\"")
    print(f"- Fonte: {best_chunk.get('id_fonte')}")

if __name__ == "__main__":
    query = sys.argv[1] if len(sys.argv) > 1 else "fundos de investimento"
    chunks = load_chunks()
    
    if not chunks:
        print("Erro: Nenhum chunk encontrado. Você executou o script chunk_regulatory.py?")
        sys.exit(1)
        
    print(f"Carregados {len(chunks)} chunks da base de conhecimento da CVM.\n")
    results = search_chunks(query, chunks)
    display_rag_response(query, results)
