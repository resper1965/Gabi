import { useQueryState } from 'nuqs'
import { SessionEntry } from '@/types/os'
import { Button } from '../../../ui/button'
import useSessionLoader from '@/hooks/useSessionLoader'
import { deleteSessionAPI, renameSessionAPI } from '@/api/os'
import { useStore } from '@/store'
import { toast } from 'sonner'
import Icon from '@/components/ui/icon'
import { useState } from 'react'
import DeleteSessionModal from './DeleteSessionModal'
import RenameSessionModal from './RenameSessionModal'
import useChatActions from '@/hooks/useChatActions'
import { truncateText, cn } from '@/lib/utils'

type SessionItemProps = SessionEntry & {
  isSelected: boolean
  currentSessionId: string | null
  onSessionClick: () => void
}
const SessionItem = ({
  session_name: title,
  session_id,
  isSelected,
  currentSessionId,
  onSessionClick
}: SessionItemProps) => {
  const [agentId] = useQueryState('agent')
  const [teamId] = useQueryState('team')
  const [dbId] = useQueryState('db_id')
  const [, setSessionId] = useQueryState('session')
  const { getSession } = useSessionLoader()
  const { selectedEndpoint, sessionsData, setSessionsData, mode, setMessages } = useStore()
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)
  const { clearChat } = useChatActions()

  const handleGetSession = async () => {
    console.log('Clicando na sessão:', session_id)
    console.log('Parâmetros:', { agentId, teamId, dbId, mode })
    
    onSessionClick()
    console.log('Carregando sessão...')
    
    try {
      // Primeiro, tentar carregar do localStorage
      const localSessions = JSON.parse(localStorage.getItem('gabi_sessions') || '[]')
      console.log('=== DEBUG SESSÃO ===')
      console.log('Sessões no localStorage:', localSessions.length)
      console.log('Todas as sessões:', localSessions)
      console.log('Procurando sessão ID:', session_id)
      
      const localSession = localSessions.find((s: any) => s.session_id === session_id)
      console.log('Sessão encontrada:', !!localSession)
      console.log('Sessão completa:', localSession)
      
      if (localSession && localSession.messages && localSession.messages.length > 0) {
        console.log('✅ Carregando sessão do localStorage:', localSession.session_name)
        console.log('✅ Mensagens na sessão:', localSession.messages.length)
        console.log('✅ Primeira mensagem:', localSession.messages[0])
        console.log('✅ Última mensagem:', localSession.messages[localSession.messages.length - 1])
        
        // Verificar se as mensagens têm a estrutura correta
        const validMessages = localSession.messages.filter((msg: any) => {
          const isValid = msg && (msg.content || msg.text) && (msg.role || msg.type)
          if (!isValid) {
            console.log('❌ Mensagem inválida:', msg)
          }
          return isValid
        })
        console.log('✅ Mensagens válidas:', validMessages.length)
        
        if (validMessages.length > 0) {
          console.log('✅ Tentando carregar mensagens...')
          try {
            setMessages(validMessages)
            setSessionId(session_id)
            toast.success('Sessão carregada!')
            console.log('✅ Sessão carregada com sucesso!')
            return
          } catch (error) {
            console.log('❌ Erro ao carregar mensagens:', error)
            toast.error('Erro ao carregar mensagens da sessão')
            return
          }
        } else {
          console.log('❌ Nenhuma mensagem válida encontrada')
          toast.error('Sessão corrompida - nenhuma mensagem válida')
          return
        }
      } else {
        console.log('❌ Sessão não encontrada ou sem mensagens')
        console.log('localSession:', localSession)
        if (localSession) {
          console.log('Tem mensagens?', !!localSession.messages)
          console.log('Quantas mensagens?', localSession.messages?.length)
          console.log('Mensagens:', localSession.messages)
        }
      }
      
      // Se não encontrou no localStorage, tentar carregar do servidor
      if (agentId || teamId || dbId) {
        try {
          await getSession(
            {
              entityType: mode,
              agentId,
              teamId,
              dbId: dbId ?? ''
            },
            session_id
          )
          console.log('Sessão carregada do servidor')
          setSessionId(session_id)
        } catch (error) {
          console.log('Sessão não encontrada no servidor, mas foi carregada do localStorage')
          // A sessão já foi carregada do localStorage no hook useSessionLoader
          setSessionId(session_id)
        }
      } else {
        console.log('Sessão não encontrada no localStorage e sem parâmetros para servidor')
        toast.error('Sessão não encontrada')
      }
    } catch (error) {
      console.error('Erro ao carregar sessão:', error)
      toast.error('Erro ao carregar sessão')
    }
  }

  const handleRenameSession = async (newName: string) => {
    setIsRenaming(true)
    try {
      // Primeiro, tentar renomear no localStorage
      const localSessions = JSON.parse(localStorage.getItem('gabi_sessions') || '[]')
      const sessionIndex = localSessions.findIndex((s: any) => s.session_id === session_id)
      
      if (sessionIndex !== -1) {
        // Atualizar no localStorage
        localSessions[sessionIndex].session_name = newName
        localStorage.setItem('gabi_sessions', JSON.stringify(localSessions))
        
        // Atualizar a lista de sessões localmente
        if (sessionsData) {
          setSessionsData(
            sessionsData.map((s) =>
              s.session_id === session_id ? { ...s, session_name: newName } : s
            )
          )
        }
        
        toast.success('Sessão renomeada com sucesso!')
        setIsRenameModalOpen(false)
        return
      }
      
      // Se não encontrou no localStorage, tentar renomear no servidor
      if (agentId || teamId || dbId) {
        await renameSessionAPI(
          selectedEndpoint,
          session_id,
          newName,
          dbId ?? ''
        )

        // Atualizar a lista de sessões localmente
        if (sessionsData) {
          setSessionsData(
            sessionsData.map((s) =>
              s.session_id === session_id ? { ...s, session_name: newName } : s
            )
          )
        }
        
        toast.success('Sessão renomeada com sucesso!')
        setIsRenameModalOpen(false)
      } else {
        toast.error('Não foi possível renomear a sessão')
      }
    } catch (error) {
      toast.error(
        `Erro ao renomear sessão: ${error instanceof Error ? error.message : String(error)}`
      )
    } finally {
      setIsRenaming(false)
    }
  }

  const handleDeleteSession = async () => {
    setIsDeleting(true)
    try {
      // Primeiro, tentar deletar do localStorage
      const localSessions = JSON.parse(localStorage.getItem('gabi_sessions') || '[]')
      const sessionIndex = localSessions.findIndex((s: any) => s.session_id === session_id)
      
      if (sessionIndex !== -1) {
        // Remover do localStorage
        localSessions.splice(sessionIndex, 1)
        localStorage.setItem('gabi_sessions', JSON.stringify(localSessions))
        
        // Atualizar a lista de sessões localmente
        if (sessionsData) {
          setSessionsData(sessionsData.filter((s) => s.session_id !== session_id))
        }
        
        // If the deleted session was the active one, clear the chat
        if (currentSessionId === session_id) {
          setSessionId(null)
          clearChat()
        }
        
        toast.success('Sessão deletada com sucesso!')
        setIsDeleteModalOpen(false)
        return
      }
      
      // Se não encontrou no localStorage, tentar deletar do servidor
      if (agentId || teamId || dbId) {
        const response = await deleteSessionAPI(
          selectedEndpoint,
          dbId ?? '',
          session_id
        )

        if (response?.ok && sessionsData) {
          setSessionsData(sessionsData.filter((s) => s.session_id !== session_id))
          // If the deleted session was the active one, clear the chat
          if (currentSessionId === session_id) {
            setSessionId(null)
            clearChat()
          }
          toast.success('Sessão deletada com sucesso!')
        } else {
          const errorMsg = await response?.text()
          toast.error(
            `Erro ao deletar sessão: ${response?.statusText || 'Erro desconhecido'} ${errorMsg || ''}`
          )
        }
      } else {
        toast.error('Não foi possível deletar a sessão')
      }
    } catch (error) {
      toast.error(
        `Erro ao deletar sessão: ${error instanceof Error ? error.message : String(error)}`
      )
    } finally {
      setIsDeleteModalOpen(false)
      setIsDeleting(false)
    }
  }
  return (
    <>
      <div
        className={cn(
          'group flex h-11 w-full items-center justify-between rounded-lg px-3 py-2 transition-colors duration-200',
          isSelected
            ? 'cursor-default bg-primary/10'
            : 'cursor-pointer bg-background-secondary hover:bg-background-secondary/80'
        )}
        onClick={handleGetSession}
      >
        <div className="flex flex-col gap-1">
          <h4
            className={cn(
              'text-sm font-medium text-white', 
              isSelected && 'text-primary'
            )}
          >
            {truncateText(title, 20)}
          </h4>
        </div>
        <div className="flex gap-1 opacity-0 transition-all duration-200 ease-in-out group-hover:opacity-100">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation()
              setIsRenameModalOpen(true)
            }}
            className="h-8 w-8"
          >
            <Icon type="edit" size="xs" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation()
              setIsDeleteModalOpen(true)
            }}
            className="h-8 w-8"
          >
            <Icon type="trash" size="xs" />
          </Button>
        </div>
      </div>
      <DeleteSessionModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onDelete={handleDeleteSession}
        isDeleting={isDeleting}
      />
      <RenameSessionModal
        isOpen={isRenameModalOpen}
        onClose={() => setIsRenameModalOpen(false)}
        onRename={handleRenameSession}
        currentName={title}
        isRenaming={isRenaming}
      />
    </>
  )
}

export default SessionItem
