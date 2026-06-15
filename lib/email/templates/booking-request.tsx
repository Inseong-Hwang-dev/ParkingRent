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

const PRICING_LABELS: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
}

export interface BookingRequestEmailProps {
  buyerName: string
  listingTitle: string
  pricingType: 'daily' | 'weekly' | 'monthly'
  message?: string | null
  bookingUrl: string
}

export function BookingRequestEmail({
  buyerName,
  listingTitle,
  pricingType,
  message,
  bookingUrl,
}: BookingRequestEmailProps) {
  return (
    createElement(Html, null,
      createElement(Head, null),
      createElement(Preview, null, `New booking request from ${buyerName} for ${listingTitle}`),
      createElement(Body, { style: body },
        createElement(Container, { style: container },
          createElement(Text, { style: brand }, 'ParkSpace'),
          createElement(Heading, { style: heading }, 'New Booking Request'),
          createElement(Text, { style: text },
            `Hi there,`
          ),
          createElement(Text, { style: text },
            `${buyerName} has submitted a booking request for your listing.`
          ),
          createElement(Section, { style: infoBox },
            createElement(Text, { style: infoRow },
              createElement('strong', null, 'Listing: '), listingTitle
            ),
            createElement(Text, { style: infoRow },
              createElement('strong', null, 'Pricing: '), PRICING_LABELS[pricingType]
            ),
            message
              ? createElement(Text, { style: infoRow },
                  createElement('strong', null, 'Message: '), message
                )
              : null
          ),
          createElement(Text, { style: text },
            `Review the request and accept or decline from your bookings dashboard.`
          ),
          createElement(Section, { style: btnContainer },
            createElement(Button, { href: bookingUrl, style: button }, 'View Booking Request')
          ),
          createElement(Hr, { style: hr }),
          createElement(Text, { style: footer },
            `ParkSpace — Australia's free peer-to-peer parking marketplace. You received this email because you have a listing on ParkSpace.`
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
