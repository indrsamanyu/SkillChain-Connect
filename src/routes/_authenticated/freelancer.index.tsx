import { createFileRoute, Link } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { motion } from "framer-motion";
import { Sparkles, FileText, Briefcase, ArrowRight, User, FolderKanban } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/lib/auth-store";

export const Route = createFileRoute("/_authenticated/freelancer/")({
  head: () => ({ meta: [{ title: "Freelancer dashboard · SkillChain" }] }),
  component: FreelancerDashboard,
});

function FreelancerDashboard() {
  const user = useAuthStore((s) => s.user);

  const { data: stats } = useQuery({
    queryKey: ["freelancer-stats", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, freelancer_profiles(ai_score, title)")
        .eq("auth_user_id", user!.id)
        .maybeSingle();
      const profileId = profile?.id;
      if (!profileId) return { profile, applications: 0, jobs: 0 };
      const [{ count: apps }, { count: jobs }] = await Promise.all([
        supabase.from("applications").select("id", { count: "exact", head: true }).eq("freelancer_id", profileId),
        supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "open"),
      ]);
      return { profile, applications: apps ?? 0, jobs: jobs ?? 0 };
    },
  });

  const fp = (stats?.profile as { freelancer_profiles?: { ai_score?: number | null; title?: string | null } } | null | undefined)?.freelancer_profiles;
  const aiScore = fp?.ai_score;

  const cards = [
    { label: "AI profile score", value: aiScore ? `${Math.round(aiScore)}` : "—", icon: Sparkles, hint: aiScore ? "Based on your resume + skills" : "Complete your profile to unlock" },
    { label: "Active applications", value: String(stats?.applications ?? 0), icon: FileText, hint: "Across all jobs you've applied to" },
    { label: "Open jobs", value: String(stats?.jobs ?? 0), icon: Briefcase, hint: "Live opportunities right now" },
  ];

  const quick = [
    { to: "/freelancer/profile", label: "Edit profile", icon: User, color: "var(--indigo)" },
    { to: "/freelancer/portfolio", label: "Add portfolio", icon: FolderKanban, color: "var(--coral)" },
    { to: "/freelancer/jobs", label: "Browse jobs", icon: Briefcase, color: "var(--sage)" },
  ] as const;

  return (
    <DashboardShell>
      <div className="space-y-8">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Freelancer</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            Welcome back{(stats?.profile as { full_name?: string | null } | null)?.full_name ? `, ${(stats?.profile as { full_name: string }).full_name.split(" ")[0]}` : ""} 👋
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Here's a snapshot of your work on SkillChain.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {cards.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="rounded-2xl border border-border/60 bg-surface-elevated p-5 shadow-soft"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{s.label}</span>
                <s.icon className="h-4 w-4 text-[var(--indigo)]" />
              </div>
              <p className="mt-3 font-display text-3xl font-semibold">{s.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{s.hint}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {quick.map((q) => (
            <Link
              key={q.to}
              to={q.to}
              className="group flex items-center justify-between rounded-2xl border border-border/60 bg-surface-elevated/80 p-4 shadow-soft transition hover:border-foreground/30 hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-xl text-white" style={{ background: q.color }}>
                  <q.icon className="h-4 w-4" />
                </span>
                <span className="text-sm font-medium">{q.label}</span>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
            </Link>
          ))}
        </div>
      </div>
    </DashboardShell>
  );
}