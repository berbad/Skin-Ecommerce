"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import axios from "@/lib/axios";

type Address = {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

export default function EditProfilePage() {
  const router = useRouter();
  const { user, loading, refresh } = useCurrentUser();

  // Profile fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  // Address fields
  const [address, setAddress] = useState<Address>({
    line1: "",
    line2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "United States",
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      setName(user.name || "");
      setEmail(user.email || "");
      const uaddr = user.address || ({} as Address);
      setAddress({
        line1: uaddr.line1 || "",
        line2: uaddr.line2 || "",
        city: uaddr.city || "",
        state: uaddr.state || "",
        postalCode: uaddr.postalCode || "",
        country: uaddr.country || "United States",
      });
    }
  }, [loading, user]);

  const handleAddressChange = (field: keyof Address, val: string) => {
    setAddress((prev) => ({ ...prev, [field]: val }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await axios.put(
        "/auth/profile",
        { name, email, address },
        { withCredentials: true }
      );
      if (res.data?.user) {
        await refresh;
      } else {
        await refresh();
      }
      router.push("/account");
    } catch (err) {
      console.error("Failed to update profile", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <Skeleton className="h-8 w-40" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-40" />
          </div>
        </div>
        <Skeleton className="h-10 w-36" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Edit Profile</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/account")}>
            Cancel
          </Button>
          <Button
            className="bg-pink-600 hover:bg-pink-700"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Profile */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">Name</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Email</label>
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            type="email"
          />
        </div>
      </section>

      {/* Manage Address */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Manage Address</h2>

        <div className="space-y-2">
          <label className="text-sm font-medium">Address Line 1</label>
          <Input
            value={address.line1}
            onChange={(e) => handleAddressChange("line1", e.target.value)}
            placeholder="123 Main St"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            Address Line 2 (optional)
          </label>
          <Input
            value={address.line2 || ""}
            onChange={(e) => handleAddressChange("line2", e.target.value)}
            placeholder="Apt, suite, unit, etc."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">City</label>
            <Input
              value={address.city}
              onChange={(e) => handleAddressChange("city", e.target.value)}
              placeholder="City"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">State/Province</label>
            <Input
              value={address.state}
              onChange={(e) => handleAddressChange("state", e.target.value)}
              placeholder="IL"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Postal Code</label>
            <Input
              value={address.postalCode}
              onChange={(e) =>
                handleAddressChange("postalCode", e.target.value)
              }
              placeholder="ZIP / Postal code"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Country</label>
          <Input
            value={address.country}
            onChange={(e) => handleAddressChange("country", e.target.value)}
            placeholder="United States"
          />
        </div>
      </section>
    </div>
  );
}
