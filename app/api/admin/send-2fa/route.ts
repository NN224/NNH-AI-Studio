import { NextResponse } from 'next/server'

export async function POST() {
  // 2FA code is handled client-side via sessionStorage
  // Email sending can be added later with proper email service
  // For now, return success - the code is shown in browser alert
  return NextResponse.json({ success: true, message: '2FA code generated' })
}
