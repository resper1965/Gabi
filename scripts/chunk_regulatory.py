import re
import json

def chunk_normative_text(text: str):
    """
    Chunks legal text primarily by Articles (Art.).
    """
    # Simple regex to split by Art. 1, Art. 2, etc. (including roman numerals or º/o)
    # This is a basic implementation, real-world requires handling Chapters, Sections, etc.
    chunks = re.split(r'\n(?=Art\.\s*\d+)', text)
    
    # Clean up empty chunks and strip whitespace
    cleaned_chunks = []
    for chunk in chunks:
        stripped = chunk.strip()
        if stripped:
            cleaned_chunks.append(stripped)
            
    return cleaned_chunks

def process_file(filepath):
    results = []
    with open(filepath, 'r', encoding='utf-8') as f:
        for line in f:
            if not line.strip(): continue
            record = json.loads(line)
            
            chunks = chunk_normative_text(record['texto_integral'])
            for i, c in enumerate(chunks):
                chunk_record = record.copy()
                chunk_record['texto_integral'] = c
                chunk_record['chunk_index'] = i
                chunk_record['chunk_total'] = len(chunks)
                results.append(chunk_record)
                
    return results

if __name__ == "__main__":
    records = process_file('../api/seeds/regulatory/cvm/cvm_atos_historico.jsonl')
    print(f"Generated {len(records)} chunks from historical seed.")
    # Show example
    if records:
        print("\n--- Example Chunk ---")
        print(f"Ato: {records[1]['tipo_ato']} {records[1]['numero']}")
        print(f"Content:\n{records[1]['texto_integral'][:200]}...")
