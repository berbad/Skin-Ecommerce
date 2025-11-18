"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { getCurrentUser } from "./getCurrentUser";

export type Address = {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

export type CurrentUser = {
  _id?: string;
  name: string;
  email: string;
  role: string;
  address?: Address;
  fullAddress?: string;
};

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const pathname = usePathname();
  const mounted = useRef(true);

  const fetchUser = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const u = await getCurrentUser();
      if (!mounted.current) return;
      setUser(u);
    } catch (err) {
      if (!mounted.current) return;
      setError(err);
      setUser(null);
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    fetchUser();
    return () => {
      mounted.current = false;
    };
  }, [fetchUser, pathname]);

  const refresh = useCallback(async () => {
    await fetchUser();
  }, [fetchUser]);

  return { user, loading, error, refresh };
}
