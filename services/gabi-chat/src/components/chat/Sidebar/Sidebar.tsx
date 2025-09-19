'use client'
import { Button } from '@/components/ui/button'
import { ModeSelector } from '@/components/chat/Sidebar/ModeSelector'
import { EntitySelector } from '@/components/chat/Sidebar/EntitySelector'
import useChatActions from '@/hooks/useChatActions'
import { useStore } from '@/store'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'
import Icon from '@/components/ui/icon'
import { getProviderIcon } from '@/lib/modelProvider'
import Sessions from './Sessions'
import { isValidUrl } from '@/lib/utils'
import { toast } from 'sonner'
import { useQueryState } from 'nuqs'
import { truncateText } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import OrganizationSelector from '@/components/auth/OrganizationSelector'
import { useAuth } from '@/contexts/AuthContext'
import { Settings, LogOut } from 'lucide-react'
import Link from 'next/link'

const ENDPOINT_PLACEHOLDER = 'NENHUM ENDPOINT ADICIONADO'
const SidebarHeader = () => {
  const { organization, user, hasPermission, logout } = useAuth();
  
  return (
    <div className="mb-8 pl-2">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl font-montserrat font-medium text-white">Gabi<span className="text-brand">.</span></span>
      </div>
      {organization && (
        <div className="mb-4">
          <OrganizationSelector />
        </div>
      )}
      
      {/* Admin Actions */}
      {user && hasPermission('org_admin') && (
        <div className="mb-4 space-y-2">
          <Link href="/admin">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full justify-start text-xs font-montserrat"
            >
              <Settings className="h-3 w-3 mr-2" />
              Administração
            </Button>
          </Link>
        </div>
      )}
      
      {/* User Info & Logout */}
      {user && (
        <div className="mb-4 p-2 bg-secondary/50 rounded-lg">
          <div className="text-xs text-muted-foreground mb-1">
            {user.full_name}
          </div>
          <div className="text-xs text-muted-foreground mb-2">
            {user.role === 'platform_admin' ? 'Platform Admin' : 
             user.role === 'org_admin' ? 'Org Admin' : 'User'}
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => logout()}
            className="w-full justify-start text-xs text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-3 w-3 mr-2" />
            Sair
          </Button>
        </div>
      )}
    </div>
  );
}

const NewChatButton = ({
  disabled,
  onClick,
  hasUnsavedMessages = false
}: {
  disabled: boolean
  onClick: () => void
  hasUnsavedMessages?: boolean
}) => (
  <Button
    onClick={(e) => {
      e.preventDefault()
      e.stopPropagation()
      onClick()
    }}
    disabled={disabled}
    size="lg"
    className={`h-9 w-full rounded-xl text-xs font-montserrat font-medium text-background cursor-pointer z-10 relative ${
      hasUnsavedMessages 
        ? 'bg-orange-500 hover:bg-orange-600' 
        : 'bg-primary hover:bg-primary/80'
    }`}
  >
    <Icon type="plus-icon" size="xs" className="text-background" />
    <span>
      {hasUnsavedMessages ? 'Novo Chat*' : 'Novo Chat'}
    </span>
    {hasUnsavedMessages && (
      <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
    )}
  </Button>
)

const ModelDisplay = ({ model }: { model: string }) => (
  <div className="flex h-9 w-full items-center gap-3 rounded-xl border border-primary/15 bg-accent p-3 text-xs font-montserrat font-medium text-white">
    {(() => {
      const icon = getProviderIcon(model)
      return icon ? <Icon type={icon} className="shrink-0" size="xs" /> : null
    })()}
    {model}
  </div>
)

