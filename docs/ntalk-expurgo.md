# Expurgo do nTalk

Este documento registra a remocao do modulo `ntalk` da superficie ativa da aplicacao.

## O que foi removido

- O backend deixou de expor rotas `/api/ntalk`
- O modulo `ntalk` foi removido do roteamento principal
- O provisionamento padrao deixou de incluir `ntalk`
- A autorizacao padrao deixou de conceder `ntalk`
- Os arquivos do modulo em `api/app/modules/ntalk/` foram removidos

## Arquivos ajustados

- [`api/app/main.py`](/home/resper/Gabi/api/app/main.py)
- [`api/app/core/auth.py`](/home/resper/Gabi/api/app/core/auth.py)
- [`api/app/modules/admin/schemas.py`](/home/resper/Gabi/api/app/modules/admin/schemas.py)
- [`api/app/modules/org/router.py`](/home/resper/Gabi/api/app/modules/org/router.py)
- [`api/app/modules/platform/router.py`](/home/resper/Gabi/api/app/modules/platform/router.py)
- [`api/app/models/user.py`](/home/resper/Gabi/api/app/models/user.py)
- [`api/app/models/org.py`](/home/resper/Gabi/api/app/models/org.py)
- [`web/src/contexts/chat-context.tsx`](/home/resper/Gabi/web/src/contexts/chat-context.tsx)

## Arquivos removidos

- `api/app/modules/ntalk/router.py`
- `api/app/modules/ntalk/service.py`
- `api/app/modules/ntalk/schemas.py`

## O que ainda ficou como legado

- Referencias historicas em `docs/`, `tests/` e migrations
- Uso interno do nome `ntalk` como alias de modelo rapido em partes do core
- Comentarios e descricoes antigas em alguns pontos do codigo

## Proximo passo recomendado

Fazer um segundo passe para eliminar o alias interno `ntalk` do core e limpar referencias legadas em documentacao, testes e schemas historicos.
