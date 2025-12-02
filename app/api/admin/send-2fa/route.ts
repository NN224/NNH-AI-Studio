import { createClient } from '@/lib/supabase/server'
import { apiLogger } from '@/lib/utils/logger'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json()

    // Verify the request is from an authenticated admin
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user || user.email !== email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const adminEmails = process.env.ADMIN_EMAILS?.split(',') || []
    if (!adminEmails.includes(email)) {
      return NextResponse.json({ error: 'Not an admin' }, { status: 403 })
    }

    // Send email with 2FA code
    // In production, use your email service (SendGrid, etc.)
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f7f7f7; padding: 30px; border-radius: 0 0 10px 10px; }
            .code-box { background: white; border: 2px solid #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
            .code { font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 5px; }
            .warning { background: #fff3cd; border: 1px solid #ffc107; color: #856404; padding: 10px; border-radius: 5px; margin-top: 20px; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Admin Access Verification</h1>
            </div>
            <div class="content">
              <p>Hello Admin,</p>
              <p>You are attempting to access the NNH AI Studio Admin Panel.</p>
              <p>Your verification code is:</p>

              <div class="code-box">
                <div class="code">${code}</div>
              </div>

              <p><strong>This code will expire in 5 minutes.</strong></p>

              <div class="warning">
                ⚠️ <strong>Security Notice:</strong><br>
                If you did not request this code, please secure your account immediately.
              </div>

              <div class="footer">
                <p>This is an automated security email from NNH AI Studio.</p>
                <p>Time: ${new Date().toISOString()}</p>
                <p>IP: ${request.headers.get('x-forwarded-for') || 'Unknown'}</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `

    // For development, log the code
    if (process.env.NODE_ENV === 'development') {
      apiLogger.info(`[2FA] Code for ${email}: ${code}`)
      console.log(`\n🔐 2FA CODE: ${code}\n`)
    }

    // Send via email service
    if (process.env.SENDGRID_API_KEY) {
      const response = await fetch('/api/email/sendgrid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          subject: '🔐 Admin Access Code - NNH AI Studio',
          html: emailHtml,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to send email')
      }
    }

    // Log admin 2FA request
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'ADMIN_2FA_REQUESTED',
      severity: 'info',
      resource_type: 'admin_panel',
      details: {
        email,
        ip: request.headers.get('x-forwarded-for'),
        userAgent: request.headers.get('user-agent'),
      },
      success: true,
    })

    return NextResponse.json({ success: true, message: '2FA code sent' })
  } catch (error) {
    apiLogger.error('[2FA] Failed to send code', error)
    return NextResponse.json({ error: 'Failed to send 2FA code' }, { status: 500 })
  }
}
