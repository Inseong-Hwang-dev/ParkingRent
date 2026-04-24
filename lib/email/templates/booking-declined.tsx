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

export interface BookingDeclinedEmailProps {
  listingTitle: string
  listingsUrl: string
}

export function BookingDeclinedEmail({
  listingTitle,
  listingsUrl,
}: BookingDeclinedEmailProps) {
  return (
    createElement(Html, null,
      createElement(Head, null),
      createElement(Preview, null, `Update on your booking request for ${listingTitle}`),
      createElement(Body, { style: body },
        createElement(Container, { style: container },
          createElement(Text, { style: brand }, 'ParkSpace'),
          createElement(Heading, { style: heading }, 'Booking Request Update'),
          createElement(Text, { style: text },
            `Unfortunately, your booking request for the following listing was not accepted.`
          ),
          createElement(Section, { style: infoBox },
            createElement(Text, { style: infoRow },
              createElement('strong', null, 'Listing: '), listingTitle
            )
          ),
          createElement(Text, { style: text },
            `Don't worry — there are plenty of other spaces available. Browse our listings to find another parking spot that suits you.`
          ),
          createElement(Section, { style: btnContainer },
            createElement(Button, { href: listingsUrl, style: button }, 'Find Another Space')
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
