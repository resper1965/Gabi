import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface RenameSessionModalProps {
  isOpen: boolean
  onClose: () => void
  onRename: (newName: string) => Promise<void>
  currentName: string
  isRenaming?: boolean
}

const RenameSessionModal = ({
  isOpen,
  onClose,
  onRename,
  currentName,
  isRenaming = false
}: RenameSessionModalProps) => {
  const [newName, setNewName] = useState(currentName)

  useEffect(() => {
    if (isOpen) {
      setNewName(currentName)
    }
  }, [isOpen, currentName])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newName.trim() && newName.trim() !== currentName) {
      await onRename(newName.trim())
    }
  }

  const handleClose = () => {
    setNewName(currentName)
    onClose()
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose()
    }
  }

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleBackdropClick}
    >
      <div className="bg-secondary border border-primary/15 rounded-lg shadow-lg w-full max-w-md mx-4">
        <div className="p-6">
          <div className="mb-4">
            <h2 className="text-lg font-montserrat font-medium text-white mb-2">
              Renomear Sessão
            </h2>
            <p className="text-sm font-montserrat text-primary/60">
              Digite um novo nome para esta sessão de chat.
            </p>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <Label htmlFor="session-name" className="block text-sm font-montserrat font-medium text-white mb-2">
                Nome
              </Label>
              <Input
                id="session-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full font-montserrat"
                placeholder="Digite o novo nome da sessão"
                maxLength={50}
                disabled={isRenaming}
                autoFocus
              />
            </div>
            
            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isRenaming}
                className="font-montserrat"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={!newName.trim() || newName.trim() === currentName || isRenaming}
                className="font-montserrat"
              >
                {isRenaming ? 'Renomeando...' : 'Renomear'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default RenameSessionModal
