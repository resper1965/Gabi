'use client'

import * as React from 'react'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '@/components/ui/select'
import { useStore } from '@/store'
import { useQueryState } from 'nuqs'
import useChatActions from '@/hooks/useChatActions'

export function ModeSelector() {
  const { mode, setMode, setMessages, setSelectedModel } = useStore()
  const { clearChat } = useChatActions()
  const [, setAgentId] = useQueryState('agent')
  const [, setTeamId] = useQueryState('team')
  const [, setSessionId] = useQueryState('session')

  const handleModeChange = (newMode: 'agent' | 'team') => {
    if (newMode === mode) return

    setMode(newMode)

    setAgentId(null)
    setTeamId(null)
    setSelectedModel('')
    setMessages([])
    setSessionId(null)
    clearChat()
  }

  return (
    <>
      <Select
        defaultValue={mode}
        value={mode}
        onValueChange={(value) => handleModeChange(value as 'agent' | 'team')}
      >
        <SelectTrigger className="h-9 w-full rounded-xl border border-primary/30 bg-secondary text-xs font-montserrat font-medium uppercase text-white">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="border border-primary/30 bg-secondary font-montserrat shadow-lg">
          <SelectItem value="agent" className="cursor-pointer text-white hover:bg-accent">
            <div className="text-xs font-montserrat font-medium uppercase">Agente</div>
          </SelectItem>

          <SelectItem value="team" className="cursor-pointer text-white hover:bg-accent">
            <div className="text-xs font-montserrat font-medium uppercase">Equipe</div>
          </SelectItem>
        </SelectContent>
      </Select>
    </>
  )
}
