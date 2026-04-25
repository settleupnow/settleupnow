import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export type SubscriptionStatus = "free" | "active" | "cancelled";
export type SubscriptionPlan = "basic" | "pro" | null;

export interface SubscriptionState {
  status: SubscriptionStatus;
  plan: SubscriptionPlan;
  loading: boolean;
  refresh: () => Promise<void>;
}

export function useSubscription(): SubscriptionState {
  const { user } = useAuth();
  const [status, setStatus] = useState<SubscriptionStatus>("free");
  const [plan, setPlan] = useState<SubscriptionPlan>(null);
  const [loading, setLoading] = useState(true);

  const fetchSub = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("business_profile")
      .select("subscription_status, subscription_plan")
      .eq("user_id", user.id)
      .maybeSingle();
    setStatus((data?.subscription_status as SubscriptionStatus) || "free");
    setPlan((data?.subscription_plan as SubscriptionPlan) || null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchSub();
  }, [fetchSub]);

  return { status, plan, loading, refresh: fetchSub };
}
