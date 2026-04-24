import { Skeleton } from '@/components/ui/skeleton'

export default function BookingsLoading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-4">
      <Skeleton className="h-7 w-40 mb-6" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="rounded-xl border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-5 w-20" />
          </div>
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  )
}
