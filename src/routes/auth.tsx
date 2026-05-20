import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { motion } from "motion/react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  if (loading) return null;
  if (user) return <Navigate to="/" />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name: name.trim() },
            emailRedirectTo: `${window.location.origin}/`,
          },
        });
        if (error) throw error;
        toast.success("Cuenta creada");
        navigate({ to: "/" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        navigate({ to: "/" });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error";
      toast.error(
        msg.includes("Invalid login") ? "Correo o contraseña incorrectos" :
        msg.includes("already registered") ? "Ese correo ya está registrado" :
        msg
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background safe-top safe-bottom">
      <div className="flex-1 flex flex-col justify-center px-6 max-w-md mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="mb-10"
        >
          <div className="flex items-center gap-2 mb-8">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-success to-info grid place-items-center text-background font-bold text-sm">S</div>
            <span className="text-base font-semibold tracking-tight">Sillón</span>
          </div>
          <h1 className="text-[28px] leading-tight font-semibold tracking-tight">
            {mode === "signup" ? "Crea tu cuenta" : "Bienvenido de vuelta"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "signup" ? "Tu barbería, en tu bolsillo." : "Ingresa para continuar."}
          </p>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut", delay: 0.05 }}
          onSubmit={submit}
          className="space-y-3"
        >
          {mode === "signup" && (
            <Field
              label="Nombre"
              type="text"
              value={name}
              onChange={setName}
              placeholder="Tu nombre"
              required
            />
          )}
          <Field
            label="Correo"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="tu@correo.cl"
            autoComplete="email"
            required
          />
          <Field
            label="Contraseña"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="Mínimo 6 caracteres"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            minLength={6}
            required
          />

          <button
            type="submit"
            disabled={busy}
            className="w-full h-14 rounded-2xl bg-foreground text-background font-medium text-[15px] active:scale-[0.98] transition-transform disabled:opacity-60"
          >
            {busy ? "Procesando..." : mode === "signup" ? "Crear cuenta" : "Entrar"}
          </button>
        </motion.form>

        <button
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
          className="mt-6 text-sm text-muted-foreground active:text-foreground transition-colors text-center"
        >
          {mode === "login" ? (
            <>¿Sin cuenta? <span className="text-foreground font-medium">Crear una</span></>
          ) : (
            <>¿Ya tienes cuenta? <span className="text-foreground font-medium">Entrar</span></>
          )}
        </button>
      </div>
    </div>
  );
}

function Field(props: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
  minLength?: number;
}) {
  return (
    <label className="block">
      <span className="text-xs text-muted-foreground font-medium px-1">{props.label}</span>
      <input
        type={props.type}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
        required={props.required}
        autoComplete={props.autoComplete}
        minLength={props.minLength}
        className="mt-1 w-full h-14 px-4 rounded-2xl bg-surface hairline text-[15px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:hairline-strong transition-shadow"
      />
    </label>
  );
}
