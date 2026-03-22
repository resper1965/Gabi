# Data Classification Matrix

> Gabi Hub · classificacao alinhada ao runtime atual · 2026-03-22

## Niveis

| Nivel | Definicao | Exemplo de controle |
|-------|-----------|---------------------|
| `PUBLIC` | Conteudo publico ou institucional | acesso sem autenticacao |
| `INTERNAL` | Dado operacional interno | acesso autenticado e restrito por funcao |
| `CONFIDENTIAL` | Dado de negocio ou conteudo de cliente | isolamento por usuario/org e trilha de auditoria |
| `RESTRICTED` | PII, credenciais, textos sensiveis e conteudo sigiloso | minimo privilegio, logs, retencao e resposta a incidente |

---

## Escopo Atual da Aplicacao

A superficie ativa do produto esta centrada em:

- `law`
- writer/style integrado ao `law`
- admin/org/platform
- chat persistido
- LGPD e auth

Nao ha modulo publico `ntalk`.

---

## Classificacao por Dominio

### Identidade, acesso e organizacao

| Tabela / Dominio | Dados principais | Nivel |
|------------------|------------------|-------|
| `users` | email, nome, firebase uid, papel, status | `RESTRICTED` |
| `organizations` | identificadores organizacionais, plano, dominio | `CONFIDENTIAL` |
| `org_members` | vinculo usuario-organizacao | `CONFIDENTIAL` |
| `org_modules` | habilitacao de modulo | `INTERNAL` |
| `org_usage`, `org_sessions` | consumo, atividade e sessao | `CONFIDENTIAL` |
| `token_usage` | custo, modelo, consumo por usuario/org | `CONFIDENTIAL` |

### Chat e historico

| Tabela / Dominio | Dados principais | Nivel |
|------------------|------------------|-------|
| `chat_sessions` | titulo, modulo, metadados de conversa | `CONFIDENTIAL` |
| `chat_messages` | texto das mensagens, contexto e metadados | `RESTRICTED` |

### Base juridica do usuario

| Tabela / Dominio | Dados principais | Nivel |
|------------------|------------------|-------|
| `law_documents` | contratos, pecas, politicas, opinioes, texto e metadados | `RESTRICTED` |
| `law_chunks` | fragmentos de documento e embeddings | `CONFIDENTIAL` |
| `law_alerts` | alertas regulatorios vinculados ao usuario | `CONFIDENTIAL` |
| `law_gap_analyses` | achados e sugestoes de compliance | `CONFIDENTIAL` |

### Corpus regulatorio compartilhado

| Tabela / Dominio | Dados principais | Nivel |
|------------------|------------------|-------|
| `legal_documents` | referencias normativas, URL canonica, tipo de ato | `INTERNAL` |
| `legal_versions` | versoes capturadas e metadados de parsing | `INTERNAL` |
| `legal_provisions` | dispositivos estruturados e embeddings | `INTERNAL` |

### Writer/style integrado ao `law`

| Tabela / Dominio | Dados principais | Nivel |
|------------------|------------------|-------|
| `ghost_style_profiles` | assinatura de estilo, exemplares, system prompt | `RESTRICTED` |
| `ghost_knowledge_docs` | documentos associados ao perfil de estilo | `CONFIDENTIAL` |
| `ghost_doc_chunks` | chunks e embeddings de writer/style | `CONFIDENTIAL` |

Nota: os nomes `ghost_*` sao legados de banco e nao representam um modulo publico ativo.

### Admin e compliance

| Dominio | Dados principais | Nivel |
|---------|------------------|-------|
| LGPD export/purge | pacote de exportacao de dados do titular | `RESTRICTED` |
| observabilidade operacional | erros, consumo, saude, correlacao | `CONFIDENTIAL` |
| analytics agregados | contagens, uso consolidado, tendencias | `INTERNAL` |

---

## Credenciais e Segredos

| Segredo | Nivel | Armazenamento esperado |
|---------|-------|------------------------|
| `DATABASE_URL` | `RESTRICTED` | Secret Manager / runtime secret |
| `FIREBASE_*` service account | `RESTRICTED` | Secret Manager |
| credenciais Vertex AI / IAM | `RESTRICTED` | IAM / workload identity / secret controlado |
| segredos de sessao e chaves internas | `RESTRICTED` | Secret Manager |

---

## Regras de Tratamento

- dados `RESTRICTED` nao devem aparecer em logs de aplicacao
- embeddings de conteudo do cliente devem ser tratados como derivados sensiveis
- exportacao LGPD deve cobrir os dados persistidos do usuario e de chat
- exclusao/purge deve considerar tambem dados derivados e historicos associados
- uploads inline efemeros de chat nao devem ser persistidos fora do fluxo explicitamente solicitado pelo usuario

---

## Legado Estrutural Relevante

Os pontos que ainda exigem atencao na classificacao:

- nomes de tabelas `ghost_*` ainda nao foram migrados para nomenclatura `law/style`
- docs antigas ainda tratam writer como modulo separado
- alguns artefatos historicos ainda usam taxonomia anterior de produto

Enquanto esse legado existir, a classificacao deve seguir o dado real persistido, nao o nome historico da feature.
