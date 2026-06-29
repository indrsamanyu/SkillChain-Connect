import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Briefcase, User as UserIcon, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuthStore, dashboardPathForRole } from "@/lib/auth-store";

type AuthMode = "signin" | "signup" | "reset";
type AuthRoleParam = "client" | "freelancer";
interface AuthSearch { mode?: AuthMode; role?: AuthRoleParam }

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in · SkillChain" },
      { name: "description", content: "Sign in or create your SkillChain account." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const search = Route.useSearch() as Record<string, string | undefined>;
  const mode: AuthMode = (["signin", "signup", "reset"] as const).includes(
    search.mode as AuthMode,
  )
    ? (search.mode as AuthMode)
    : "signin";
  const role: AuthRoleParam = search.role === "client" ? "client" : "freelancer";
  const navigate = useNavigate();
  const { session, role: userRole, loading } = useAuthStore();

  useEffect(() => {
    if (!loading && session && userRole) {
      navigate({ to: dashboardPathForRole(userRole), replace: true });
    }
  }, [loading, session, userRole, navigate]);

  return (
    <div className="relative min-h-screen bg-warm-gradient">
      <div className="absolute inset-x-0 top-0 -z-10 h-[400px] bg-gradient-to-b from-[var(--lavender)]/30 to-transparent blur-3xl" />
      <div className="mx-auto flex max-w-md flex-col px-6 py-10">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>
        <div className="mt-8 rounded-3xl border border-border/60 bg-surface-elevated p-7 shadow-elevated">
          {mode === "signin" && <SignInForm />}
          {mode === "signup" && <SignUpForm defaultRole={role} />}
          {mode === "reset" && <ResetForm />}
        </div>
      </div>
    </div>
  );
}

function FormShell({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}

function SignInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back!");
  }

  async function handleGoogle() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) toast.error(result.error.message ?? "Google sign-in failed");
  }

  return (
    <FormShell>
      <h1 className="font-display text-2xl font-semibold tracking-tight">Welcome back</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">Sign in to your SkillChain account.</p>

      <button
        type="button"
        onClick={handleGoogle}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium shadow-soft hover:bg-muted"
      >
        <GoogleIcon /> Continue with Google
      </button>

      <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <Field label="Email" type="email" value={email} onChange={setEmail} required />
        <Field label="Password" type="password" value={password} onChange={setPassword} required />
        <button
          type="submit"
          disabled={loading}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-medium text-background shadow-elevated disabled:opacity-60"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />} Sign in
        </button>
      </form>

      <div className="mt-5 flex items-center justify-between text-sm">
        <Link to="/auth" search={{ mode: "reset" } as never} className="text-muted-foreground hover:text-foreground">
          Forgot password?
        </Link>
        <Link to="/auth" search={{ mode: "signup" } as never} className="font-medium text-[var(--indigo)]">
          Create account
        </Link>
      </div>
    </FormShell>
  );
}

function SignUpForm({ defaultRole }: { defaultRole: "client" | "freelancer" }) {
  const [role, setRole] = useState<"client" | "freelancer">(defaultRole);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: fullName, role },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    setSent(true);
  }

  async function handleGoogle() {
    // Role for OAuth users defaults to freelancer via trigger; they can switch later
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) toast.error(result.error.message ?? "Google sign-in failed");
  }

  if (sent) {
    return (
      <FormShell>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Check your inbox</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We sent a verification link to <span className="font-medium text-foreground">{email}</span>.
          Click it to activate your account.
        </p>
        <div className="mt-6 rounded-xl border border-border/60 bg-muted/40 p-4 text-xs text-muted-foreground">
          Didn't receive it? Check spam, or wait a minute and try signing in.
        </div>
        <Link
          to="/auth"
          search={{ mode: "signin" } as never}
          className="mt-5 inline-block text-sm font-medium text-[var(--indigo)]"
        >
          Back to sign in
        </Link>
      </FormShell>
    );
  }

  return (
    <FormShell>
      <h1 className="font-display text-2xl font-semibold tracking-tight">Create your account</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">Join SkillChain in less than a minute.</p>

      <div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl border border-border bg-muted/40 p-1">
        <RoleTab
          active={role === "freelancer"}
          onClick={() => setRole("freelancer")}
          icon={<UserIcon className="h-4 w-4" />}
          label="Freelancer"
        />
        <RoleTab
          active={role === "client"}
          onClick={() => setRole("client")}
          icon={<Briefcase className="h-4 w-4" />}
          label="Client"
        />
      </div>

      <button
        type="button"
        onClick={handleGoogle}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium shadow-soft hover:bg-muted"
      >
        <GoogleIcon /> Continue with Google
      </button>

      <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <Field label="Full name" value={fullName} onChange={setFullName} required />
        <Field label="Email" type="email" value={email} onChange={setEmail} required />
        <Field label="Password" type="password" value={password} onChange={setPassword} required minLength={8} />
        <button
          type="submit"
          disabled={loading}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-medium text-background shadow-elevated disabled:opacity-60"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />} Create account
        </button>
      </form>

      <p className="mt-5 text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link to="/auth" search={{ mode: "signin" } as never} className="font-medium text-[var(--indigo)]">
          Sign in
        </Link>
      </p>
    </FormShell>
  );
}

function ResetForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    setSent(true);
  }

  return (
    <FormShell>
      <h1 className="font-display text-2xl font-semibold tracking-tight">Reset password</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        We'll send a secure link to your email.
      </p>
      {sent ? (
        <div className="mt-5 rounded-xl border border-border/60 bg-muted/40 p-4 text-sm">
          Check <span className="font-medium">{email}</span> for a reset link.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-5 space-y-3">
          <Field label="Email" type="email" value={email} onChange={setEmail} required />
          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-medium text-background shadow-elevated disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />} Send reset link
          </button>
        </form>
      )}
      <Link
        to="/auth"
        search={{ mode: "signin" } as never}
        className="mt-5 inline-block text-sm font-medium text-[var(--indigo)]"
      >
        Back to sign in
      </Link>
    </FormShell>
  );
}

function Field({
  label,
  type = "text",
  value,
  onChange,
  required,
  minLength,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  minLength?: number;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-medium text-foreground/80">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        minLength={minLength}
        className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm shadow-sm outline-none transition focus:border-[var(--indigo)] focus:ring-2 focus:ring-[var(--indigo)]/15"
      />
    </label>
  );
}

function RoleTab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${
        active ? "bg-surface-elevated text-foreground shadow-soft" : "text-muted-foreground"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"/>
    </svg>
  );
}