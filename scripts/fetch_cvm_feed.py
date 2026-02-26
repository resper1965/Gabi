#!/usr/bin/env python3
"""
Fetch updates from the CVM legislative RSS feed.
Implements a "compliance-grade" RAG architecture layer by storing metadata, 
content hashing, and full text for regulatory changes.
Outputs to api/seeds/regulatory/cvm/cvm_atos_continuo.jsonl
"""

import os
import re
import html
import json
import hashlib
import urllib.request
import xml.etree.ElementTree as ET
from urllib.error import URLError
from datetime import datetime, timezone

# We will reuse the HTML cleaner from fetch_regulatory if possible
try:
    from fetch_regulatory import HEADERS, html_to_text, clean_legal_text
except ImportError:
    # Fallback in case fetch_regulatory is not in python path
    import sys
    sys.path.append(os.path.dirname(__file__))
    from fetch_regulatory import HEADERS, html_to_text, clean_legal_text

RSS_URL = "https://conteudo.cvm.gov.br/feed/legislacao.xml"
OUTPUT_FILE = os.path.join(os.path.dirname(__file__), "..", "api", "seeds", "regulatory", "cvm", "cvm_atos_continuo.jsonl")

def compute_hash(content: str) -> str:
    """Return SHA-256 hash of the content."""
    return hashlib.sha256(content.encode('utf-8')).hexdigest()

def extract_metadata(title: str, link: str):
    """
    Extract act type and number from title.
    Example: 'Ofício Circular CVM/SIN 04/26, de 11 de Fevereiro de 2026'
             'Resolução CVM 239, de 09 de Janeiro de 2026'
    """
    title_lower = title.lower()
    tipo_ato = "Desconhecido"
    
    if "resolução cvm" in title_lower:
        tipo_ato = "Resolução"
    elif "ofício circular" in title_lower or "ofício-circular" in title_lower:
        tipo_ato = "Ofício-Circular"
    elif "deliberação cvm" in title_lower:
        tipo_ato = "Deliberação"
    elif "instrução cvm" in title_lower:
        tipo_ato = "Instrução"
        
    numero = "N/A"
    # Simple heuristic to extract the first sequence of numbers/slashes
    m = re.search(r'(?:CVM\s+|CVM/.*?/|SIN\s+)?(\d+[-/\.]?\d*)', title, re.IGNORECASE)
    if m:
        numero = m.group(1)
        
    return tipo_ato, numero

