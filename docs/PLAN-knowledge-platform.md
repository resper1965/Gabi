# Knowledge Platform — Phase 1

## Goal
Transformar o módulo Law da Gabi num "NotebookLM Jurídico": upload automático com auto-classificação por IA, busca com scopes inteligentes, e geração de apresentações a partir dos documentos.

## Tasks

- [x] **Task 1: Alembic migration** — `alembic/versions/007_knowledge_platform.py`
  → +4 colunas: `area_direito`, `tema`, `partes`, `resumo_ia` no `LegalDocument`

- [x] **Task 2: Doc Classifier service** — `app/services/doc_classifier.py`
  → Gemini Flash classifica: tipo, área do direito, tema, partes, resumo

- [x] **Task 3: Auto-classify on upload** — `law/router.py` modificado
  → Upload chama classify_document() automaticamente, doc_type agora opcional

- [x] **Task 4: Bulk upload endpoint** — `POST /law/upload-batch`
  → Aceita múltiplos arquivos, cada um auto-classificado

- [x] **Task 5: RAG Scopes** — `dynamic_rag.py` modificado
  → Param `scope`: `my_docs` | `regulatory` | `jurisprudence` | `all`

- [x] **Task 6: Auto-scope via intent** — `INTENT_PROMPT` expandido
  → IA decide o scope automaticamente com base na pergunta

- [x] **Task 7: Presentation generator** — `app/services/presentation.py`
  → Gemini extrai pontos-chave → python-pptx renderiza slides dark theme

- [x] **Task 8: Presentation endpoint** — `POST /law/presentation`
  → Recebe document_ids[], gera .pptx para download

- [x] **Task 9: Verificação** — Sintaxe validada em todos os 6 arquivos ✅

## Done When
- [x] Upload de documento classifica automaticamente tipo, área e tema
- [x] Upload em massa funciona com múltiplos arquivos
- [x] RAG diferencia busca "nos meus docs" vs "base regulatória" vs "tudo"
- [x] É possível gerar um `.pptx` a partir de documentos selecionados
- [ ] Deploy: `pip install python-pptx && alembic upgrade head`

## Notes
- Ghost **não é tocado** — permanece como módulo separado
- Chat externo (bot de produto) não faz parte deste escopo
- Phase 2 (GDrive/OneDrive sync, Audio/Podcast) documentada no brainstorm
