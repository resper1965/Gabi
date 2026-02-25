import re
from typing import List, Optional, Dict
from pydantic import BaseModel

class LegalProvisionSchema(BaseModel):
    structure_path: str
    article_number: Optional[str] = None
    paragraph: Optional[str] = None
    inciso: Optional[str] = None
    alinea: Optional[str] = None
    item: Optional[str] = None
    text: str
    
class ContextStack:
    """Maintains the legal hierarchy context (Livro, Título, Capítulo, etc.)"""
    def __init__(self):
        self.livro = None
        self.titulo = None
        self.capitulo = None
        self.secao = None
        self.subsecao = None
        
    def update(self, text: str):
        text_upper = text.strip().upper()
        if text_upper.startswith("LIVRO "):
            self.livro = text.strip()
            self.titulo = self.capitulo = self.secao = self.subsecao = None
        elif text_upper.startswith("TÍTULO ") or text_upper.startswith("TITULO "):
            self.titulo = text.strip()
            self.capitulo = self.secao = self.subsecao = None
        elif text_upper.startswith("CAPÍTULO ") or text_upper.startswith("CAPITULO "):
            self.capitulo = text.strip()
            self.secao = self.subsecao = None
        elif text_upper.startswith("SEÇÃO ") or text_upper.startswith("SECAO "):
            self.secao = text.strip()
            self.subsecao = None
        elif text_upper.startswith("SUBSEÇÃO ") or text_upper.startswith("SUBSECAO "):
            self.subsecao = text.strip()

    def get_path_prefix(self) -> str:
        parts = [p for p in [self.livro, self.titulo, self.capitulo, self.secao, self.subsecao] if p]
        return " > ".join(parts) + " > " if parts else ""

def parse_legal_structure(clean_text: str, law_name: str) -> List[LegalProvisionSchema]:
    """
    Parses a clean text of a Brazilian Law into granular provisions.
    It expects the text to be reasonably clean (no HTML).
    """
    provisions = []
    lines = clean_text.split('\n')
    
    ctx = ContextStack()
    current_art = None
    current_par = None
    current_inc = None
    current_ali = None
    
    # regexes
    re_art = re.compile(r'^(O?\s*Artigo\s+\d+|O?\s*Art\.\s*\d+.*?)[-\.]?\s*(.*)', re.IGNORECASE)
    re_par = re.compile(r'^((?:§\s*\d+|Parágrafo\s+único).*?)[-\.]?\s*(.*)', re.IGNORECASE)
    re_inc = re.compile(r'^([IVXLCDM]+\s*-)\s*(.*)', re.IGNORECASE)
    re_ali = re.compile(r'^([a-z]\))\s*(.*)', re.IGNORECASE)
    re_item = re.compile(r'^(\d+\.)\s*(.*)')
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        # Update Hierarchical Context
        if any(line.upper().startswith(x) for x in ["LIVRO ", "TÍTULO ", "TITULO ", "CAPÍTULO ", "CAPITULO ", "SEÇÃO ", "SECAO ", "SUBSEÇÃO "]):
            ctx.update(line)
            continue
            
        # 1. Artigo
        m_art = re_art.match(line)
        if m_art:
            art_num = m_art.group(1).strip()
            content = m_art.group(2).strip() or " "
            current_art = art_num
            current_par = current_inc = current_ali = None # Reset sub-levels
            
            path = f"{law_name} > {ctx.get_path_prefix()}{current_art} (caput)"
            provisions.append(LegalProvisionSchema(
                structure_path=path,
                article_number=current_art,
                text=line # Keep the full line including "Art. X - " for context
            ))
            continue
            
        # 2. Parágrafo
        m_par = re_par.match(line)
        if m_par and current_art:
            par_num = m_par.group(1).strip()
            current_par = par_num
            current_inc = current_ali = None
            
            path = f"{law_name} > {ctx.get_path_prefix()}{current_art} > {current_par}"
            provisions.append(LegalProvisionSchema(
                structure_path=path,
                article_number=current_art,
                paragraph=current_par,
                text=line
            ))
            continue
            
        # 3. Inciso
        m_inc = re_inc.match(line)
        if m_inc and current_art:
            inc_num = m_inc.group(1).strip().strip('-').strip()
            current_inc = inc_num
            current_ali = None # Reset alinea
            
            base_path = f"{law_name} > {ctx.get_path_prefix()}{current_art}"
            if current_par:
                base_path += f" > {current_par}"
            path = f"{base_path} > inciso {current_inc}"
            
            provisions.append(LegalProvisionSchema(
                structure_path=path,
                article_number=current_art,
                paragraph=current_par,
                inciso=current_inc,
                text=line
            ))
            continue
            
        # 4. Alínea
        m_ali = re_ali.match(line)
        if m_ali and current_art and current_inc:
            ali_num = m_ali.group(1).strip()
            current_ali = ali_num
            
            base_path = f"{law_name} > {ctx.get_path_prefix()}{current_art}"
            if current_par:
                base_path += f" > {current_par}"
            path = f"{base_path} > inciso {current_inc} > alínea {current_ali}"
            
            provisions.append(LegalProvisionSchema(
                structure_path=path,
                article_number=current_art,
                paragraph=current_par,
                inciso=current_inc,
                alinea=current_ali,
                text=line
            ))
            continue
            
        # 5. Item
        m_item = re_item.match(line)
        if m_item and current_art and (current_inc or current_ali):
            item_num = m_item.group(1).strip()
            
            base_path = f"{law_name} > {ctx.get_path_prefix()}{current_art}"
            if current_par: base_path += f" > {current_par}"
            if current_inc: base_path += f" > inciso {current_inc}"
            if current_ali: base_path += f" > alínea {current_ali}"
            path = f"{base_path} > item {item_num}"
            
            provisions.append(LegalProvisionSchema(
                structure_path=path,
                article_number=current_art,
                paragraph=current_par,
                inciso=current_inc,
                alinea=current_ali,
                item=item_num,
                text=line
            ))
            continue
            
        # If it doesn't match any structural marker, but belongs to an ongoing element
        if current_art:
            # Append text to the last parsed provision's text if the line isn't a new structure
            if provisions:
                provisions[-1].text += f" {line}"
        else:
            # Metadata at the top (before Art. 1)
            pass 

    return provisions
