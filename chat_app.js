const express = require('express');
const app = express();
const port = 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Página principal do Gabi Chat
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Gabi Chat - Multi-Agentes</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: #0B0C0E;
                color: #EEF1F6;
                min-height: 100vh;
                display: flex;
                flex-direction: column;
            }
            
            .header {
                background: #111317;
                padding: 1rem 2rem;
                border-bottom: 1px solid #1B2030;
                display: flex;
                align-items: center;
                gap: 1rem;
            }
            
            .logo {
                font-size: 1.5rem;
                font-weight: 500;
                color: #EEF1F6;
            }
            
            .logo .dot {
                color: #00ADE8;
            }
            
            .main {
                flex: 1;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 2rem;
                text-align: center;
            }
            
            .welcome {
                max-width: 600px;
                margin-bottom: 2rem;
            }
            
            .welcome h1 {
                font-size: 2.5rem;
                margin-bottom: 1rem;
                color: #EEF1F6;
            }
            
            .welcome p {
                font-size: 1.2rem;
                color: #A1A1AA;
                line-height: 1.6;
                margin-bottom: 2rem;
            }
            
            .status-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 1rem;
                margin-top: 2rem;
            }
            
            .status-card {
                background: #111317;
                border: 1px solid #1B2030;
                border-radius: 8px;
                padding: 1.5rem;
                text-align: center;
            }
            
            .status-card h3 {
                color: #00ADE8;
                margin-bottom: 0.5rem;
            }
            
            .status-card p {
                color: #A1A1AA;
                font-size: 0.9rem;
            }
            
            .status-online {
                color: #22C55E;
            }
            
            .footer {
                background: #111317;
                padding: 1rem 2rem;
                border-top: 1px solid #1B2030;
                text-align: center;
                color: #A1A1AA;
                font-size: 0.9rem;
            }
        </style>
    </head>
    <body>
        <header class="header">
            <div class="logo">Gabi<span class="dot">.</span></div>
        </header>
        
        <main class="main">
            <div class="welcome">
                <h1>Bem-vindo ao Gabi Chat</h1>
                <p>Chat multi-agentes baseado no padrão BMAD e tecnologia Agno. Interface original com customizações de estilo ness.</p>
                
                <div class="status-grid">
                    <div class="status-card">
                        <h3 class="status-online">🟢 Gabi OS</h3>
                        <p>AgentOS Runtime</p>
                        <p>Porta 7777</p>
                    </div>
                    
                    <div class="status-card">
                        <h3 class="status-online">🟢 Gabi Ingest</h3>
                        <p>Worker de Processamento</p>
                        <p>Porta 8000</p>
                    </div>
                    
                    <div class="status-card">
                        <h3 class="status-online">🟢 Gabi Chat</h3>
                        <p>Interface Next.js</p>
                        <p>Porta 3000</p>
                    </div>
                </div>
            </div>
        </main>
        
        <footer class="footer">
            <p>Gabi - Chat multi-agentes | Desenvolvido com BMAD e Agno SDK</p>
        </footer>
    </body>
    </html>
  `);
});

// API endpoints
app.get('/api/health', (req, res) => {
  res.json({ 
    service: 'Gabi Chat', 
    status: 'healthy',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/services', (req, res) => {
  res.json({
    services: [
      {
        name: 'gabi-os',
        url: process.env.NEXT_PUBLIC_AGENTOS_URL || 'http://gabi-os:7777',
        status: 'connected'
      },
      {
        name: 'gabi-ingest', 
        url: process.env.NEXT_PUBLIC_INGEST_URL || 'http://gabi-ingest:8000',
        status: 'connected'
      }
    ]
  });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Gabi Chat rodando na porta ${port}`);
});
