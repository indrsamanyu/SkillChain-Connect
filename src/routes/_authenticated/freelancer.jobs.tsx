import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/lib/auth-store";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Search, Sparkles, Send } from "lucide-react";
import { scoreJobs } from "@/lib/match-score";
import { motion } from "framer-motion";

export const Route = createFileRoute("/_authenticated/freelancer/jobs")({
  head: () => ({ meta: [{ title: "Jobs · SkillChain" }] }),
  component: JobsPage,
});

function JobsPage() {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [q, setQ] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["jobs-feed", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [{ data: jobs }, { data: profile }] = await Promise.all([
        supabase
          .from("jobs")
          .select("id, title, description, required_skills, budget_min, budget_max, duration, experience_level, created_at, client_id")
          .eq("status", "open")
          .order("created_at", { ascending: false })
          .limit(50),
        supabase.from("profiles").select("id, freelancer_profiles(title, resume_text)").eq("auth_user_id", user!.id).maybeSingle(),
      ]);
      const profileId = profile?.id ?? null;
      const skillsRes = profileId
        ? await supabase.from("freelancer_skills").select("skills(name)").eq("freelancer_id", profileId)
        : { data: [] as Array<{ skills: { name: string } | null }> };
      const skills = ((skillsRes.data ?? []) as Array<{ skills: { name: string } | null }>)
        .map((s) => s.skills?.name ?? "")
        .filter(Boolean);
      const fp = (profile?.freelancer_profiles ?? null) as { title?: string | null; resume_text?: string | null } | null;
      const applied = profileId
        ? (await supabase.from("applications").select("job_id").eq("freelancer_id", profileId)).data ?? []
        : [];
      return {
        jobs: jobs ?? [],
        profileId,
        profile: { title: fp?.title ?? null, skills, resume_text: fp?.resume_text ?? null },
        appliedJobIds: new Set(applied.map((a) => a.job_id)),
      };
    },
  });

  const scored = useMemo(() => {
    if (!data) return [];
    const scores = scoreJobs(data.profile, data.jobs);
    return data.jobs
      .map((j) => ({ ...j, score: scores.get(j.id) ?? 0 }))
      .sort((a, b) => b.score - a.score);
  }, [data]);

  const filtered = scored.filter((j) => {
    if (!q.trim()) return true;
    const needle = q.toLowerCase();
    return j.title.toLowerCase().includes(needle) || j.description.toLowerCase().includes(needle) || (j.required_skills ?? []).some((s) => s.toLowerCase().includes(needle));
  });

  const [applying, setApplying] = useState<{ job: typeof scored[number] } | null>(null);
  const [coverLetter, setCoverLetter] = useState("");
  const [proposedRate, setProposedRate] = useState("");

  const apply = useMutation({
    mutationFn: async () => {
      if (!applying || !data?.profileId) throw new Error("Not ready");
      const { error } = await supabase.from("applications").insert({
        job_id: applying.job.id,
        freelancer_id: data.profileId,
        cover_letter: coverLetter || null,
        proposed_rate: proposedRate ? Number(proposedRate) : null,
        ai_match_score: applying.job.score,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Application sent");
      setApplying(null);
      setCoverLetter("");
      setProposedRate("");
      qc.invalidateQueries({ queryKey: ["jobs-feed"] });
      qc.invalidateQueries({ queryKey: ["my-applications"] });
      qc.invalidateQueries({ queryKey: ["freelancer-stats"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <DashboardShell>
      <div className="space-y-8">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Jobs</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Find your next project</h1>
          <p className="mt-1 text-sm text-muted-foreground">Ranked by AI match score using your skills and resume.</p>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search jobs, skills, keywords" className="pl-9" />
        </div>

        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : filtered.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-surface-elevated/60 p-12 text-center text-sm text-muted-foreground">No jobs found.</p>
        ) : (
          <div className="space-y-3">
            {filtered.map((j, i) => {
              const applied = data!.appliedJobIds.has(j.id);
              return (
                <motion.article
                  key={j.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i, 8) * 0.03 }}
                  className="rounded-2xl border border-border/60 bg-surface-elevated p-5 shadow-soft transition hover:border-foreground/20"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display text-xl font-semibold tracking-tight">{j.title}</h3>
                      <p className="mt-1 line-clamp-2 text-sm text-foreground/80">{j.description}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {(j.required_skills ?? []).slice(0, 6).map((s) => (
                          <Badge key={s} variant="secondary" className="capitalize">{s}</Badge>
                        ))}
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        {(j.budget_min || j.budget_max) && (
                          <span>${j.budget_min ?? "—"} – ${j.budget_max ?? "—"}</span>
                        )}
                        {j.duration && <span>· {j.duration}</span>}
                        {j.experience_level && <span>· {j.experience_level}</span>}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <MatchPill score={j.score} />
                      <Button
                        size="sm"
                        disabled={applied}
                        onClick={() => setApplying({ job: j })}
                        className="gap-1.5"
                      >
                        {applied ? "Applied" : <><Send className="h-3.5 w-3.5" /> Apply</>}
                      </Button>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={!!applying} onOpenChange={(o) => !o && setApplying(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply to {applying?.job.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-xl bg-muted/50 p-3 text-sm">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground"><Sparkles className="h-3.5 w-3.5" /> AI match</div>
              <p className="mt-1 font-display text-2xl font-semibold">{applying?.job.score}<span className="text-base font-normal text-muted-foreground">/100</span></p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Proposed rate (USD/hr)</Label>
              <Input type="number" value={proposedRate} onChange={(e) => setProposedRate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Cover letter</Label>
              <Textarea rows={6} value={coverLetter} onChange={(e) => setCoverLetter(e.target.value)} placeholder="Why are you a great fit for this role?" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => apply.mutate()} disabled={apply.isPending}>
              {apply.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Send application
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}

function MatchPill({ score }: { score: number }) {
  const color =
    score >= 70 ? "var(--sage)" : score >= 40 ? "var(--amber)" : "var(--coral)";
  return (
    <div className="flex items-center gap-1.5 rounded-full bg-background px-2.5 py-1 text-xs font-semibold" style={{ color }}>
      <Sparkles className="h-3 w-3" />
      {score}% match
    </div>
  );
}