interface PriceMarkerProps {
  price: { amount: number; label: string } | null
  isHovered?: boolean
  isSelected?: boolean
  isSoldOut?: boolean
}

function formatAmount(amount: number): string {
  return amount.toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export function PriceMarker({ price, isHovered, isSelected, isSoldOut }: PriceMarkerProps) {
  let className =
    'rounded-full px-2.5 py-1 text-xs font-semibold shadow-md border transition-all duration-150 select-none whitespace-nowrap cursor-pointer'

  if (isSoldOut) {
    className += ' bg-muted text-muted-foreground border-border'
  } else if (isSelected) {
    className += ' bg-foreground text-background border-foreground scale-110 z-10 shadow-lg'
  } else if (isHovered) {
    className += ' bg-foreground text-background border-foreground scale-105 shadow-lg'
  } else {
    className += ' bg-white text-foreground border-border hover:scale-105 hover:shadow-lg'
  }

  const label = isSoldOut
    ? 'Sold out'
    : price
    ? `$${formatAmount(price.amount)}${price.label}`
    : 'POA'

  return <div className={className}>{label}</div>
}
