import { useEffect } from "react";
import { base44 } from "@/api/base44Client";

/**
 * Invisible component — tracks product views and saves to user profile.
 * Drop inside any product detail page: <RecentlyViewedTracker productId={id} user={user} />
 */
export default function RecentlyViewedTracker({ productId, user }) {
  useEffect(() => {
    if (!productId || !user) return;

    const track = async () => {
      const current = user.recently_viewed || [];
      // Deduplicate and keep latest 30
      const updated = [productId, ...current.filter(id => id !== productId)].slice(0, 30);
      await base44.auth.updateMe({ recently_viewed: updated });
    };

    track();
  }, [productId, user?.id]);

  return null;
}