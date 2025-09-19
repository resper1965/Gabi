# Padrões de Código - Gabi

## 1. Frontend (TypeScript/React)

### 1.1 Estrutura de Arquivos
```
src/
├── app/                    # App Router (Next.js 14+)
│   ├── (auth)/            # Route groups
│   ├── chat/              # Feature-based routing
│   └── layout.tsx         # Root layout
├── components/            # Componentes reutilizáveis
│   ├── ui/                # Componentes base
│   ├── chat/              # Componentes específicos
│   └── index.ts           # Barrel exports
├── lib/                   # Utilitários e configurações
├── hooks/                 # Custom hooks
├── types/                 # Definições TypeScript
└── constants/             # Constantes da aplicação
```

### 1.2 Convenções de Nomenclatura
```typescript
// Componentes: PascalCase
export const ChatMessage = () => {};

// Hooks: camelCase com prefixo 'use'
export const useChatMessages = () => {};

// Funções: camelCase
export const formatMessage = (message: string) => {};

// Constantes: UPPER_SNAKE_CASE
export const MAX_AGENTS_PER_SESSION = 3;

// Tipos: PascalCase
export interface ChatMessage {
  id: string;
  content: string;
  timestamp: Date;
}

// Enums: PascalCase
export enum MessageType {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system'
}
```

### 1.3 Componentes React
```typescript
// Componente funcional com TypeScript
interface ChatMessageProps {
  message: ChatMessage;
  isOwn: boolean;
  onEdit?: (id: string) => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  isOwn,
  onEdit
}) => {
  // Hooks no topo
  const [isEditing, setIsEditing] = useState(false);
  
  // Handlers
  const handleEdit = useCallback(() => {
    setIsEditing(true);
    onEdit?.(message.id);
  }, [message.id, onEdit]);
  
  // Render
  return (
    <div className={cn(
      "flex gap-3",
      isOwn ? "justify-end" : "justify-start"
    )}>
      {/* JSX */}
    </div>
  );
};
```

### 1.4 Hooks Customizados
```typescript
// Hook para gerenciar estado de chat
export const useChatMessages = (sessionId: string) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const sendMessage = useCallback(async (content: string) => {
    setIsLoading(true);
    try {
      const response = await api.chat.sendMessage({
        sessionId,
        content
      });
      setMessages(prev => [...prev, response.message]);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);
  
  return {
    messages,
    isLoading,
    sendMessage
  };
};
```

### 1.5 Customizações de Estilo
```typescript
// Manter componentes originais, apenas customizar cores
// Aplicar paleta ness: #0B0C0E, #111317, #151820, #1B2030, #EEF1F6, #00ADE8
// Tipografia: Montserrat Medium para títulos

// Exemplo de customização mínima
const nessColors = {
  background: '#0B0C0E',
  surface: '#111317',
  text: '#EEF1F6',
  accent: '#00ADE8'
};

// Aplicar apenas em CSS customizado, não modificar componentes originais
```

## 2. Backend (Python/FastAPI)

### 2.1 Estrutura de Arquivos
```
src/
├── main.py                # Entrypoint
├── api/                   # API endpoints
│   ├── __init__.py
│   ├── auth.py
│   ├── chat.py
│   └── agents.py
├── core/                  # Lógica de negócio
│   ├── __init__.py
│   ├── agents/
│   ├── chat/
│   └── knowledge/
├── models/                # Modelos de dados
│   ├── __init__.py
│   ├── user.py
│   └── chat.py
├── services/              # Serviços de negócio
│   ├── __init__.py
│   ├── agent_service.py
│   └── chat_service.py
├── utils/                 # Utilitários
│   ├── __init__.py
│   ├── security.py
│   └── validators.py
└── config/                # Configurações
    ├── __init__.py
    ├── settings.py
    └── database.py
```

