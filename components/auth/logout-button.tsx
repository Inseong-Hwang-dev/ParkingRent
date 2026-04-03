"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

interface LogoutButtonProps {
  className?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
}

export function LogoutButton({ className, variant = "ghost" }: LogoutButtonProps) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <Button variant={variant} className={className} onClick={handleLogout}>
      Sign out
    </Button>
  );
}