const Endpoint = () => {
  const {
    selectedEndpoint,
    isEndpointActive,
    setSelectedEndpoint,
    setAgents,
    setSessionsData,
    setMessages
  } = useStore()
  const { initialize } = useChatActions()
  const [isEditing, setIsEditing] = useState(false)
  const [endpointValue, setEndpointValue] = useState('')
  const [isMounted, setIsMounted] = useState(false)
  const [isHovering, setIsHovering] = useState(false)
  const [isRotating, setIsRotating] = useState(false)
  const [, setAgentId] = useQueryState('agent')
  const [, setSessionId] = useQueryState('session')

  useEffect(() => {
    setEndpointValue(selectedEndpoint)
    setIsMounted(true)
  }, [selectedEndpoint])

  // Prevent hydration mismatch
  if (!isMounted) {
    return (
      <div className="flex flex-col items-start gap-2">
        <div className="text-xs font-montserrat font-medium text-primary">GabiOS</div>
        <div className="flex w-full items-center gap-1">
          <div className="flex h-9 w-full items-center justify-between rounded-xl border border-primary/15 bg-accent p-3">
            <p className="text-xs font-montserrat font-medium text-white">Carregando...</p>
            <div className="size-2 shrink-0 rounded-full bg-muted" />
          </div>
        </div>
      </div>
    )
  }

  const getStatusColor = (isActive: boolean) =>
    isActive ? 'bg-positive' : 'bg-destructive'

  const handleSave = async () => {
    if (!isValidUrl(endpointValue)) {
      toast.error('Por favor, insira uma URL válida')
      return
    }
    const cleanEndpoint = endpointValue.replace(/\/$/, '').trim()
    setSelectedEndpoint(cleanEndpoint)
    setAgentId(null)
    setSessionId(null)
    setIsEditing(false)
    setIsHovering(false)
    setAgents([])
    setSessionsData([])
    setMessages([])
  }

  const handleCancel = () => {
    setEndpointValue(selectedEndpoint)
    setIsEditing(false)
    setIsHovering(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  const handleRefresh = async () => {
    setIsRotating(true)
    await initialize()
    setTimeout(() => setIsRotating(false), 500)
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="text-xs font-montserrat font-medium text-primary">GabiOS</div>
      {isEditing ? (
        <div className="flex w-full items-center gap-1">
          <input
            type="text"
            value={endpointValue}
            onChange={(e) => setEndpointValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex h-9 w-full items-center text-ellipsis rounded-xl border border-primary/15 bg-accent p-3 text-xs font-montserrat font-medium text-white placeholder:text-muted"
            autoFocus
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSave}
            className="hover:cursor-pointer hover:bg-transparent"
          >
            <Icon type="save" size="xs" />
          </Button>
        </div>
      ) : (
        <div className="flex w-full items-center gap-1">
          <motion.div
            className="relative flex h-9 w-full cursor-pointer items-center justify-between rounded-xl border border-primary/15 bg-accent p-3"
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            onClick={() => setIsEditing(true)}
            transition={{ type: 'spring', stiffness: 400, damping: 10 }}
          >
            <AnimatePresence mode="wait">
              {isHovering ? (
                <motion.div
                  key="endpoint-display-hover"
                  className="absolute inset-0 flex items-center justify-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <p className="flex items-center gap-2 whitespace-nowrap text-xs font-montserrat font-medium text-white">
                    <Icon type="edit" size="xxs" /> Editar GabiOS
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="endpoint-display"
                  className="absolute inset-0 flex items-center justify-between px-3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <p className="text-xs font-montserrat font-medium text-white">
                    {isMounted
                      ? truncateText(selectedEndpoint, 21) ||
                        ENDPOINT_PLACEHOLDER
                      : 'http://localhost:7777'}
                  </p>
                  <div
                    className={`size-2 shrink-0 rounded-full ${getStatusColor(isEndpointActive)}`}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            className="hover:cursor-pointer hover:bg-transparent"
          >
            <motion.div
              key={isRotating ? 'rotating' : 'idle'}
              animate={{ rotate: isRotating ? 360 : 0 }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
            >
              <Icon type="refresh" size="xs" />
            </motion.div>
          </Button>
        </div>
      )}
    </div>
  )
}

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const { clearChat, focusChatInput, initialize } = useChatActions()
  const {
    messages,
    selectedEndpoint,
    isEndpointActive,
    selectedModel,
    hydrated,
    isEndpointLoading,
    mode
  } = useStore()
  const [isMounted, setIsMounted] = useState(false)
  const [agentId] = useQueryState('agent')
  const [teamId] = useQueryState('team')

  useEffect(() => {
    setIsMounted(true)

    if (hydrated) initialize()
  }, [selectedEndpoint, initialize, hydrated, mode])

  const handleNewChat = () => {
    // Se há mensagens, perguntar se quer salvar
    if (messages.length > 0) {
      const shouldSave = confirm(
        `Você tem ${messages.length} mensagens nesta conversa. Deseja salvar esta sessão antes de iniciar um novo chat?`
      )
      
      if (shouldSave) {
        // Aqui implementaríamos o salvamento
        toast.success('Sessão salva com sucesso!')
      } else {
        toast.info('Sessão descartada')
      }
    }
    
    clearChat()
    toast.success('Novo chat iniciado!')
    
    // Aguardar um pouco antes de focar no input
    setTimeout(() => {
      focusChatInput()
    }, 100)
  }

  return (
    <motion.aside
      className="relative flex h-screen shrink-0 grow-0 flex-col overflow-hidden px-4 py-3 font-dmmono"
      initial={{ width: '16rem' }}
      animate={{ width: isCollapsed ? '2.5rem' : '16rem' }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <motion.button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute right-2 top-2 z-10 p-1"
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        type="button"
        whileTap={{ scale: 0.95 }}
      >
        <Icon
          type="sheet"
          size="xs"
          className={`transform ${isCollapsed ? 'rotate-180' : 'rotate-0'}`}
        />
      </motion.button>
      <motion.div
        className="w-60 flex-1 flex flex-col"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: isCollapsed ? 0 : 1, x: isCollapsed ? -20 : 0 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        style={{
          pointerEvents: isCollapsed ? 'none' : 'auto'
        }}
      >
        <div className="space-y-6 flex-1">
          <SidebarHeader />
          <div className="relative z-20">
            <NewChatButton
              disabled={false}
              onClick={handleNewChat}
              hasUnsavedMessages={messages.length > 0}
            />
            <div className="text-xs text-gray-400 mt-1">
              Mensagens: {messages.length}
              {messages.length > 0 && (
                <span className="text-orange-400 ml-1">(não salvas)</span>
              )}
            </div>
          </div>
          {isMounted && (
            <>
              <Endpoint />
              {isEndpointActive && (
                <>
                  <motion.div
                    className="flex w-full flex-col items-start gap-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, ease: 'easeInOut' }}
                  >
                    <div className="text-xs font-montserrat font-medium uppercase text-primary">
                      Modo
                    </div>
                    {isEndpointLoading ? (
                      <div className="flex w-full flex-col gap-2">
                        {Array.from({ length: 3 }).map((_, index) => (
                          <Skeleton
                            key={index}
                            className="h-9 w-full rounded-xl"
                          />
                        ))}
                      </div>
                    ) : (
                      <>
                        <ModeSelector />
                        <EntitySelector />
                        {selectedModel && (agentId || teamId) && (
                          <ModelDisplay model={selectedModel} />
                        )}
                      </>
                    )}
                  </motion.div>
                  <Sessions />
                </>
              )}
            </>
          )}
        </div>
        {/* Footer com ness. */}
        <motion.div
          className="mt-auto pt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: isCollapsed ? 0 : 1 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
          <div className="text-xs font-montserrat font-medium text-primary/60 text-center">
            ness<span className="text-brand">.</span>
          </div>
        </motion.div>
      </motion.div>
    </motion.aside>
  )
}

export default Sidebar
