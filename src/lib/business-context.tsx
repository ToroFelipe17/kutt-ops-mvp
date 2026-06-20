/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
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
  error: string | null;
  refresh: () => Promise<void>;
}

const BusinessContext = createContext<Ctx>({
  business: null,
  loading: true,
  error: null,
  refresh: async () => {},
});

export function BusinessProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    if (authLoading) {
      setLoading(true);
      return;
    }

    if (!userId) {
      setBusiness(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const { data, error: loadError } = await supabase
      .from("businesses")
      .select("id,name,logo_url,primary_color,currency,open_hour,close_hour,onboarded")
      .eq("owner_id", userId)
      .order("onboarded", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (requestId !== requestIdRef.current) return;

    if (loadError) {
      console.error("Failed to load business", loadError);
      setError("No pudimos cargar tu negocio. Revisa tu conexión e intenta nuevamente.");
      setLoading(false);
      return;
    }

    setBusiness(data as Business | null);
    setLoading(false);
  }, [authLoading, userId]);

  useEffect(() => {
    void load();
    return () => {
      requestIdRef.current += 1;
    };
  }, [load]);

  return (
    <BusinessContext.Provider value={{ business, loading, error, refresh: load }}>
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  return useContext(BusinessContext);
}
