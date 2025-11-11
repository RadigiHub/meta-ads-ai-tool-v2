import { NextResponse } from 'next/server'

export function middleware(req) {
  const user = process.env.BASIC_AUTH_USER
  const pass = process.env.BASIC_AUTH_PASS
  if (!user || !pass) return NextResponse.next()

  const authHeader = req.headers.get('authorization') || ''
  if (authHeader.startsWith('Basic ')) {
    const b64 = authHeader.split(' ')[1]
    const [u, p] = Buffer.from(b64, 'base64').toString().split(':')
    if (u === user && p === pass) return NextResponse.next()
  }
  return new Response('Authentication required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Protected"' },
  })
}
