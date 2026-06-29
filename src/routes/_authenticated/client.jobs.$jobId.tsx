import { createFileRoute, Link } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Sparkles, ArrowLeft, CheckCircle2, AlertCircle, ChevronDown } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { explainCandidate, type CandidateInsight } from "@/lib/client-ai.functions";
import { motion, AnimatePresence } from "framer-motion";

export const Route = createFileRoute("/_authenticated/client/jobs/$jobId")({
  head: () => ({ meta: [{ title: "Job · SkillChain" }] }),
  component: ClientJobDetail,
});

function ClientJobDetail() {
  const { jobId } = Route.useParams();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["client-job", jobId],
    queryFn: async () => {
      const { data: job } = await supabase.from("jobs").select("*").eq("id", jobId).maybeSingle();
      if (!job) return null;
      const { data: apps } = await supabase
        .from("applications")
        .select("id, status, cover_letter, proposed_rate, ai_match_score, ai_insights, created_at, freelancer:profiles!applications_freelancer_id_fkey(id, full_name, headline, location, freelancer_profiles(title, hourly_rate, experience_years, ai_summary))")
        .eq("job_id", jobId)
        .order("ai_match_score", { ascending: false, nullsFirst: false });
      return { job, apps: apps ?? [] };
    },
  });

  const closeJob = useMutation({
    mutationFn: async (status: "open" | "closed") => {
      const { error } = await supabase.from("jobs").update({ status }).eq("id", jobId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Job updated"); qc.invalidateQueries({ queryKey: ["client-job"] }); qc.invalidateQueries({ queryKey: ["client-jobs"] }); },
  });

  const updateApp = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "pending" | "shortlisted" | "accepted" | "rejected" }) => {
      const { error } = await supabase.from("applications").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Status updated"); qc.invalidateQueries({ queryKey: ["client-job"] }); },
  });

  if (isLoading) return <DashboardShell><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></DashboardShell>;
  if (!data?.job) return <DashboardShell><p className="text-sm text-muted-foreground">Job not found.</p></DashboardShell>;

  const job = data.job;

  return (
    <DashboardShell>
      <div className="space-y-8">
        <Link to="/client/jobs" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" /> Back to jobs</Link>

        <div className="rounded-3xl border border-border/60 bg-surface-elevated p-6 shadow-soft">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-display text-3xl font-semibold tracking-tight">{job.title}</h1>
                <Badge variant="outline" className="capitalize">{job.status}</Badge>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {(job.budget_min || job.budget_max) && <span>${job.budget_min ?? "—"}–${job.budget_max ?? "—"}</span>}
                {job.duration && <span>· {job.duration}</span>}
                {job.experience_level && <span>· {job.experience_level}</span>}
              </div>
            </div>
            <Button variant="outline" onClick={() => closeJob.mutate(job.status === "open" ? "closed" : "open")}>
              {job.status === "open" ? "Close job" : "Reopen"}
            </Button>
          </div>
          <p className="mt-4 whitespace-pre-wrap text-sm text-foreground/80">{job.description}</p>
          {job.required_skills && job.required_skills.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {job.required_skills.map((s) => <Badge key={s} variant="secondary" className="capitalize">{s}</Badge>)}
            </div>
          )}
        </div>

        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight">Candidates ({data.apps.length})</h2>
          <p className="mt-1 text-sm text-muted-foreground">Ranked by AI match score.</p>
        </div>

        <div className="space-y-3">
          {data.apps.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border bg-surface-elevated/60 p-8 text-center text-sm text-muted-foreground">No applicants yet.</p>
          ) : (
            data.apps.map((a) => (
              <CandidateCard key={a.id} app={a} jobId={jobId} onStatus={(status) => updateApp.mutate({ id: a.id, status })} />
            ))
          )}
        </div>
      </div>
    </DashboardShell>
  );
}

type Application = {
  id: string;
  status: string;
  cover_letter: string | null;
  proposed_rate: number | null;
  ai_match_score: number | null;
  ai_insights: unknown;
  created_at: string;
  freelancer: {
    id: string;
    full_name: string | null;
    headline: string | null;
    location: string | null;
    freelancer_profiles: { title: string | null; hourly_rate: number | null; experience_years: number | null; ai_summary: string | null } | null;
  } | null;
};