### 2.2 Convenções de Nomenclatura
```python
# Classes: PascalCase
class ChatService:
    pass

# Funções e variáveis: snake_case
def send_message(message_content: str) -> ChatMessage:
    pass

# Constantes: UPPER_SNAKE_CASE
MAX_AGENTS_PER_SESSION = 3

# Módulos: snake_case
# chat_service.py
# agent_manager.py
```

### 2.3 Modelos de Dados
```python
from sqlalchemy import Column, String, DateTime, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

Base = declarative_base()

# SQLAlchemy Model
class ChatMessage(Base):
    __tablename__ = "chat_messages"
    
    id = Column(String, primary_key=True)
    session_id = Column(String, nullable=False, index=True)
    content = Column(Text, nullable=False)
    message_type = Column(String, nullable=False)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

# Pydantic Model
class ChatMessageCreate(BaseModel):
    session_id: str = Field(..., min_length=1)
    content: str = Field(..., min_length=1, max_length=4000)
    message_type: str = Field(..., regex="^(user|assistant|system)$")

class ChatMessageResponse(BaseModel):
    id: str
    session_id: str
    content: str
    message_type: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
```

### 2.4 API Endpoints
```python
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer
from typing import List

router = APIRouter(prefix="/api/v1/chat", tags=["chat"])
security = HTTPBearer()

@router.post("/messages", response_model=ChatMessageResponse)
async def create_message(
    message_data: ChatMessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> ChatMessageResponse:
    """
    Criar nova mensagem de chat.
    
    Args:
        message_data: Dados da mensagem
        current_user: Usuário autenticado
        db: Sessão do banco de dados
        
    Returns:
        Mensagem criada
        
    Raises:
        HTTPException: Se houver erro na criação
    """
    try:
        message = await chat_service.create_message(
            message_data=message_data,
            user_id=current_user.id,
            db=db
        )
        return ChatMessageResponse.from_orm(message)
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to create message: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )
```

### 2.5 Serviços de Negócio
```python
from typing import Optional, List
from sqlalchemy.orm import Session
from models.chat import ChatMessage
from services.base_service import BaseService

class ChatService(BaseService):
    def __init__(self, db: Session):
        super().__init__(db)
    
    async def create_message(
        self,
        message_data: ChatMessageCreate,
        user_id: str
    ) -> ChatMessage:
        """Criar nova mensagem de chat."""
        message = ChatMessage(
            id=generate_uuid(),
            session_id=message_data.session_id,
            content=message_data.content,
            message_type=message_data.message_type,
            user_id=user_id
        )
        
        self.db.add(message)
        self.db.commit()
        self.db.refresh(message)
        
        # Notificar via WebSocket
        await self._notify_message_created(message)
        
        return message
    
    async def get_messages(
        self,
        session_id: str,
        limit: int = 50,
        offset: int = 0
    ) -> List[ChatMessage]:
        """Buscar mensagens de uma sessão."""
        return (
            self.db.query(ChatMessage)
            .filter(ChatMessage.session_id == session_id)
            .order_by(ChatMessage.created_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )
    
    async def _notify_message_created(self, message: ChatMessage) -> None:
        """Notificar criação de mensagem via WebSocket."""
        # Implementar notificação WebSocket
        pass
```

## 3. Banco de Dados

### 3.1 Migrations
```python
# migrations/versions/001_create_chat_messages.py
from alembic import op
import sqlalchemy as sa

def upgrade():
    op.create_table(
        'chat_messages',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('session_id', sa.String(), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('message_type', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_chat_messages_session_id', 'chat_messages', ['session_id'])

def downgrade():
    op.drop_index('ix_chat_messages_session_id', table_name='chat_messages')
    op.drop_table('chat_messages')
```

### 3.2 Queries Otimizadas
```python
# Usar eager loading para evitar N+1
def get_session_with_messages(session_id: str) -> Optional[ChatSession]:
    return (
        db.query(ChatSession)
        .options(joinedload(ChatSession.messages))
        .filter(ChatSession.id == session_id)
        .first()
    )

# Usar índices para performance
def search_messages(query: str, limit: int = 20) -> List[ChatMessage]:
    return (
        db.query(ChatMessage)
        .filter(ChatMessage.content.ilike(f"%{query}%"))
        .order_by(ChatMessage.created_at.desc())
        .limit(limit)
        .all()
    )
```

