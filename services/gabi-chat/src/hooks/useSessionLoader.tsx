import { useCallback } from 'react'
import { getSessionAPI, getAllSessionsAPI } from '@/api/os'
import { useStore } from '../store'
import { toast } from 'sonner'
import { ChatMessage, ToolCall, ReasoningMessage, ChatEntry } from '@/types/os'
import { getJsonMarkdown } from '@/lib/utils'

interface SessionResponse {
  session_id: string
  agent_id: string
  user_id: string | null
  runs?: ChatEntry[]
  memory: {
    runs?: ChatEntry[]
    chats?: ChatEntry[]
  }
  agent_data: Record<string, unknown>
}

interface LoaderArgs {
  entityType: 'agent' | 'team' | null
  agentId?: string | null
  teamId?: string | null
  dbId: string | null
}

const useSessionLoader = () => {
  const setMessages = useStore((state) => state.setMessages)
  const selectedEndpoint = useStore((state) => state.selectedEndpoint)
  const setIsSessionsLoading = useStore((state) => state.setIsSessionsLoading)
  const setSessionsData = useStore((state) => state.setSessionsData)

  const getSessions = useCallback(
    async ({ entityType, agentId, teamId, dbId }: LoaderArgs) => {
      const selectedId = entityType === 'agent' ? agentId : teamId
      if (!selectedEndpoint || !entityType || !selectedId || !dbId) return

      try {
        setIsSessionsLoading(true)

        const sessions = await getAllSessionsAPI(
          selectedEndpoint,
          entityType,
          selectedId,
          dbId
        )
        console.log('Fetched sessions:', sessions)
        setSessionsData(sessions.data ?? [])
      } catch {
        toast.error('Error loading sessions')
        setSessionsData([])
      } finally {
        setIsSessionsLoading(false)
      }
    },
    [selectedEndpoint, setSessionsData, setIsSessionsLoading]
  )

  const getSession = useCallback(
    async (
      { entityType, agentId, teamId, dbId }: LoaderArgs,
      sessionId: string
    ) => {
      console.log('getSession chamado com:', { entityType, agentId, teamId, dbId, sessionId })
      const selectedId = entityType === 'agent' ? agentId : teamId
      if (
        !selectedEndpoint ||
        !sessionId ||
        !entityType ||
        !selectedId ||
        !dbId
      ) {
        console.log('Parâmetros inválidos para getSession')
        return
      }
      console.log('Fazendo requisição para API...')

      try {
        const response: SessionResponse = await getSessionAPI(
          selectedEndpoint,
          entityType,
          sessionId,
          dbId
        )
        console.log('Resposta da API:', response)
        if (response) {
          console.log('Tipo da resposta:', typeof response, 'É array?', Array.isArray(response))
          
          // Verificar se a resposta tem a estrutura esperada
          let runs = []
          if (Array.isArray(response)) {
            runs = response
          } else if (response.runs && Array.isArray(response.runs)) {
            runs = response.runs
          } else if (response.memory?.runs && Array.isArray(response.memory.runs)) {
            runs = response.memory.runs
          } else if (response.memory?.chats && Array.isArray(response.memory.chats)) {
            runs = response.memory.chats
          } else {
            console.log('Estrutura de resposta não reconhecida:', response)
            return null
          }
          
          console.log('Runs extraídos:', runs.length, 'items')
          
          if (runs.length > 0) {
            const messagesFor = runs.flatMap((run) => {
              const filteredMessages: ChatMessage[] = []

              if (run) {
                filteredMessages.push({
                  role: 'user',
                  content: run.run_input ?? '',
                  created_at: run.created_at
                })
              }

              if (run) {
                const toolCalls = [
                  ...(run.tools ?? []),
                  ...(run.extra_data?.reasoning_messages ?? []).reduce(
                    (acc: ToolCall[], msg: ReasoningMessage) => {
                      if (msg.role === 'tool') {
                        acc.push({
                          role: msg.role,
                          content: msg.content,
                          tool_call_id: msg.tool_call_id ?? '',
                          tool_name: msg.tool_name ?? '',
                          tool_args: msg.tool_args ?? {},
                          tool_call_error: msg.tool_call_error ?? false,
                          metrics: msg.metrics ?? { time: 0 },
                          created_at:
                            msg.created_at ?? Math.floor(Date.now() / 1000)
                        })
                      }
                      return acc
                    },
                    []
                  )
                ]

                filteredMessages.push({
                  role: 'agent',
                  content: (run.content as string) ?? '',
                  tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
                  extra_data: run.extra_data,
                  images: run.images,
                  videos: run.videos,
                  audio: run.audio,
                  response_audio: run.response_audio,
                  created_at: run.created_at
                })
              }
              return filteredMessages
            })

            const processedMessages = messagesFor.map(
              (message: ChatMessage) => {
                if (Array.isArray(message.content)) {
                  const textContent = message.content
                    .filter((item: { type: string }) => item.type === 'text')
                    .map((item) => item.text)
                    .join(' ')

                  return {
                    ...message,
                    content: textContent
                  }
                }
                if (typeof message.content !== 'string') {
                  return {
                    ...message,
                    content: getJsonMarkdown(message.content)
                  }
                }
                return message
              }
            )

            console.log('Definindo mensagens:', processedMessages.length, 'mensagens')
            setMessages(processedMessages)
            console.log('Mensagens definidas com sucesso')
            return processedMessages
          } else {
            console.log('Nenhum run encontrado')
            setMessages([])
            return []
          }
        } else {
          console.log('Resposta vazia ou nula')
          setMessages([])
          return []
        }
      } catch (error) {
        console.error('Erro ao carregar sessão do servidor:', error)
        
        // Se a sessão não foi encontrada no servidor, tentar carregar do localStorage
        try {
          const localSessions = JSON.parse(localStorage.getItem('gabi_sessions') || '[]')
          const localSession = localSessions.find((s: any) => s.session_id === sessionId)
          
          if (localSession && localSession.messages) {
            console.log('Carregando sessão do localStorage como fallback:', localSession.session_name)
            setMessages(localSession.messages)
            return localSession.messages
          }
        } catch (localError) {
          console.error('Erro ao carregar do localStorage:', localError)
        }
        
        setMessages([])
        return null
      }
    },
    [selectedEndpoint, setMessages]
  )

  return { getSession, getSessions }
}

export default useSessionLoader