function CandidateCard({ app, jobId, onStatus }: { app: Application; jobId: string; onStatus: (s: "pending" | "shortlisted" | "accepted" | "rejected") => void }) {
  const explain = useServerFn(explainCandidate);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [insight, setInsight] = useState<CandidateInsight | null>((app.ai_insights as CandidateInsight) ?? null);

  async function runExplain() {
    setAnalyzing(true);
    try {
      const res = await explain({ data: { jobId, applicationId: app.id } });
      setInsight(res);
      qc.invalidateQueries({ queryKey: ["client-job"] });
    } catch (e) { toast.error((e as Error).message); }
    finally { setAnalyzing(false); }
  }

  const f = app.freelancer;
  const fp = f?.freelancer_profiles;
  const score = app.ai_match_score ?? 0;
  const scoreColor = score >= 70 ? "var(--sage)" : score >= 40 ? "var(--amber)" : "var(--coral)";

  return (
    <motion.article initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border/60 bg-surface-elevated p-5 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-lg font-semibold tracking-tight">{f?.full_name ?? "Unnamed"}</h3>
            <Badge variant="outline" className="capitalize">{app.status}</Badge>
          </div>
          <p className="text-sm text-foreground/70">{fp?.title ?? f?.headline ?? "—"}</p>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {f?.location && <span>{f.location}</span>}
            {fp?.experience_years != null && <span>· {fp.experience_years}y exp</span>}
            {app.proposed_rate && <span>· ${app.proposed_rate}/hr</span>}
            <span>· Applied {new Date(app.created_at).toLocaleDateString()}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-background px-2.5 py-1 text-xs font-semibold" style={{ color: scoreColor }}>
            <Sparkles className="h-3 w-3" /> {score}% match
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" onClick={() => onStatus("shortlisted")}>Shortlist</Button>
            <Button size="sm" onClick={() => onStatus("accepted")}>Accept</Button>
            <Button size="sm" variant="ghost" onClick={() => onStatus("rejected")}>Reject</Button>
          </div>
        </div>
      </div>

      <button onClick={() => setOpen(!open)} className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
        <ChevronDown className={`h-3.5 w-3.5 transition ${open ? "rotate-180" : ""}`} /> {open ? "Hide" : "Show"} details
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="mt-3 space-y-3 border-t border-border/60 pt-3">
              {app.cover_letter && (
                <div>
                  <div className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Cover letter</div>
                  <p className="whitespace-pre-wrap text-sm text-foreground/80">{app.cover_letter}</p>
                </div>
              )}
              {fp?.ai_summary && (
                <div>
                  <div className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Profile summary</div>
                  <p className="text-sm text-foreground/80">{fp.ai_summary}</p>
                </div>
              )}

              <div className="rounded-2xl bg-background/60 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium"><Sparkles className="h-4 w-4 text-[var(--indigo)]" /> Why this candidate</div>
                  <Button size="sm" variant="outline" onClick={runExplain} disabled={analyzing}>
                    {analyzing ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
                    {insight ? "Regenerate" : "Generate"}
                  </Button>
                </div>
                {insight && (
                  <div className="mt-3 space-y-2 text-sm">
                    <p className="font-medium">{insight.verdict}</p>
                    <p className="text-foreground/80">{insight.fit}</p>
                    <div className="grid gap-3 md:grid-cols-2">
                      <FeedbackList icon={<CheckCircle2 className="h-3.5 w-3.5 text-[var(--sage)]" />} title="Highlights" items={insight.highlights} />
                      <FeedbackList icon={<AlertCircle className="h-3.5 w-3.5 text-[var(--coral)]" />} title="Concerns" items={insight.concerns} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}

function FeedbackList({ title, items, icon }: { title: string; items: string[]; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-muted/40 p-3">
      <div className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</div>
      <ul className="space-y-1.5">{items?.map((it, i) => <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">{icon}<span>{it}</span></li>)}</ul>
    </div>
  );
}