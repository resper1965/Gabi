import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const logOptions = process.env.NODE_ENV === 'production'
  ? []
  : ['error', 'warn'] as Array<'error' | 'warn'>

function createPrismaClient() {
  return new PrismaClient({ log: logOptions })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
}