def fetch_pdf_text(pdf_url: str) -> str:
    """Download PDF and extract text using PyMuPDF."""
    import fitz  # PyMuPDF
    import io
    
    req = urllib.request.Request(pdf_url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            pdf_data = resp.read()
            
        doc = fitz.open(stream=pdf_data, filetype="pdf")
        text_blocks = []
        for page in doc:
            text_blocks.append(page.get_text())
        return "\n".join(text_blocks)
    except Exception as e:
        print(f"Error fetching/parsing PDF {pdf_url}: {e}")
        return ""

def fetch_content_text(url: str) -> str:
    """Fetch HTML from the source. If it links to a PDF, extract from the PDF. Otherwise clean HTML."""
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            content = resp.read()
            try:
                html_raw = content.decode('utf-8')
            except UnicodeDecodeError:
                html_raw = content.decode('latin-1')
            
            # Check for PDF links in the HTML
            # Look for href="/export/sites/cvm/legislacao/.../resol239.pdf" or similar
            pdf_link_match = re.search(r'href=["\']([^"\']+\.pdf)["\']', html_raw, re.IGNORECASE)
            if pdf_link_match:
                pdf_path = pdf_link_match.group(1)
                if not pdf_path.startswith("http"):
                    # Handle root relative vs relative
                    if pdf_path.startswith("/"):
                        pdf_url = "https://conteudo.cvm.gov.br" + pdf_path
                    else:
                        base_url = url.rsplit("/", 1)[0]
                        pdf_url = base_url + "/" + pdf_path
                else:
                    pdf_url = pdf_path
                
                print(f"  -> Found PDF link, extracting from PDF: {pdf_url}")
                pdf_text = fetch_pdf_text(pdf_url)
                if pdf_text.strip():
                    return clean_legal_text(pdf_text)
                print("  -> PDF extraction yielded empty text, falling back to HTML.")
                
            clean = html_to_text(html_raw)
            clean = clean_legal_text(clean)
            return clean
    except Exception as e:
        print(f"Error fetching {url}: {e}")
        return ""

def load_existing_records(file_path: str) -> dict:
    """Load existing records by URL to avoid redundant fetching and detect changes."""
    records = {}
    if not os.path.exists(file_path):
        return records
    
    with open(file_path, "r", encoding="utf-8") as f:
        for line in f:
            if not line.strip():
                continue
            try:
                rec = json.loads(line)
                records[rec.get("id_fonte")] = rec
            except json.JSONDecodeError:
                pass
    return records

def append_record(file_path: str, record: dict):
    """Append a new JSONL record."""
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    with open(file_path, "a", encoding="utf-8") as f:
        f.write(json.dumps(record, ensure_ascii=False) + "\n")

def process_feed():
    print(f"Fetching RSS Feed: {RSS_URL}")
    req = urllib.request.Request(RSS_URL, headers=HEADERS)
    try:
        resp = urllib.request.urlopen(req, timeout=30)
        tree = ET.fromstring(resp.read())
    except Exception as e:
        print(f"Failed to fetch or parse RSS feed: {e}")
        return

    existing = load_existing_records(OUTPUT_FILE)
    items = tree.findall('.//item')
    print(f"Found {len(items)} items in feed.")
    
    new_count = 0
    upd_count = 0
    
    for item in items:
        title = item.find("title").text if item.find("title") is not None else ""
        link = item.find("link").text if item.find("link") is not None else ""
        pubDate = item.find("pubDate").text if item.find("pubDate") is not None else ""
        desc = item.find("description").text if item.find("description") is not None else ""
        
        if not link:
            continue
            
        # Standardize link to https to avoid false duplicates
        link = link.replace("http://", "https://")
        
        tipo_ato, numero = extract_metadata(title, link)
        
        # Check against existing to see if we need to fetch
        ext_record = existing.get(link)
        
        # We always fetch if not found, OR if we want to enforce updates, but let's fetch always 
        # for safety if we want to check hash changes (though fetching every time is slow).
        # For an RSS feed, items are few, so fetching all is OK.
        print(f"[{tipo_ato}] {title[:60]}...")
        text = fetch_content_text(link)
        
        if not text:
            print(f"  -> Could not extract text from {link}. Skipping.")
            continue
            
        current_hash = compute_hash(text)
        
        is_new = False
        is_update = False
        
        if not ext_record:
            is_new = True
        elif ext_record.get("versao_hash") != current_hash:
            is_update = True
        
        if is_new or is_update:
            record = {
                "id_fonte": link,
                "tipo_ato": tipo_ato,
                "numero": numero,
                "data_publicacao": pubDate,
                "ementa": desc.strip(),
                "status": "Vigente", # Placeholder, would need NLP or specific checks to detect revogados
                "texto_integral": text,
                "versao_hash": current_hash,
                "capturado_em": datetime.now(timezone.utc).isoformat() + "Z"
            }
            append_record(OUTPUT_FILE, record)
            # Update local memory
            existing[link] = record
            
            if is_new:
                new_count += 1
                print(f"  -> ✅ NEW record saved.")
            else:
                upd_count += 1
                print(f"  -> 🔄 UPDATED record saved (hash changed).")
        else:
            print(f"  -> ✅ Unchanged.")
            
    print(f"\nDone! Added {new_count} new, updated {upd_count}. Total tracked in memory: {len(existing)}.")

if __name__ == "__main__":
    process_feed()
