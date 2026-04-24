import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import { createElement } from 'react'

export interface BookingAcceptedEmailProps {
  listingTitle: string
  sellerName: string
  sellerEmail: string
  sellerPhone: string | null
  bookingUrl: string
}

export function BookingAcceptedEmail({
  listingTitle,
  sellerName,
  sellerEmail,
  sellerPhone,
  bookingUrl,
}: BookingAcceptedEmailProps) {
  return (
    createElement(Html, null,
      createElement(Head, null),
      createElement(Preview, null, `Your booking request for ${listingTitle} has been accepted!`),
      createElement(Body, { style: body },
        createElement(Container, { style: container },
          createElement(Text, { style: brand }, 'ParkSpace'),
          createElement(Heading, { style: heading }, 'Booking Accepted! 🎉'),
          createElement(Text, { style: text },
            `Great news! Your booking request for the following listing has been accepted.`
          ),
          createElement(Section, { style: infoBox },
            createElement(Text, { style: infoRow },
              createElement('strong', null, 'Listing: '), listingTitle
            )
          ),
          createElement(Text, { style: subHeading }, 'Host Contact Details'),
          createElement(Text, { style: text },
            `You can now contact your host directly to arrange access.`
          ),
          createElement(Section, { style: contactBox },
            createElement(Text, { style: infoRow },
              createElement('strong', null, 'Name: '), sellerName
            ),
            createElement(Text, { style: infoRow },
              createElement('strong', null, 'Email: '), sellerEmail
            ),
            sellerPhone
              ? createElement(Text, { style: infoRow },
                  createElement('strong', null, 'Phone: '), sellerPhone
                )
              : null
          ),
          createElement(Section, { style: btnContainer },
            createElement(Button, { href: bookingUrl, style: button }, 'View Booking')
          ),
          createElement(Hr, { style: hr }),
          createElement(Text, { style: footer },
            `ParkSpace — Australia's free peer-to-peer parking marketplace. You received this email because you submitted a booking request on ParkSpace.`
          )
        )
      )
    )
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const body: React.CSSProperties = {
  backgroundColor: '#f8fafc',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
}

const container: React.CSSProperties = {
  margin: '0 auto',
  padding: '40px 24px',
  maxWidth: '560px',
}

const brand: React.CSSProperties = {
  fontSize: '20px',
  fontWeight: '700',
  color: '#2563eb',
  marginBottom: '32px',
}

const heading: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: '700',
  color: '#0f172a',
  marginBottom: '16px',
}

const subHeading: React.CSSProperties = {
  fontSize: '17px',
  fontWeight: '600',
  color: '#0f172a',
  marginBottom: '8px',
  marginTop: '24px',
}

const text: React.CSSProperties = {
  fontSize: '15px',
  lineHeight: '1.6',
  color: '#334155',
  marginBottom: '12px',
}

const infoBox: React.CSSProperties = {
  backgroundColor: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  padding: '16px 20px',
  marginBottom: '20px',
}

const contactBox: React.CSSProperties = {
  backgroundColor: '#f0fdf4',
  border: '1px solid #bbf7d0',
  borderRadius: '8px',
  padding: '16px 20px',
  marginBottom: '24px',
}

const infoRow: React.CSSProperties = {
  fontSize: '14px',
  lineHeight: '1.6',
  color: '#334155',
  margin: '4px 0',
}

const btnContainer: React.CSSProperties = {
  marginBottom: '24px',
}

const button: React.CSSProperties = {
  backgroundColor: '#2563eb',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: '600',
  textDecoration: 'none',
  padding: '12px 24px',
  display: 'inline-block',
}

const hr: React.CSSProperties = {
  borderColor: '#e2e8f0',
  margin: '24px 0',
}

const footer: React.CSSProperties = {
  fontSize: '12px',
  lineHeight: '1.5',
  color: '#94a3b8',
}
