import { VertexAI, type GenerateContentRequest, type Part, type Tool } from '@google-cloud/vertexai'

// ============================================
// Google Vertex AI — Shared LLM Engine
// Configurable via environment variables
// ============================================

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || ''
const LOCATION = process.env.VERTEX_AI_LOCATION || 'us-central1'
const CHAT_MODEL = process.env.VERTEX_AI_MODEL || 'gemini-2.0-flash-001'
const EMBEDDING_MODEL = process.env.VERTEX_AI_EMBEDDING_MODEL || 'text-embedding-004'

let vertexInstance: VertexAI | null = null

function getVertex(): VertexAI {
  if (!vertexInstance) {
    if (!PROJECT_ID) {
      throw new Error('GOOGLE_CLOUD_PROJECT or NEXT_PUBLIC_FIREBASE_PROJECT_ID env var is required')
    }
    vertexInstance = new VertexAI({ project: PROJECT_ID, location: LOCATION })
  }
  return vertexInstance
}

// ============================================
// Message Types
// ============================================

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

// ============================================
// Text Generation (non-streaming)
// ============================================

export async function generateText(
  messages: ChatMessage[],
  options?: { useGrounding?: boolean; model?: string }
): Promise<string> {
  const vertex = getVertex()
  const model = vertex.getGenerativeModel({ model: options?.model || CHAT_MODEL })

  const systemMessages = messages.filter(m => m.role === 'system' || (m.role === 'assistant' && messages.indexOf(m) === 0))
  const conversationMessages = messages.filter(m => !systemMessages.includes(m))
  const systemInstruction = systemMessages.map(m => m.content).join('\n\n')

  const contents = conversationMessages.map(m => ({
    role: m.role === 'assistant' ? 'model' as const : 'user' as const,
    parts: [{ text: m.content }] as Part[],
  }))

  const tools: Tool[] = []
  if (options?.useGrounding) {
    tools.push({
      googleSearchRetrieval: {
        dynamicRetrievalConfig: {
          mode: 'MODE_DYNAMIC' as const,
          dynamicThreshold: 0.7,
        },
      },
    } as unknown as Tool)
  }

  const request: GenerateContentRequest = {
    contents,
    systemInstruction: systemInstruction ? { role: 'user' as const, parts: [{ text: systemInstruction }] } : undefined,
    ...(tools.length > 0 && { tools }),
  }

  const result = await model.generateContent(request)
  return result.response.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

// ============================================
// Text Generation (streaming)
// ============================================

export async function* streamText(
  messages: ChatMessage[],
  options?: { useGrounding?: boolean; model?: string }
): AsyncGenerator<string> {
  const vertex = getVertex()
  const model = vertex.getGenerativeModel({ model: options?.model || CHAT_MODEL })

  const systemMessages = messages.filter(m => m.role === 'system' || (m.role === 'assistant' && messages.indexOf(m) === 0))
  const conversationMessages = messages.filter(m => !systemMessages.includes(m))
  const systemInstruction = systemMessages.map(m => m.content).join('\n\n')

  const contents = conversationMessages.map(m => ({
    role: m.role === 'assistant' ? 'model' as const : 'user' as const,
    parts: [{ text: m.content }] as Part[],
  }))

  const tools: Tool[] = []
  if (options?.useGrounding) {
    tools.push({
      googleSearchRetrieval: {
        dynamicRetrievalConfig: {
          mode: 'MODE_DYNAMIC' as const,
          dynamicThreshold: 0.7,
        },
      },
    } as unknown as Tool)
  }

  const request: GenerateContentRequest = {
    contents,
    systemInstruction: systemInstruction ? { role: 'user' as const, parts: [{ text: systemInstruction }] } : undefined,
    ...(tools.length > 0 && { tools }),
  }

  const streamingResult = await model.generateContentStream(request)

  for await (const chunk of streamingResult.stream) {
    const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text
    if (text) {
      yield text
    }
  }
}

// ============================================
// Embeddings (Vertex AI Prediction API)
// ============================================

export async function generateEmbedding(text: string): Promise<number[]> {
  if (!PROJECT_ID) {
    console.warn('[vertex-ai] No project ID configured, skipping embeddings')
    return []
  }

  try {
    const { GoogleAuth } = await import('google-auth-library')
    const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] })
    const client = await auth.getClient()

    const url = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${EMBEDDING_MODEL}:predict`

    const response = await client.request({
      url,
      method: 'POST',
      data: {
        instances: [{ content: text.slice(0, 8000) }],
      },
    })

    const data = response.data as { predictions?: Array<{ embeddings?: { values?: number[] } }> }
    return data.predictions?.[0]?.embeddings?.values || []
  } catch (error) {
    console.error('[vertex-ai] Embedding generation failed:', error)
    return []
  }
}

export { PROJECT_ID, LOCATION, CHAT_MODEL, EMBEDDING_MODEL }