## 4. Testes

### 4.1 Testes Frontend (Jest)
```typescript
// __tests__/components/ChatMessage.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatMessage } from '@/components/chat/ChatMessage';

const mockMessage = {
  id: '1',
  content: 'Hello world',
  messageType: 'user',
  createdAt: new Date(),
  updatedAt: new Date()
};

describe('ChatMessage', () => {
  it('renders message content', () => {
    render(<ChatMessage message={mockMessage} isOwn={false} />);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });
  
  it('calls onEdit when edit button is clicked', () => {
    const onEdit = jest.fn();
    render(<ChatMessage message={mockMessage} isOwn={true} onEdit={onEdit} />);
    
    fireEvent.click(screen.getByRole('button', { name: /edit/i }));
    expect(onEdit).toHaveBeenCalledWith('1');
  });
});
```

### 4.2 Testes Backend (pytest)
```python
# tests/test_chat_service.py
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from main import app
from models.database import Base

SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture
def db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)

@pytest.fixture
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            db.close()
    
    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()

def test_create_message(client, db):
    response = client.post(
        "/api/v1/chat/messages",
        json={
            "session_id": "test-session",
            "content": "Hello world",
            "message_type": "user"
        }
    )
    assert response.status_code == 201
    assert response.json()["content"] == "Hello world"
```

## 5. Documentação

### 5.1 Docstrings Python
```python
def create_agent(
    name: str,
    description: str,
    model_config: dict,
    user_id: str
) -> Agent:
    """
    Criar novo agente para o usuário.
    
    Args:
        name: Nome do agente (único por usuário)
        description: Descrição do agente
        model_config: Configuração do modelo de IA
        user_id: ID do usuário proprietário
        
    Returns:
        Agente criado
        
    Raises:
        ValidationError: Se os dados forem inválidos
        DuplicateError: Se já existir agente com mesmo nome
        
    Example:
        >>> agent = create_agent(
        ...     name="Assistant",
        ...     description="Helpful assistant",
        ...     model_config={"model": "gpt-4"},
        ...     user_id="user-123"
        ... )
    """
    pass
```

### 5.2 Comentários TypeScript
```typescript
/**
 * Hook para gerenciar estado de chat em tempo real
 * 
 * @param sessionId - ID da sessão de chat
 * @returns Objeto com mensagens, estado de loading e função para enviar mensagem
 * 
 * @example
 * ```tsx
 * const { messages, isLoading, sendMessage } = useChatMessages('session-123');
 * 
 * const handleSend = () => {
 *   sendMessage('Hello world');
 * };
 * ```
 */
export const useChatMessages = (sessionId: string) => {
  // Implementation
};
```

## 6. Git e Versionamento

### 6.1 Conventional Commits
```
feat: adicionar sistema de autenticação
fix: corrigir bug no roteamento de mensagens
docs: atualizar documentação da API
style: formatar código com prettier
refactor: refatorar serviço de chat
test: adicionar testes para componentes
chore: atualizar dependências
```

### 6.2 Branch Strategy
```
main                    # Produção
├── develop            # Desenvolvimento
├── feature/auth       # Features
├── bugfix/chat-123    # Bug fixes
└── hotfix/security    # Hot fixes
```

## 7. Code Review

### 7.1 Checklist
- [ ] Código segue padrões definidos
- [ ] Testes passam
- [ ] Documentação atualizada
- [ ] Performance considerada
- [ ] Segurança verificada
- [ ] Acessibilidade mantida

### 7.2 Guidelines
- Reviews devem ser aprovados por pelo menos 2 pessoas
- Feedback deve ser construtivo e específico
- Discussões técnicas devem ser documentadas
- Merge apenas após aprovação e CI/CD verde
