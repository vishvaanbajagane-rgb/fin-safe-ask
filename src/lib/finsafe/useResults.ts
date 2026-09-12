import { useEffect, useState } from "react";
import { finsafe, useFinSafe } from "./store";
import { loadStoredResults } from "./persist";
import { useAuth } from "@/hooks/useAuth";

/**
 * Results currently in memory, falling back to whatever was saved to the
 * signed-in user's account on a previous run.
 */
export function useResults() {
  const state = useFinSafe();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [tried, setTried] = useState(false);

  useEffect(() => {
    if (tried || authLoading) return;
    if (state.results.length || !user) {
      if (!user) setTried(true);
      return;
    }
    setTried(true);
    setLoading(true);
    loadStoredResults(user.id)
      .then((rows) => {
        if (rows.length) finsafe.set({ results: rows });
      })
      .finally(() => setLoading(false));
  }, [user, authLoading, tried, state.results.length]);

  return { results: state.results, loading: loading || authLoading, signedIn: !!user };
}
