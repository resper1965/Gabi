import { useCallback } from 'react'
import { toast } from 'sonner'

import { useStore } from '../store'

import { AgentDetails, TeamDetails, type ChatMessage } from '@/types/os'
import { getAgentsAPI, getStatusAPI, getTeamsAPI } from '@/api/os'
import { useQueryState } from 'nuqs'

const useChatActions = () => {
  const { chatInputRef } = useStore()
  const selectedEndpoint = useStore((state) => state.selectedEndpoint)
  const [, setSessionId] = useQueryState('session')
  const setMessages = useStore((state) => state.setMessages)
  const setIsEndpointActive = useStore((state) => state.setIsEndpointActive)
  const setIsEndpointLoading = useStore((state) => state.setIsEndpointLoading)
  const setAgents = useStore((state) => state.setAgents)
  const setTeams = useStore((state) => state.setTeams)
  const setSelectedModel = useStore((state) => state.setSelectedModel)
  const setMode = useStore((state) => state.setMode)
  const [agentId, setAgentId] = useQueryState('agent')
  const [teamId, setTeamId] = useQueryState('team')
  const [, setDbId] = useQueryState('db_id')

  const getStatus = useCallback(async () => {
    try {
      const status = await getStatusAPI(selectedEndpoint)
      return status
    } catch {
      return 503
    }
  }, [selectedEndpoint])

  const getAgents = useCallback(async () => {
    try {
      const agents = await getAgentsAPI(selectedEndpoint)
      return agents
    } catch {
      toast.error('Error fetching agents')
      return []
    }
  }, [selectedEndpoint])

  const getTeams = useCallback(async () => {
    try {
      const teams = await getTeamsAPI(selectedEndpoint)
      return teams
    } catch {
      toast.error('Error fetching teams')
      return []
    }
  }, [selectedEndpoint])

  const saveCurrentSession = useCallback(async () => {
    const currentMessages = useStore.getState().messages
    if (currentMessages.length === 0) return null

    try {
      // Criar um nome para a sessão baseado na primeira mensagem
      const firstMessage = currentMessages[0]
      const sessionName = firstMessage.content?.substring(0, 50) || 'Nova Sessão'
      
      // Simular ID da sessão
      const sessionId = `session_${Date.now()}`
      
      const newSession = {
        session_id: sessionId,
        session_name: sessionName,
        created_at: new Date().toISOString(),
        messages: currentMessages
      }
      
      // Salvar no localStorage como fallback
      const existingSessions = JSON.parse(localStorage.getItem('gabi_sessions') || '[]')
      console.log('Sessões existentes antes:', existingSessions.length)
      
      existingSessions.unshift(newSession)
      localStorage.setItem('gabi_sessions', JSON.stringify(existingSessions))
      
      console.log('Sessão salva localmente:', sessionName)
      console.log('Total de sessões após salvar:', existingSessions.length)
      console.log('Sessões no localStorage:', JSON.parse(localStorage.getItem('gabi_sessions') || '[]').length)
      
      return newSession
    } catch (error) {
      console.error('Erro ao salvar sessão:', error)
      return null
    }
  }, [])

  const clearChat = useCallback(async () => {
    // Salvar sessão atual se houver mensagens
    const currentMessages = useStore.getState().messages
    if (currentMessages.length > 0) {
      const savedSession = await saveCurrentSession()
      if (savedSession) {
        console.log('Sessão salva com sucesso:', savedSession.session_name)
        
        // Forçar atualização da lista de sessões
        const event = new CustomEvent('sessionSaved', { detail: savedSession })
        window.dispatchEvent(event)
      }
    }
    
    setMessages([])
    setSessionId(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveCurrentSession])

  const focusChatInput = useCallback(() => {
    setTimeout(() => {
      requestAnimationFrame(() => {
        chatInputRef?.current?.focus()
      })
    }, 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const addMessage = useCallback(
    (message: ChatMessage) => {
      setMessages((prevMessages) => [...prevMessages, message])
    },
    [setMessages]
  )

  const initialize = useCallback(async () => {
    setIsEndpointLoading(true)
    try {
      const status = await getStatus()
      let agents: AgentDetails[] = []
      let teams: TeamDetails[] = []
      if (status === 200) {
        setIsEndpointActive(true)
        teams = await getTeams()
        agents = await getAgents()
        console.log(' is active', teams, agents)

        if (!agentId && !teamId) {
          const currentMode = useStore.getState().mode
          console.log('Current mode:', currentMode)

          if (currentMode === 'team' && teams.length > 0) {
            const firstTeam = teams[0]
            setTeamId(firstTeam.id)
            setSelectedModel(firstTeam.model?.provider || '')
            setDbId(firstTeam.db_id || '')
            setAgentId(null)
            setTeams(teams)
          } else if (currentMode === 'agent' && agents.length > 0) {
            const firstAgent = agents[0]
            setMode('agent')
            setAgentId(firstAgent.id)
            setSelectedModel(firstAgent.model?.model || '')
            setDbId(firstAgent.db_id || '')
            setAgents(agents)
          }
        } else {
          setAgents(agents)
          setTeams(teams)
          if (agentId) {
            const agent = agents.find((a) => a.id === agentId)
            if (agent) {
              setMode('agent')
              setSelectedModel(agent.model?.model || '')
              setDbId(agent.db_id || '')
              setTeamId(null)
            } else if (agents.length > 0) {
              const firstAgent = agents[0]
              setMode('agent')
              setAgentId(firstAgent.id)
              setSelectedModel(firstAgent.model?.model || '')
              setDbId(firstAgent.db_id || '')
              setTeamId(null)
            }
          } else if (teamId) {
            const team = teams.find((t) => t.id === teamId)
            if (team) {
              setMode('team')
              setSelectedModel(team.model?.provider || '')
              setDbId(team.db_id || '')
              setAgentId(null)
            } else if (teams.length > 0) {
              const firstTeam = teams[0]
              setMode('team')
              setTeamId(firstTeam.id)
              setSelectedModel(firstTeam.model?.provider || '')
              setDbId(firstTeam.db_id || '')
              setAgentId(null)
            }
          }
        }
      } else {
        setIsEndpointActive(false)
        setMode('agent')
        setSelectedModel('')
        setAgentId(null)
        setTeamId(null)
      }
      return { agents, teams }
    } catch (error) {
      console.error('Error initializing :', error)
      setIsEndpointActive(false)
      setMode('agent')
      setSelectedModel('')
      setAgentId(null)
      setTeamId(null)
      setAgents([])
      setTeams([])
    } finally {
      setIsEndpointLoading(false)
    }
  }, [
    getStatus,
    getAgents,
    getTeams,
    setIsEndpointActive,
    setIsEndpointLoading,
    setAgents,
    setTeams,
    setAgentId,
    setSelectedModel,
    setMode,
    setTeamId,
    setDbId,
    agentId,
    teamId
  ])

  return {
    clearChat,
    addMessage,
    getAgents,
    focusChatInput,
    getTeams,
    initialize
  }
}

export default useChatActions
