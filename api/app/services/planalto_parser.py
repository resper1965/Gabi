import re
from typing import List

try:
    from bs4 import BeautifulSoup
except ImportError:
    pass # Will handle gracefully if not installed

from app.schemas.ingest import ProvisionSchema

def parse_planalto_html(raw_html: str) -> str:
    """
    Cleans up Planalto HTML, removing struck-through (revoked) text
    and extracting only the valid content.
    """
    try:
        soup = BeautifulSoup(raw_html, "html.parser")
    except NameError:
        raise RuntimeError("BeautifulSoup4 is required for Planalto parsing. Run: pip install beautifulsoup4")

    # Remove struck-through elements (revoked text)
    for strike in soup.find_all(['strike', 'del', 's']):
        strike.decompose()
        
    # Sometimes Planalto uses <span style="text-decoration: line-through">
    for span in soup.find_all('span'):
        style = span.get('style', '').lower()
        if 'line-through' in style:
            span.decompose()

    # Extract clean text
    text = soup.get_text(separator="\n")
    
    # Clean up whitespace and empty lines
    lines = [line.strip() for line in text.split("\n") if line.strip()]
    text = "\n".join(lines)
    
    # Clean up repeated spaces
    text = re.sub(r' {2,}', ' ', text)
    
    return text

def chunk_planalto_law(clean_text: str) -> List[ProvisionSchema]:
    """
    Chunks a clean Planalto Law text by Article (Art. 1º, Art. 2º, etc.).
    This ensures RAG can retrieve specific articles accurately.
    """
    # Regex splits before "Art. 1", "Art. 1º", "Artigo 1"
    # The lookahead (?=...) keeps the "Art" part in the next chunk
    pattern = r'\n(?=(?:O\s+)?(?:Art\.|Artigo)\s*\d+)'
    chunks = re.split(pattern, "\n" + clean_text, flags=re.IGNORECASE)
    
    provisions = []
    
    for chunk in chunks:
        stripped = chunk.strip()
        if not stripped:
            continue
            
        # Try to extract the literal "Art. 1º" as the structure_path
        m = re.search(r'((?:Art\.|Artigo)\s*\d+(?:[ºo])?)', stripped, flags=re.IGNORECASE)
        structure_path = m.group(1).strip() if m else None
        
        # We don't want to save thousands of small meaningless chunks.
        # If a chunk is just header metadata without an Article, we might group it
        # but for now, we just save it as is with structure_path=None
        
        provisions.append(ProvisionSchema(
            structure_path=structure_path,
            texto_chunk=stripped
        ))

    return provisions
