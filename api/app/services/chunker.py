import re
from typing import List
from app.schemas.ingest import ProvisionSchema

def extract_provisions(text: str) -> List[ProvisionSchema]:
    """
    Chunks legal text by structure (e.g., Articles, Chapters).
    Fallback to simple splitting if structured elements aren't found.
    """
    # Regex to split exclusively before "Art. X" allowing roman numerals or º/o
    chunks = re.split(r'\n(?=(?:Art\.|Artigo)\s*\d+)', text)
    
    provisions = []
    for chunk in chunks:
        stripped = chunk.strip()
        if not stripped:
            continue
            
        m = re.match(r'^((?:Art\.|Artigo)\s*\d+(?:[ºo])?)', stripped, re.IGNORECASE)
        structure_path = m.group(1).strip() if m else None
        
        provisions.append(ProvisionSchema(
            structure_path=structure_path,
            texto_chunk=stripped
        ))
        
    return provisions
