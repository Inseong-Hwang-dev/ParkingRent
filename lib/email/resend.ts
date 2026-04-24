import { Resend } from 'resend'
import type { ReactElement } from 'react'

export const FROM_ADDRESS = 'ParkSpace <noreply@parkspace.com.au>'
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://parkspace.com.au'

function getResend() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not set')
  }
  return new Resend(process.env.RESEND_API_KEY)
}

export async function sendEmail({
  to,
  subject,
  react,
}: {
  to: string
  subject: string
  react: ReactElement
}): Promise<void> {
  const { error } = await getResend().emails.send({
    from: FROM_ADDRESS,
    to,
    subject,
    react,
  })

  if (error) {
    console.error('[sendEmail] Resend error:', error)
    throw new Error(error.message)
  }
}
