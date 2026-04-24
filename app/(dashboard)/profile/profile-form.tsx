"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Camera } from "lucide-react";
import { updateProfile, changePassword } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ProfileFormProps {
  initialData: {
    full_name: string;
    email: string;
    phone: string | null;
    avatar_url: string | null;
  };
  isOAuthUser: boolean;
}

export function ProfileForm({ initialData, isOAuthUser }: ProfileFormProps) {
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    initialData.avatar_url
  );
  const [isPending, setIsPending] = useState(false);
  const [isPendingPw, setIsPendingPw] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initials = initialData.full_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2 MB.");
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSubmit(formData: FormData) {
    setIsPending(true);
    const result = await updateProfile(formData);
    setIsPending(false);

    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success("Profile saved successfully.");
    }
  }

  async function handleChangePassword(formData: FormData) {
    setIsPendingPw(true);
    const result = await changePassword(formData);
    setIsPendingPw(false);

    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success("Password updated successfully.");
      const form = document.getElementById(
        "password-change-form"
      ) as HTMLFormElement | null;
      form?.reset();
    }
  }

  return (
    <div className="space-y-6">
      {/* Profile details form */}
      <form action={handleSubmit} className="space-y-6">
        {/* Avatar */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Profile photo</CardTitle>
            <CardDescription>
              Upload a photo to help others recognise you.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-5">
              <div className="relative">
                <Avatar className="h-20 w-20">
                  {avatarPreview ? (
                    <AvatarImage
                      src={avatarPreview}
                      alt={initialData.full_name}
                    />
                  ) : null}
                  <AvatarFallback className="text-xl">{initials}</AvatarFallback>
                </Avatar>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
                  aria-label="Change profile photo"
                >
                  <Camera className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="space-y-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Choose photo
                </Button>
                <p className="text-xs text-muted-foreground">
                  JPEG, PNG or WebP. Max 2 MB.
                </p>
              </div>
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              name="avatar"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={handleAvatarChange}
              aria-label="Upload profile photo"
            />
          </CardContent>
        </Card>

        {/* Personal details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Personal details</CardTitle>
            <CardDescription>
              Your name is shown to other users. Your phone number is only
              revealed after a booking is accepted.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="full_name">Full name</Label>
              <Input
                id="full_name"
                name="full_name"
                type="text"
                autoComplete="name"
                defaultValue={initialData.full_name}
                required
                placeholder="Alex Smith"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                value={initialData.email}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed here.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">
                Phone number{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                defaultValue={initialData.phone ?? ""}
                placeholder="04xx xxx xxx"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>

      {/* Password change — hidden for Google OAuth users */}
      {!isOAuthUser && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Change password</CardTitle>
            <CardDescription>
              Update the password for your ParkSpace account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              id="password-change-form"
              action={handleChangePassword}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <Label htmlFor="current_password">Current password</Label>
                <Input
                  id="current_password"
                  name="current_password"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="new_password">New password</Label>
                <Input
                  id="new_password"
                  name="new_password"
                  type="password"
                  autoComplete="new-password"
                  minLength={6}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  At least 6 characters.
                </p>
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  variant="outline"
                  size="sm"
                  disabled={isPendingPw}
                >
                  {isPendingPw ? "Updating…" : "Update password"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
