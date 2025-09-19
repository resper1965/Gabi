#!/usr/bin/env node
/**
 * Gabi Control Panel - Dashboard de gerenciamento
 * Interface para monitorar e controlar todos os serviços do Gabi
 */

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const Docker = require('dockerode');
const WebSocket = require('ws');

const app = express();
const PORT = process.env.PORT || 9000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Docker client
const docker = new Docker({ socketPath: '/var/run/docker.sock' });

// Serviços do Gabi
const GABI_SERVICES = [
  { name: 'gabi-db', port: 5432, health: '/health', type: 'database' },
  { name: 'gabi-redis', port: 6379, health: '/health', type: 'cache' },
  { name: 'gabi-os', port: 7777, health: '/health', type: 'runtime' },
  { name: 'gabi-chat', port: 3000, health: '/api/health', type: 'frontend' },
  { name: 'gabi-ingest', port: 8000, health: '/health', type: 'worker' },
  { name: 'gabi-traefik', port: 8080, health: '/ping', type: 'proxy' }
];

// Status dos serviços
let servicesStatus = {};

// Função para verificar status de um serviço
async function checkServiceStatus(service) {
  try {
    const response = await axios.get(`http://localhost:${service.port}${service.health}`, {
      timeout: 5000
    });
    return {
      name: service.name,
      status: 'healthy',
      uptime: response.data.uptime || 'unknown',
      lastCheck: new Date().toISOString(),
      type: service.type
    };
  } catch (error) {
    return {
      name: service.name,
      status: 'unhealthy',
      error: error.message,
      lastCheck: new Date().toISOString(),
      type: service.type
    };
  }
}

// Verificar status de todos os serviços
async function checkAllServices() {
  const promises = GABI_SERVICES.map(checkServiceStatus);
  const results = await Promise.all(promises);
  
  results.forEach(result => {
    servicesStatus[result.name] = result;
  });
  
  return servicesStatus;
}

