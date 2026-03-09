import re
from typing import List
from app.schemas.ingest import ProvisionSchema

# Maximum characters per provision chunk before sub-splitting.
_MAX_CHUNK = 1200

# Splits at any line that starts a new article OR a structural header.
# Using a lookahead so the delimiter stays at the start of each chunk.
_SPLIT_RE = re.compile(
    r'\n(?=(?:Art\.|Artigo|CAP[IÍ]TULO|SE[CÇ][AÃ]O|T[IÍ]TULO|SUBSE[CÇ][AÃ]O)\s)',
    re.IGNORECASE,
)

# Identifies structural headers (no article content follows on the same line)
_HEADER_RE = re.compile(
    r'^(CAP[IÍ]TULO|SE[CÇ][AÃ]O|T[IÍ]TULO|SUBSE[CÇ][AÃ]O)\b',
    re.IGNORECASE,
)

# Identifies the article label at the start of a chunk
_ARTICLE_START_RE = re.compile(
    r'^((?:Art\.|Artigo)\s*\d+(?:[ºo])?)',
    re.IGNORECASE,
)

# Splits within an article at paragraph/sub-item boundaries
_PARA_RE = re.compile(
    r'\n(?=(?:§\s*\d+|Parágrafo\s+[Úú]nico)\s)',
    re.IGNORECASE,
)


def _split_long_chunk(text: str, parent_path: str | None) -> List[ProvisionSchema]:
    """
    Sub-split a chunk exceeding _MAX_CHUNK chars.
    Tries paragraph boundaries first; falls back to word boundaries.
    """
    if len(text) <= _MAX_CHUNK:
        return [ProvisionSchema(structure_path=parent_path, texto_chunk=text)]

    results: List[ProvisionSchema] = []
    parts = _PARA_RE.split(text)

    if len(parts) > 1:
        for idx, part in enumerate(parts):
            stripped = part.strip()
            if not stripped:
                continue
            m = re.match(r'^(§\s*\d+|Parágrafo\s+[Úú]nico)', stripped, re.IGNORECASE)
            if m:
                sub_path = (
                    f"{parent_path} > {m.group(1).strip()}" if parent_path else m.group(1).strip()
                )
            else:
                sub_path = f"{parent_path} > parte {idx + 1}" if parent_path else f"parte {idx + 1}"
            results.extend(_split_long_chunk(stripped, sub_path))
    else:
        # Hard-split at word boundary
        start = 0
        part_idx = 1
        while start < len(text):
            end = start + _MAX_CHUNK
            if end < len(text):
                boundary = text.rfind(" ", start, end)
                end = boundary if boundary > start else end
            chunk = text[start:end].strip()
            if chunk:
                sub_path = (
                    f"{parent_path} > parte {part_idx}" if parent_path else f"parte {part_idx}"
                )
                results.append(ProvisionSchema(structure_path=sub_path, texto_chunk=chunk))
                part_idx += 1
            start = end

    return results


def extract_provisions(text: str) -> List[ProvisionSchema]:
    """
    Chunk legal text into semantic provisions aware of document structure.

    Strategy:
      1. Split at article AND structural-header boundaries simultaneously so
         that headers (CAPÍTULO, SEÇÃO …) are never swallowed by adjacent articles.
      2. Track the active header as context prefix for every subsequent article.
      3. Sub-split articles longer than _MAX_CHUNK at paragraph (§) boundaries.
      4. Fall back to word-boundary splitting for oversized paragraphs.

    ``structure_path`` encodes the full hierarchical path, e.g.:
        ``CAPÍTULO II > Art. 5 > §2``
    """
    provisions: List[ProvisionSchema] = []
    current_header: str | None = None

    raw_chunks = _SPLIT_RE.split(text)

    for chunk in raw_chunks:
        stripped = chunk.strip()
        if not stripped:
            continue

        if _HEADER_RE.match(stripped):
            # This chunk is a structural header block.
            # Extract the first line as the context label.
            first_line = stripped.split("\n", 1)[0].strip()
            current_header = first_line

            # If there's content after the header on subsequent lines it will
            # be picked up in the next split chunk; nothing to store here.
            # Store the header itself so full-text search can match section names.
            provisions.append(
                ProvisionSchema(structure_path=current_header, texto_chunk=stripped)
            )
            continue

        art_match = _ARTICLE_START_RE.match(stripped)
        if art_match:
            article_label = art_match.group(1).strip()
            structure_path = (
                f"{current_header} > {article_label}" if current_header else article_label
            )
        else:
            # Preamble, ementa, or unnumbered clause
            structure_path = current_header

        provisions.extend(_split_long_chunk(stripped, structure_path))

    return provisions
