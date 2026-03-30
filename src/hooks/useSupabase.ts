"use client";

import { useSession, signOut as nextAuthSignOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

/**
 * Replaces the old useSupabase hook with NextAuth session.
 * Maintains the same interface for backward compatibility.
 */
export function useSupabase() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const signOut = useCallback(async () => {
    await nextAuthSignOut({ redirect: false });
    router.push("/login");
  }, [router]);

  return {
    user: session?.user
      ? {
          id: session.user.id,
          email: session.user.email || "",
          user_metadata: {
            full_name: session.user.name,
          },
        }
      : null,
    loading: status === "loading",
    signOut,
  };
}
