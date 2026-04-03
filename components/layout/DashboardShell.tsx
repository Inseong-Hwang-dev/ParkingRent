"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Car,
  BookOpen,
  User,
  Menu,
  X,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { LogoutButton } from "@/components/auth/logout-button";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/listings", label: "My Listings", icon: Car },
  { href: "/bookings", label: "Bookings", icon: BookOpen },
  { href: "/profile", label: "Profile", icon: User },
];

interface DashboardShellProps {
  children: React.ReactNode;
  user: {
    full_name: string;
    avatar_url: string | null;
    email: string;
  };
}

function NavLink({
  href,
  label,
  icon: Icon,
  onClick,
}: (typeof NAV_LINKS)[number] & { onClick?: () => void }) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </Link>
  );
}

function UserBadge({
  user,
}: {
  user: DashboardShellProps["user"];
}) {
  const initials = user.full_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex items-center gap-3 px-3 py-2">
      <Avatar className="h-8 w-8">
        <AvatarImage src={user.avatar_url ?? undefined} alt={user.full_name} />
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 overflow-hidden">
        <p className="truncate text-sm font-medium leading-none">
          {user.full_name}
        </p>
        <p className="truncate text-xs text-muted-foreground mt-0.5">
          {user.email}
        </p>
      </div>
    </div>
  );
}

function Sidebar({
  user,
  onNavClick,
}: {
  user: DashboardShellProps["user"];
  onNavClick?: () => void;
}) {
  return (
    <div className="flex h-full flex-col gap-2">
      {/* Logo */}
      <div className="flex h-14 items-center px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-4 w-4 text-primary-foreground"
              aria-hidden="true"
            >
              <path
                d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"
                fill="currentColor"
              />
            </svg>
          </div>
          <span className="font-bold tracking-tight">ParkSpace</span>
        </Link>
      </div>

      <Separator />

      {/* Nav links */}
      <nav className="flex-1 space-y-1 px-3 py-2">
        {NAV_LINKS.map((link) => (
          <NavLink key={link.href} {...link} onClick={onNavClick} />
        ))}
      </nav>

      <Separator />

      {/* Notifications + List a Space CTA */}
      <div className="px-3 py-2 space-y-2">
        <div className="flex items-center gap-2 px-1">
          <NotificationBell />
          <span className="text-sm text-muted-foreground">Notifications</span>
        </div>
        <Button asChild size="sm" className="w-full gap-2">
          <Link href="/listings/new">
            <Plus className="h-4 w-4" />
            List a Space
          </Link>
        </Button>
      </div>

      <Separator />

      {/* User + logout */}
      <div className="px-0 py-2 space-y-1">
        <UserBadge user={user} />
        <div className="px-3">
          <LogoutButton className="w-full justify-start" />
        </div>
      </div>
    </div>
  );
}

export function DashboardShell({ children, user }: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r bg-background">
        <Sidebar user={user} />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile slide-over sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 flex-col border-r bg-background transition-transform duration-200 md:hidden",
          mobileOpen ? "flex translate-x-0" : "-translate-x-full hidden"
        )}
      >
        <Sidebar user={user} onNavClick={() => setMobileOpen(false)} />
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile top bar */}
        <header className="flex h-14 items-center gap-4 border-b bg-background px-4 md:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation menu"
          >
            {mobileOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>

          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-4 w-4 text-primary-foreground"
                aria-hidden="true"
              >
                <path
                  d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"
                  fill="currentColor"
                />
              </svg>
            </div>
            <span className="font-bold tracking-tight">ParkSpace</span>
          </Link>

          <div className="ml-auto flex items-center gap-1">
            <NotificationBell />
            <Avatar className="h-8 w-8">
              <AvatarImage
                src={user.avatar_url ?? undefined}
                alt={user.full_name}
              />
              <AvatarFallback className="text-xs">
                {user.full_name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)}
              </AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
