const i18next = require('i18next');
const i18nextMiddleware = require('i18next-http-middleware');
const Backend = require('i18next-fs-backend');

// Configuração do i18next

i18next
  .use(Backend)
  .use(i18nextMiddleware.LanguageDetector)
  .init({
    fallbackLng: 'en-US',
    preload: ['en-US', 'pt-BR', 'es'],
    backend: {
      loadPath: __dirname + '/../locales/{{lng}}/translation.json',
    },
    detection: {
      order: ['header', 'querystring', 'cookie'],
      caches: ['cookie'],
    },
    debug: false,
  });

app.use(i18nextMiddleware.handle(i18next)); 