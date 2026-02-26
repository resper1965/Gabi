#!/usr/bin/env python3
"""
Fetch historical regulatory texts from CVM indices.
Implements the historical seed layer for the RAG architecture.
It scrapes the provided index URLs to extract all resolutions, deliberations, etc.,
hashing them and storing metadata in cvm_atos_historico.jsonl
"""

import os
import re
import math
import json
import urllib.request
from datetime import datetime, timezone

# Import core fetcher utilities
try:
    from fetch_regulatory import HEADERS
    from fetch_cvm_feed import fetch_content_text, compute_hash, append_record, load_existing_records
except ImportError:
    import sys
    sys.path.append(os.path.dirname(__file__))
    from fetch_regulatory import HEADERS
    from fetch_cvm_feed import fetch_content_text, compute_hash, append_record, load_existing_records

OUTPUT_FILE = os.path.join(os.path.dirname(__file__), "..", "api", "seeds", "regulatory", "cvm", "cvm_atos_historico.jsonl")

INDEX_URLS = [
    {
        "url": "https://conteudo.cvm.gov.br/legislacao/resolucoes.html",
        "tipo": "Resolução"
    },
    # Can append Instrucoes, Deliberacoes, etc.
]

def fetch_html(url: str) -> str:
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            content = resp.read()
            try:
                return content.decode('utf-8')
            except UnicodeDecodeError:
                return content.decode('latin-1')
    except Exception as e:
        print(f"Error fetching HTML from {url}: {e}")
        return ""

def extract_acts(html: str, index_base_url: str):
    """
    Look for structured blocks indicating a norm:
    Usually inside a list or paragraph, with a strong link pointing to the act.
    <a href="resolucoes/resol239.html">Resolução CVM 239</a>
    """
    # Find all anchor tags that look like they point to acts
    # <a href="/legislacao/resolucoes/resol239.html">Resolução CVM 239</a>
    pattern = r'<a\s+[^>]*href=["\']([^"\']+\.html)["\'][^>]*>(.*?)</a>'
    matches = re.finditer(pattern, html, re.IGNORECASE | re.DOTALL)
    
    extracted = []
    seen = set()
    
    for m in matches:
        href = m.group(1).strip()
        anchor_text = m.group(2).strip()
        anchor_text = re.sub(r'<[^>]+>', '', anchor_text).strip() # Clean nested tags
        
        # Filter for links that are actual norms
        if not re.search(r'(Resolução|Deliberação|Ofício|Instrução|Circular|Parecer)\s+.*?\d+', anchor_text, re.IGNORECASE):
            continue
            
        # Deduplicate
        if href in seen:
            continue
        seen.add(href)
        
        # Build canonical URL
        if not href.startswith("http"):
            if href.startswith("/"):
                full_url = "https://conteudo.cvm.gov.br" + href
            else:
                base = index_base_url.rsplit("/", 1)[0]
                full_url = base + "/" + href
        else:
            full_url = href
            
        extracted.append({
            "title": anchor_text,
            "url": full_url
        })
        
    return extracted

def extract_metadata_from_title(title: str, expected_tipo: str):
    """Extract metadata (tipo, numero) from historical title"""
    tipo_ato = expected_tipo
    numero = "N/A"
    
    m = re.search(r'(?:\w+\s+)*(?:CVM\s+|SIN\s+)?(\d+[-/\.]?\d*)', title, re.IGNORECASE)
    if m:
        numero = m.group(1)
        
    return tipo_ato, numero

def crawl_indices(max_per_index=5):
    """
    Crawl indices. Limit to max_per_index for testing.
    """
    print(f"Starting Historical Crawl (Max {max_per_index} per index)")
    existing = load_existing_records(OUTPUT_FILE)
    
    for idx in INDEX_URLS:
        print(f"\nProcessing Index: {idx['tipo']} - {idx['url']}")
        html = fetch_html(idx['url'])
        
        acts = extract_acts(html, idx['url'])
        print(f"Found {len(acts)} potential acts. Taking top {min(len(acts), max_per_index)}.")
        
        acts = acts[:max_per_index]
        for act in acts:
            title = act['title']
            url = act['url']
            
            tipo_ato, numero = extract_metadata_from_title(title, idx['tipo'])
            
            if url in existing:
                print(f"  -> Skipping existing: {title}")
                continue
                
            print(f"[{tipo_ato} {numero}] Fetching: {url}")
            text = fetch_content_text(url)
            
            if not text:
                print(f"  -> Failed to extract text for {url}")
                continue
                
            current_hash = compute_hash(text)
            
            record = {
                "id_fonte": url,
                "tipo_ato": tipo_ato,
                "numero": numero,
                "data_publicacao": "", # Historical HTML parsing for dates is tricky, leaving blank for initial seed
                "ementa": "", 
                "status": "Desconhecido", # We cannot reliably fetch status from the simple list
                "texto_integral": text,
                "versao_hash": current_hash,
                "capturado_em": datetime.now(timezone.utc).isoformat() + "Z"
            }
            append_record(OUTPUT_FILE, record)
            existing[url] = record
            print(f"  -> ✅ SEED record saved.")

if __name__ == "__main__":
    crawl_indices(max_per_index=5)  # Fetch top 5 for safe testing
