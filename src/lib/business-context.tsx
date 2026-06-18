/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./auth-context";

export interface Business {
  id: string;
  name: string;
  logo_url: string | null;
  primary_color: string | null;
  currency: string;
  open_hour: number;
  close_hour: number;
  onboarded: boolean;
}

interface Ctx {
  business: Business | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const BusinessContext = createContext<Ctx>({
  business: null,
  loading: true,
  refresh: async () => {},
});

export function BusinessProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) {
      setBusiness(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("businesses")
      .select("id,name,logo_url,primary_color,currency,open_hour,close_hour,onboarded")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    setBusiness(data as Business | null);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return (
    <BusinessContext.Provider value={{ business, loading, refresh: load }}>
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  return useContext(BusinessContext);
}
