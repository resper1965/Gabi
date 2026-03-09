// ============================================
// @gabi/core — Shared modules for Gabi AI projects
// ============================================

// AI — Vertex AI LLM + Embeddings
export { generateText, streamText, generateVertexEmbedding } from './ai'
export type { ChatMessage } from './ai'
export { generateEmbedding, cosineSimilarity, toPgVector } from './ai'

// Auth — Firebase Authentication
export { getFirebaseUser, requireFirebaseAuth } from './auth'
export type { FirebaseUser } from './auth'
export { adminApp, adminAuth } from './auth'
export { getApp, getAuth } from './auth'

// DB — Not used (Gabi uses Python/SQLAlchemy for database access)

// Utils
export { cn, escapeHtml, sanitizeFilename, validateFile, validateContent, errorResponse, successResponse } from './utils'

// Chat
export { ChatMessageBubble, ChatInput, createStreamResponse } from './chat'
export type { Message } from './chat'
