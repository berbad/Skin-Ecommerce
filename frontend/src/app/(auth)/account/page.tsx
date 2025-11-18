"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { logout } from "@/lib/logout";

function getInitials(name?: string) {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || "").join("") || "U";
}

export default function AccountPage() {
  const router = useRouter();
  const { user, loading } = useCurrentUser();

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

  const initials = useMemo(() => getInitials(user?.name), [user?.name]);

  const formattedAddress = useMemo(() => {
    const a = user?.address;
    if (!a) return "No Address";
    const parts = [
      a.line1,
      a.line2,
      a.city,
      a.state,
      a.postalCode,
      a.country,
    ].filter((p) => typeof p === "string" && p.trim() !== "");
    return parts.length ? parts.join(", ") : "No Address";
  }, [user?.address]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardContent className="p-6 space-y-3">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-4 w-48" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header / Profile */}
      <section className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-pink-100 text-pink-700 flex items-center justify-center text-xl font-bold">
            {initials}
          </div>
          <div>
            <h1 className="text-2xl font-bold leading-tight">Account</h1>
            <p className="text-sm text-muted-foreground">
              {user.name || "No Name"}
            </p>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Account Details */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Account Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="text-muted-foreground">Name</div>
              <div className="font-medium text-right break-words max-w-[60%]">
                {user.name || "—"}
              </div>
            </div>
            <div className="flex items-start justify-between gap-3">
              <div className="text-muted-foreground">Email</div>
              <div className="font-medium text-right break-words max-w-[60%]">
                {user.email || "—"}
              </div>
            </div>
            <div className="flex items-start justify-between gap-3">
              <div className="text-muted-foreground">Address</div>
              <div className="font-medium text-right break-words max-w-[60%]">
                {formattedAddress}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Button
              variant="outline"
              className="justify-between cursor-pointer"
              onClick={() => router.push("/orders")}
            >
              View Orders{" "}
              <span className="text-xs text-muted-foreground">→</span>
            </Button>
            <Button
              variant="outline"
              className="justify-between cursor-pointer"
              onClick={() => router.push("/account/edit")}
            >
              Edit Profile{" "}
              <span className="text-xs text-muted-foreground">→</span>
            </Button>
            <Button
              variant="outline"
              className="justify-between cursor-pointer"
              onClick={() => router.push("/contact")}
            >
              Cancel an Order{" "}
              <span className="text-xs text-muted-foreground">→</span>
            </Button>
            <Button
              className="bg-pink-600 hover:bg-pink-700 cursor-pointer"
              onClick={logout}
            >
              Logout
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
