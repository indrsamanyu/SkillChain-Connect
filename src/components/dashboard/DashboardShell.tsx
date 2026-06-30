import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  FileText,
  Bell,
  Settings,
  LogOut,
  Sparkles,
  Shield,
  Search,
  BarChart3,
  FolderKanban,
  AlertTriangle,
  Check,
  Rss,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { useAuthStore, type AppRole } from "@/lib/auth-store";
import {
  listMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications.functions";

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV: Record<AppRole, NavItem[]> = {
  freelancer: [
    { to: "/freelancer", label: "Dashboard", icon: LayoutDashboard },
    { to: "/feed", label: "Feed", icon: Rss },
    { to: "/freelancer/jobs", label: "Jobs", icon: Search },
    { to: "/freelancer/applications", label: "Applications", icon: FileText },
    { to: "/freelancer/portfolio", label: "Portfolio", icon: FolderKanban },
    { to: "/freelancer/profile", label: "Profile", icon: Users },
  ],
  client: [
    { to: "/client", label: "Dashboard", icon: LayoutDashboard },
    { to: "/feed", label: "Feed", icon: Rss },
    { to: "/client/jobs", label: "My jobs", icon: Briefcase },
    { to: "/client/candidates", label: "Candidates", icon: Users },
    { to: "/client/analytics", label: "Analytics", icon: BarChart3 },
  ],
  admin: [
    { to: "/admin", label: "Overview", icon: LayoutDashboard },
    { to: "/admin/users", label: "Users", icon: Users },
    { to: "/admin/reports", label: "Reports", icon: AlertTriangle },
  ],
};

export function DashboardShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { role, user, signOut } = useAuthStore();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const items = NAV[role ?? "freelancer"];

  async function handleSignOut() {
    await signOut();
    navigate({ to: "/auth", search: { mode: "signin" } as never, replace: true });
  }

  return (
    <div className="flex min-h-screen bg-warm-gradient">
      <aside className="sticky top-0 hidden h-screen w-64 flex-col border-r border-border/60 bg-surface-elevated/80 px-4 py-6 md:flex">
        <Link to="/" className="flex items-center gap-2 px-2">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-[var(--indigo)] text-white">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="font-display text-lg font-semibold">SkillChain</span>
        </Link>
        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {items.map((item) => {
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`group relative flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition ${
                  active
                    ? "bg-foreground text-background shadow-soft"
                    : "text-foreground/70 hover:bg-muted hover:text-foreground"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-4 space-y-1 border-t border-border/60 pt-4">
          <button className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-foreground/70 hover:bg-muted">
            <Settings className="h-4 w-4" /> Settings
          </button>
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-foreground/70 hover:bg-muted"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border/40 bg-background/70 px-6 py-3 backdrop-blur">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {role === "admin" && <Shield className="h-3 w-3" />}
              {role ?? "..."}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <NotificationsBell />
            <div className="grid h-9 w-9 place-items-center rounded-full bg-[var(--indigo)] text-sm font-semibold text-white">
              {(user?.email?.[0] ?? "?").toUpperCase()}
            </div>
          </div>
        </header>
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
          className="mx-auto max-w-6xl px-6 py-8"
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}

export function PagePlaceholder({
  title,
  description,
  badge,
}: {
  title: string;
  description: string;
  badge?: string;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-border bg-surface-elevated/60 p-12 text-center">
      {badge && (
        <span className="inline-block rounded-full bg-[var(--lavender)]/30 px-3 py-1 text-xs font-medium uppercase tracking-wider text-foreground/70">
          {badge}
        </span>
      )}
      <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const { session } = useAuthStore();
  const listFn = useServerFn(listMyNotifications);
  const markFn = useServerFn(markNotificationRead);
  const markAllFn = useServerFn(markAllNotificationsRead);
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["my-notifications"],
    queryFn: () => listFn(),
    enabled: Boolean(session),
    refetchOnWindowFocus: true,
  });
  const unread = (data ?? []).filter((n: any) => !n.is_read).length;

  const markOne = useMutation({
    mutationFn: (id: string) => markFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-notifications"] }),
  });
  const markAll = useMutation({
    mutationFn: () => markAllFn(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-notifications"] }),
  });

  return (
    <div className="relative">
      <button
        aria-label="Notifications"
        onClick={() => setOpen((v) => !v)}
        className="relative grid h-9 w-9 place-items-center rounded-full hover:bg-muted"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-[var(--coral)] px-1 text-[10px] font-semibold text-white">
            {unread}
          </span>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute right-0 z-40 mt-2 w-80 overflow-hidden rounded-2xl border border-border/60 bg-surface-elevated shadow-elevated"
          >
            <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
              <span className="text-sm font-semibold">Notifications</span>
              {unread > 0 && (
                <button
                  onClick={() => markAll.mutate()}
                  className="text-xs font-medium text-[var(--indigo)] hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {(data ?? []).length === 0 && (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                  No notifications yet
                </p>
              )}
              {(data ?? []).map((n: any) => (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 border-b border-border/40 px-4 py-3 last:border-0 ${
                    n.is_read ? "opacity-60" : "bg-[var(--lavender)]/10"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{n.title}</p>
                    {n.message && (
                      <p className="mt-0.5 text-xs text-muted-foreground">{n.message}</p>
                    )}
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {new Date(n.created_at).toLocaleString()}
                    </p>
                  </div>
                  {!n.is_read && (
                    <button
                      onClick={() => markOne.mutate(n.id)}
                      aria-label="Mark read"
                      className="grid h-7 w-7 place-items-center rounded-full hover:bg-muted"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}