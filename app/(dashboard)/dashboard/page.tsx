import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Plus, Car, BookOpen, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { BookingStatus, PricingType, SpaceType } from "@/types/database";

// Explicit type for the relational query result
type RecentBooking = {
  id: string;
  status: BookingStatus;
  pricing_type: PricingType;
  created_at: string;
  listing: { title: string } | null;
  buyer: { full_name: string } | null;
};

type MyListing = {
  id: string;
  title: string;
  suburb: string;
  state: string;
  space_type: SpaceType;
  is_active: boolean;
  is_sold_out: boolean;
  price_daily: number | null;
  price_monthly: number | null;
  listing_photos: { url: string; sort_order: number }[];
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

  // Parallel queries for all counts + recent bookings + my listings
  const [
    { count: activeListings },
    { count: pendingReceived },
    { count: sentRequests },
    { data: recentReceived },
    { data: myListings },
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

    supabase
      .from("listings")
      .select(
        `
        id,
        title,
        suburb,
        state,
        space_type,
        is_active,
        is_sold_out,
        price_daily,
        price_monthly,
        listing_photos ( url, sort_order )
      `
      )
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false }) as unknown as Promise<{
      data: MyListing[] | null;
    }>,
  ]);

  const stats = [
    {
      label: "Active Listings",
      value: activeListings ?? 0,
      icon: Car,
      href: "/dashboard",
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

      {/* My Listings */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">My Listings</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/listings/new" className="gap-1.5 flex items-center">
              <Plus className="h-4 w-4" />
              New Listing
            </Link>
          </Button>
        </div>

        {!myListings || myListings.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Car className="mx-auto h-8 w-8 mb-3 opacity-40" />
              <p className="font-medium">No listings yet</p>
              <p className="text-sm mt-1">
                <Link
                  href="/listings/new"
                  className="text-primary underline-offset-2 hover:underline"
                >
                  List your first space
                </Link>{" "}
                to get started.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {myListings.map((listing) => {
              const coverPhoto = [...listing.listing_photos].sort(
                (a, b) => a.sort_order - b.sort_order
              )[0];
              const price = listing.price_monthly ?? listing.price_daily;
              const priceLabel = listing.price_monthly
                ? "/mo"
                : listing.price_daily
                ? "/day"
                : null;

              return (
                <Card key={listing.id} className="overflow-hidden">
                  <div className="flex items-center gap-4 p-4">
                    {/* Thumbnail */}
                    <div className="relative h-16 w-24 shrink-0 rounded-md overflow-hidden bg-muted">
                      {coverPhoto ? (
                        <Image
                          src={coverPhoto.url}
                          alt={listing.title}
                          fill
                          sizes="96px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Car className="h-6 w-6 text-muted-foreground/40" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{listing.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {listing.suburb}, {listing.state}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {!listing.is_active && (
                          <Badge variant="outline" className="text-xs">
                            Inactive
                          </Badge>
                        )}
                        {listing.is_sold_out && (
                          <Badge variant="destructive" className="text-xs">
                            Sold Out
                          </Badge>
                        )}
                        {price !== null && priceLabel && (
                          <span className="text-xs text-muted-foreground">
                            $
                            {price.toLocaleString("en-AU", {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0,
                            })}
                            {priceLabel}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/listings/${listing.id}`}>View</Link>
                      </Button>
                      <Button size="sm" asChild>
                        <Link href={`/listings/${listing.id}/edit`}>Edit</Link>
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
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
