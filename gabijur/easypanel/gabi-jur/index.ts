import { defineTemplate } from '@easypanel/template'

export default defineTemplate({
  name: 'GabiJur',
  description: 'Plataforma de agentes inteligentes para o setor jurídico, baseada em IA, multiidioma e pronta para produção.',
  services: [
    {
      type: 'docker',
      name: 'backend',
      build: './backend',
      envFile: './backend/.env',
      ports: ['18000:8000'],
      dependsOn: ['postgres', 'redis'],
    },
    {
      type: 'docker',
      name: 'frontend',
      build: './frontend',
      envFile: './frontend/.env',
      ports: ['13000:3000'],
      dependsOn: ['backend'],
    },
    {
      type: 'docker',
      name: 'postgres',
      image: 'postgres:15',
      environment: {
        POSTGRES_USER: 'user',
        POSTGRES_PASSWORD: 'password',
        POSTGRES_DB: 'gabijur',
      },
      ports: ['15432:5432'],
      volumes: ['db_data:/var/lib/postgresql/data'],
    },
    {
      type: 'docker',
      name: 'redis',
      image: 'redis:7',
      ports: ['16379:6379'],
      volumes: ['redis_data:/data'],
    },
  ],
  volumes: ['db_data', 'redis_data'],
  env: [
    { name: 'POSTGRES_CONNECTION_STRING', required: true },
    { name: 'REDIS_HOST', required: true },
    { name: 'REDIS_PORT', required: true },
    { name: 'JWT_SECRET_KEY', required: true },
    { name: 'NEXT_PUBLIC_API_URL', required: true },
  ],
  logo: 'logo.png',
  screenshot: 'screenshot.png',
}) 