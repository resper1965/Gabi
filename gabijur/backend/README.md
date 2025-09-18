# Internacionalização (i18n) do Backend

O backend do GabiJur utiliza [i18next](https://www.i18next.com/) para internacionalização de mensagens de erro, sucesso e validação.

## Como funciona
- O idioma é detectado automaticamente via header, querystring ou cookie.
- Mensagens são centralizadas em arquivos de tradução na pasta `/locales`.
- Use `req.t('chave')` nas rotas para retornar mensagens traduzidas.

## Estrutura de Tradução
```
backend/
  locales/
    en-US/
      translation.json
    pt-BR/
      translation.json
    es/
      translation.json
```

## Como adicionar um novo idioma
1. Crie uma nova pasta em `locales` com o código do idioma (ex: `fr` para francês).
2. Copie o arquivo `translation.json` de outro idioma e traduza as chaves.
3. Adicione o novo idioma no preload da configuração do i18next em `src/app.js`.

## Exemplo de uso em rota
```js
router.get('/test-i18n', (req, res) => {
  return res.json({
    message: req.t('success.created'),
    error: req.t('error.not_found')
  });
});
```

## Dúvidas?
Abra uma issue ou entre em contato pelo e-mail gabijur@exemplo.com. 