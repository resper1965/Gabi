import { useState, useRef, useCallback } from "react"
import { toast } from "sonner"
import type { StreamMeta } from "@/components/chat-panel"

export function useChatStream({
  onSendStream,
  onStreamComplete,
  fileExtractUrl,
}: {
  onSendStream?: (text: string, signal: AbortSignal, attachedFileText?: string) => Promise<ReadableStreamDefaultReader<Uint8Array>>
  onStreamComplete?: (content: string, meta?: StreamMeta) => void
  fileExtractUrl?: string
}) {
  const [streamingContent, setStreamingContent] = useState<string | null>(null)
  const [attachedFile, setAttachedFile] = useState<{ name: string; text: string } | null>(null)
  const [fileLoading, setFileLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (e.target) e.target.value = ""

    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      toast.error("Arquivo muito grande (máx 10MB)")
      return
    }

    setFileLoading(true)
    try {
      const ext = file.name.split(".").pop()?.toLowerCase()

      if (ext === "txt" || ext === "md" || ext === "csv") {
        const text = await file.text()
        setAttachedFile({ name: file.name, text })
      } else if (fileExtractUrl && (ext === "pdf" || ext === "docx")) {
        const formData = new FormData()
        formData.append("file", file)
        const res = await fetch(fileExtractUrl, {
          method: "POST",
          body: formData,
          credentials: "include",
        })
        if (!res.ok) throw new Error("Falha ao extrair texto")
        const data = await res.json()
        setAttachedFile({ name: file.name, text: data.text || "" })
      } else {
        toast.error(`Tipo não suportado: .${ext}. Use PDF, DOCX ou TXT.`)
        return
      }
      toast.success(`📎 ${file.name} anexado`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao ler arquivo")
    } finally {
      setFileLoading(false)
    }
  }, [fileExtractUrl])

  const handleStream = useCallback(
    async (text: string, docText?: string) => {
      if (!onSendStream) return

      const controller = new AbortController()
      abortRef.current = controller
      setStreamingContent("")

      let fullText = ""
      const streamMeta: StreamMeta = {}

      try {
        const reader = await onSendStream(text, controller.signal, docText)
        const decoder = new TextDecoder()

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const raw = decoder.decode(value, { stream: true })
          for (const line of raw.split("\n")) {
            if (!line.startsWith("data: ")) continue
            const payload = line.slice(6).trim()
            if (payload === "[DONE]") break
            try {
              const parsed = JSON.parse(payload)
              if (parsed.type === "meta") {
                if (parsed.sources) streamMeta.sources = parsed.sources
                if (parsed.orchestration) streamMeta.orchestration = parsed.orchestration
              } else if (parsed.type === "text" && parsed.text) {
                fullText += parsed.text
                setStreamingContent(fullText)
              } else if (parsed.text) {
                fullText += parsed.text
                setStreamingContent(fullText)
              }
            } catch {
              // skip malformed line
            }
          }
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          onStreamComplete?.(
            "Ocorreu um erro durante a geração. Tente novamente.",
            {},
          )
          setStreamingContent(null)
          abortRef.current = null
          return
        }
      }

      setStreamingContent(null)
      abortRef.current = null
      if (fullText.trim()) {
        onStreamComplete?.(fullText, streamMeta)
      }
    },
    [onSendStream, onStreamComplete],
  )

  return {
    streamingContent,
    attachedFile,
    setAttachedFile,
    fileLoading,
    handleFileSelect,
    handleStream,
    stopStreaming,
  }
}
