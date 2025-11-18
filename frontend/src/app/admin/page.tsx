"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/useCurrentUser";
import AdminProductTable from "@/components/product/AdminProductTable";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminPage() {
  const { user, loading } = useCurrentUser();
  const router = useRouter();
  const [refresh, setRefresh] = useState(false);

  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) {
      router.push("/");
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <main className="p-6">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-96 w-full" />
      </main>
    );
  }

  if (!user || user.role !== "admin") return null;

  return (
    <main className="p-6">
      <h1 className="text-3xl font-bold mb-4">Admin Dashboard</h1>
      <AdminProductTable refresh={refresh} />
    </main>
  );
}