// Rotas da API
app.get('/api/status', async (req, res) => {
  try {
    const status = await checkAllServices();
    res.json({
      timestamp: new Date().toISOString(),
      services: status,
      summary: {
        total: Object.keys(status).length,
        healthy: Object.values(status).filter(s => s.status === 'healthy').length,
        unhealthy: Object.values(status).filter(s => s.status === 'unhealthy').length
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/containers', async (req, res) => {
  try {
    const containers = await docker.listContainers({ all: true });
    const gabiContainers = containers.filter(container => 
      container.Names.some(name => name.includes('gabi'))
    );
    
    res.json({
      containers: gabiContainers.map(container => ({
        id: container.Id,
        name: container.Names[0].replace('/', ''),
        status: container.State,
        image: container.Image,
        ports: container.Ports,
        created: container.Created
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/containers/:id/start', async (req, res) => {
  try {
    const container = docker.getContainer(req.params.id);
    await container.start();
    res.json({ message: 'Container started successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/containers/:id/stop', async (req, res) => {
  try {
    const container = docker.getContainer(req.params.id);
    await container.stop();
    res.json({ message: 'Container stopped successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/containers/:id/restart', async (req, res) => {
  try {
    const container = docker.getContainer(req.params.id);
    await container.restart();
    res.json({ message: 'Container restarted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Página principal
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gabi Control Panel</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: #333;
        }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { 
            text-align: center; 
            color: white; 
            margin-bottom: 30px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        .header h1 { font-size: 2.5em; margin-bottom: 10px; }
        .header p { font-size: 1.2em; opacity: 0.9; }
        .dashboard { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); 
            gap: 20px; 
        }
        .card { 
            background: white; 
            border-radius: 10px; 
            padding: 20px; 
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            transition: transform 0.2s;
        }
        .card:hover { transform: translateY(-2px); }
        .card h3 { 
            color: #667eea; 
            margin-bottom: 15px; 
            display: flex; 
            align-items: center; 
            gap: 10px;
        }
        .status { 
            display: inline-block; 
            padding: 4px 8px; 
            border-radius: 4px; 
            font-size: 0.8em; 
            font-weight: bold;
        }
        .status.healthy { background: #d4edda; color: #155724; }
        .status.unhealthy { background: #f8d7da; color: #721c24; }
        .service { 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            padding: 10px 0; 
            border-bottom: 1px solid #eee;
        }
        .service:last-child { border-bottom: none; }
        .btn { 
            background: #667eea; 
            color: white; 
            border: none; 
            padding: 8px 16px; 
            border-radius: 4px; 
            cursor: pointer; 
            margin: 2px;
        }
        .btn:hover { background: #5a6fd8; }
        .btn.danger { background: #dc3545; }
        .btn.danger:hover { background: #c82333; }
        .summary { 
            background: linear-gradient(45deg, #667eea, #764ba2);
            color: white;
            text-align: center;
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 20px;
        }
        .loading { text-align: center; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎛️ Gabi Control Panel</h1>
            <p>Dashboard de gerenciamento do ecossistema Gabi</p>
        </div>
        
        <div class="summary" id="summary">
            <div class="loading">Carregando status dos serviços...</div>
        </div>
        
        <div class="dashboard" id="dashboard">
            <div class="loading">Carregando...</div>
        </div>
    </div>

    <script>
        async function loadStatus() {
            try {
                const response = await fetch('/api/status');
                const data = await response.json();
                
                // Atualizar summary
                document.getElementById('summary').innerHTML = \`
                    <h2>📊 Resumo do Sistema</h2>
                    <p>Total: \${data.summary.total} | Saudáveis: \${data.summary.healthy} | Com problemas: \${data.summary.unhealthy}</p>
                    <small>Última atualização: \${new Date(data.timestamp).toLocaleString()}</small>
                \`;
                
                // Atualizar dashboard
                const dashboard = document.getElementById('dashboard');
                dashboard.innerHTML = Object.values(data.services).map(service => \`
                    <div class="card">
                        <h3>
                            \${getServiceIcon(service.type)} \${service.name}
                            <span class="status \${service.status}">\${service.status}</span>
                        </h3>
                        <div class="service">
                            <span>Tipo: \${service.type}</span>
                            <span>Porta: \${getServicePort(service.name)}</span>
                        </div>
                        <div class="service">
                            <span>Última verificação:</span>
                            <span>\${new Date(service.lastCheck).toLocaleTimeString()}</span>
                        </div>
                        \${service.error ? \`<div style="color: #dc3545; font-size: 0.9em; margin-top: 10px;">\${service.error}</div>\` : ''}
                    </div>
                \`).join('');
                
            } catch (error) {
                document.getElementById('dashboard').innerHTML = \`
                    <div class="card">
                        <h3>❌ Erro</h3>
                        <p>Não foi possível carregar o status dos serviços: \${error.message}</p>
                    </div>
                \`;
            }
        }
        
        function getServiceIcon(type) {
            const icons = {
                'database': '🗄️',
                'cache': '⚡',
                'runtime': '🤖',
                'frontend': '💻',
                'worker': '⚙️',
                'proxy': '🌐'
            };
            return icons[type] || '📦';
        }
        
        function getServicePort(name) {
            const ports = {
                'gabi-db': 5432,
                'gabi-redis': 6379,
                'gabi-os': 7777,
                'gabi-chat': 3000,
                'gabi-ingest': 8000,
                'gabi-traefik': 8080
            };
            return ports[name] || 'N/A';
        }
        
        // Carregar status inicial
        loadStatus();
        
        // Atualizar a cada 30 segundos
        setInterval(loadStatus, 30000);
    </script>
</body>
</html>
  `);
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🎛️ Gabi Control Panel rodando na porta ${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}`);
});

// Verificar status inicial
checkAllServices();
