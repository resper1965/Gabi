# Bugs da Codebase

1. `High` Falta de autorizacao efetiva por modulo nos endpoints principais.
Os modulos expoem rotas sensiveis usando apenas `get_current_user`, sem aplicar `require_module("law")`, `require_module("ntalk")` ou equivalente. Isso aparece em [`api/app/modules/law/router.py`](/home/resper/Gabi/api/app/modules/law/router.py#L143) e [`api/app/modules/ntalk/router.py`](/home/resper/Gabi/api/app/modules/ntalk/router.py#L191), enquanto a checagem correta existe em [`api/app/core/auth.py`](/home/resper/Gabi/api/app/core/auth.py#L275). Resultado: usuario autenticado pode acessar modulo nao provisionado.

2. `High` Cache do RAG pode servir resultado de outro contexto logico.
A chave de cache usa apenas `module`, `user_id` e `refined_query` em [`api/app/core/dynamic_rag.py`](/home/resper/Gabi/api/app/core/dynamic_rag.py#L281). O resultado, porem, tambem depende de `profile_id`, `scope` e filtros de ownership aplicados depois em [`api/app/core/dynamic_rag.py`](/home/resper/Gabi/api/app/core/dynamic_rag.py#L299). Isso pode retornar chunks errados para outra persona, outro escopo ou outra configuracao de busca.

3. `High` Contabilizacao de tokens/custo e global ao processo e sujeita a mistura entre requests.
A fila `_usage_queue` e um estado global de modulo em [`api/app/core/ai.py`](/home/resper/Gabi/api/app/core/ai.py#L25). Em ambiente concorrente, chamadas simultaneas podem misturar consumo de usuarios diferentes antes do flush. Isso compromete auditoria de custo por usuario e por organizacao.

4. `High` Tracking de tokens aparentemente nunca e persistido.
A funcao `flush_token_usage()` existe em [`api/app/core/ai.py`](/home/resper/Gabi/api/app/core/ai.py#L50), mas nao ha uso dela no codigo encontrado. Na pratica, o sistema coleta consumo em memoria, mas provavelmente nao grava nada no banco.

5. `Medium` Migracao de schema executada no boot da aplicacao.
O app executa `ALTER TABLE users ADD COLUMN IF NOT EXISTS org_id` no startup em [`api/app/main.py`](/home/resper/Gabi/api/app/main.py#L49). Isso nao e so divida tecnica: pode criar comportamento inconsistente entre ambientes, mascarar migrations faltantes e falhar silenciosamente em producao se permissoes do banco mudarem.

6. `Medium` `TrustedHostMiddleware` e importado mas nao aplicado.
Ele e importado em [`api/app/main.py`](/home/resper/Gabi/api/app/main.py#L11) e nunca usado. Isso indica protecao planejada, mas ausente. Nao e quebra funcional imediata, mas e gap de hardening no ponto de entrada HTTP.

7. `Medium` Upload em lote processa arquivos serialmente chamando a propria rota interna.
Em [`api/app/modules/law/router.py`](/home/resper/Gabi/api/app/modules/law/router.py#L101), `upload_batch()` chama `upload_document()` dentro de um loop. Isso aumenta latencia total, dificulta controle fino de erro/transacao e pode degradar bastante em lotes maiores.

8. `Medium` Rate limit protege algumas rotas criticas, mas nao o modulo inteiro.
Ha `check_rate_limit()` em [`api/app/modules/law/router.py`](/home/resper/Gabi/api/app/modules/law/router.py#L149) e [`api/app/modules/ntalk/router.py`](/home/resper/Gabi/api/app/modules/ntalk/router.py#L327), mas uploads, listagens e outras operacoes custosas ficam fora. O desenho e parcial e facil de contornar por rotas alternativas.

9. `Low` Ingestao declara suporte a XLSX, mas o fluxo principal nao trata esse tipo explicitamente.
O docstring de [`api/app/core/ingest.py`](/home/resper/Gabi/api/app/core/ingest.py#L1) fala em suporte a XLSX, mas `extract_text()` em [`api/app/core/ingest.py`](/home/resper/Gabi/api/app/core/ingest.py#L46) nao possui ramo para `.xlsx`; so existe um parser separado `parse_claims_xlsx()`. Isso cria expectativa incorreta de suporte generico.

10. `Low` Dependencia excessiva de fallback permissivo no parsing de arquivos.
Quando o tipo nao e reconhecido, `extract_text()` faz decode bruto como texto em [`api/app/core/ingest.py`](/home/resper/Gabi/api/app/core/ingest.py#L58). Isso pode gerar lixo textual indexado sem erro explicito, piorando qualidade do RAG e dificultando diagnostico.
