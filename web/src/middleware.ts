import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const LEGACY_REDIRECTS: Record<string, string> = {
  "/law": "/chat",
  "/ghost": "/chat",
}

export function middleware(request: NextRequest) {
  const target = LEGACY_REDIRECTS[request.nextUrl.pathname]
  if (target) {
    return NextResponse.redirect(new URL(target, request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ["/law", "/ghost"],
}
