import { adminAuth } from './firebase-admin'

export interface FirebaseUser {
  uid: string
  email: string | undefined
  name: string | undefined
  picture: string | undefined
}

/**
 * Extract and verify Firebase ID token from the Authorization header.
 */
export async function getFirebaseUser(request: Request): Promise<FirebaseUser | null> {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) return null

    const idToken = authHeader.slice(7)
    if (!idToken) return null

    const decoded = await adminAuth.verifyIdToken(idToken)
    return {
      uid: decoded.uid,
      email: decoded.email,
      name: decoded.name,
      picture: decoded.picture,
    }
  } catch (error) {
    console.error('[auth-firebase] Token verification failed:', error)
    return null
  }
}

/**
 * Require authentication — returns user info or 401 Response.
 */
export async function requireFirebaseAuth(request: Request): Promise<FirebaseUser | Response> {
  const user = await getFirebaseUser(request)
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  return user
}
