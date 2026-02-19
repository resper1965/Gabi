import { generateEmbedding as vertexGenerateEmbedding } from './vertex-ai'

// ============================================
// Embedding Engine — Shared RAG primitives
// ============================================

const embeddingCache = new Map<string, number[]>()

/**
 * Generate embedding with in-memory caching
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const cacheKey = text.slice(0, 100)
  if (embeddingCache.has(cacheKey)) {
    return embeddingCache.get(cacheKey)!
  }

  try {
    const embedding = await vertexGenerateEmbedding(text)
    if (embedding.length > 0) {
      embeddingCache.set(cacheKey, embedding)
    }
    return embedding
  } catch (error) {
    console.error('Error generating embedding:', error)
    return []
  }
}

/**
 * Cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  if (normA === 0 || normB === 0) return 0
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

/**
 * Format embedding array as pgvector string
 */
export function toPgVector(embedding: number[]): string {
  return `[${embedding.join(',')}]`
}
