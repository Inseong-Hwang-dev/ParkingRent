import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Car, BookOpen, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { BookingStatus, PricingType } from "@/types/database";

// Explicit type for the relational query result
type RecentBooking = {
  id: string;
  status: BookingStatus;
  pricing_type: PricingType;
  created_at: string;
  listing: { title: string } | null;
  buyer: { full_name: string } | null;
};
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  accepted: "Accepted",
  declined: "Declined",
  cancelled: "Cancelled",
};

const STATUS_VARIANTS: Record<
  string,
  React.ComponentProps<typeof Badge>["variant"]
> = {
  pending: "secondary",
  accepted: "default",
  declined: "destructive",
  cancelled: "outline",
};

const PRICING_LABELS: Record<string, string> = {
  daily: "Daily",
  fortnightly: "Fortnightly",
  monthly: "Monthly",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Parallel queries for all counts + recent bookings
  const [
    { count: activeListings },
    { count: pendingReceived },
    { count: sentRequests },
    { data: recentReceived },
  ] = await Promise.all([
    supabase
      .from("listings")
      .select("*", { count: "exact", head: true })
      .eq("owner_id", user.id)
      .eq("is_active", true) as unknown as Promise<{ count: number | null }>,

    supabase
      .from("booking_requests")
      .select("*", { count: "exact", head: true })
      .eq("seller_id", user.id)
      .eq("status", "pending") as unknown as Promise<{ count: number | null }>,

    supabase
      .from("booking_requests")
      .select("*", { count: "exact", head: true })
      .eq("buyer_id", user.id) as unknown as Promise<{ count: number | null }>,

    supabase
      .from("booking_requests")
      .select(
        `
        id,
        status,
        pricing_type,
        created_at,
        listing:listings ( title ),
        buyer:users ( full_name )
      `
      )
      .eq("seller_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5) as unknown as Promise<{ data: RecentBooking[] | null }>,
  ]);

  const stats = [
    {
      label: "Active Listings",
      value: activeListings ?? 0,
      icon: Car,
      href: "/dashboard/listings",
    },
    {
      label: "Pending Requests",
      value: pendingReceived ?? 0,
      icon: BookOpen,
      href: "/bookings",
      highlight: (pendingReceived ?? 0) > 0,
    },
    {
      label: "Sent Requests",
      value: sentRequests ?? 0,
      icon: Send,
      href: "/bookings",
    },
  ];

  return (
    <div className="p-6 space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your listings and booking requests.
          </p>
        </div>
        <Button asChild className="gap-2 sm:shrink-0">
          <Link href="/listings/new">
            <Plus className="h-4 w-4" />
            List a Space
          </Link>
        </Button>
      </div>

      {/* Count cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map(({ label, value, icon: Icon, href, highlight }) => (
          <Link key={label} href={href} className="block group">
            <Card className="transition-colors group-hover:bg-muted/50">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardDescription className="text-sm font-medium">
                  {label}
                </CardDescription>
                <Icon
                  className={`h-4 w-4 ${
                    highlight ? "text-primary" : "text-muted-foreground"
                  }`}
                />
              </CardHeader>
              <CardContent>
                <p
                  className={`text-3xl font-bold ${
                    highlight ? "text-primary" : ""
                  }`}
                >
                  {value}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent received booking requests */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Booking Requests</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/bookings">View all</Link>
          </Button>
        </div>

        {!recentReceived || recentReceived.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <BookOpen className="mx-auto h-8 w-8 mb-3 opacity-40" />
              <p className="font-medium">No booking requests yet</p>
              <p className="text-sm mt-1">
                Once someone requests your listing, it will appear here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <ul className="divide-y">
              {recentReceived.map((booking) => {
                const listing = booking.listing;
                const buyer = booking.buyer;

                return (
                  <li key={booking.id}>
                    <Link
                      href={`/bookings/${booking.id}`}
                      className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {listing?.title ?? "Listing"}
                        </p>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {buyer?.full_name ?? "Unknown"} &middot;{" "}
                          {PRICING_LABELS[booking.pricing_type]} &middot;{" "}
                          {formatDate(booking.created_at)}
                        </p>
                      </div>
                      <Badge variant={STATUS_VARIANTS[booking.status]}>
                        {STATUS_LABELS[booking.status]}
                      </Badge>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}
