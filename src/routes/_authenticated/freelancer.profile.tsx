import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/lib/auth-store";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Sparkles, Upload, Loader2, X, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { analyzeResume, type ResumeAnalysis } from "@/lib/freelancer-ai.functions";
import { motion, AnimatePresence } from "framer-motion";

export const Route = createFileRoute("/_authenticated/freelancer/profile")({
  head: () => ({ meta: [{ title: "Profile · SkillChain" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const analyze = useServerFn(analyzeResume);

  const { data, isLoading } = useQuery({
    queryKey: ["freelancer-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("id, full_name, headline, bio, location, avatar_url, freelancer_profiles(title, hourly_rate, experience_years, availability, ai_summary, ai_score, resume_url)")
        .eq("auth_user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      if (!profile) return null;
      const { data: skills } = await supabase
        .from("freelancer_skills")
        .select("id, skills(name)")
        .eq("freelancer_id", profile.id);
      return { profile, skills: skills ?? [] };
    },
  });

  const [form, setForm] = useState({
    full_name: "", headline: "", bio: "", location: "",
    title: "", hourly_rate: "", experience_years: "", availability: "available" as "available" | "busy" | "unavailable",
  });
  const [skillInput, setSkillInput] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [resumeText, setResumeText] = useState("");
  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    if (!data?.profile) return;
    const p = data.profile;
    const fp = (p.freelancer_profiles ?? {}) as { title?: string | null; hourly_rate?: number | null; experience_years?: number | null; availability?: string | null };
    setForm({
      full_name: p.full_name ?? "",
      headline: p.headline ?? "",
      bio: p.bio ?? "",
      location: p.location ?? "",
      title: fp.title ?? "",
      hourly_rate: fp.hourly_rate != null ? String(fp.hourly_rate) : "",
      experience_years: fp.experience_years != null ? String(fp.experience_years) : "",
      availability: (fp.availability as "available" | "busy" | "unavailable") ?? "available",
    });
    setSkills((data.skills as Array<{ skills: { name: string } | null }>).map((s) => s.skills?.name ?? "").filter(Boolean));
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      if (!data?.profile) throw new Error("Profile not loaded");
      const profileId = data.profile.id;
      const { error: e1 } = await supabase
        .from("profiles")
        .update({
          full_name: form.full_name || null,
          headline: form.headline || null,
          bio: form.bio || null,
          location: form.location || null,
        })
        .eq("id", profileId);
      if (e1) throw e1;
      const { error: e2 } = await supabase.from("freelancer_profiles").upsert(
        {
          profile_id: profileId,
          title: form.title || null,
          hourly_rate: form.hourly_rate ? Number(form.hourly_rate) : null,
          experience_years: form.experience_years ? Number(form.experience_years) : null,
          availability: form.availability,
        },
        { onConflict: "profile_id" },
      );
      if (e2) throw e2;

      // Sync skills: ensure skills exist, then sync freelancer_skills.
      const desired = Array.from(new Set(skills.map((s) => s.trim().toLowerCase()).filter(Boolean)));
      const { data: existing } = await supabase.from("skills").select("id, name").in("name", desired);
      const existingNames = new Set((existing ?? []).map((s) => s.name));
      const missing = desired.filter((n) => !existingNames.has(n));
      if (missing.length) {
        const { data: inserted } = await supabase
          .from("skills")
          .insert(missing.map((name) => ({ name })))
          .select("id, name");
        (inserted ?? []).forEach((s) => (existing ?? []).push(s));
      }
      const map = new Map((existing ?? []).map((s) => [s.name, s.id]));
      await supabase.from("freelancer_skills").delete().eq("freelancer_id", profileId);
      if (desired.length) {
        await supabase.from("freelancer_skills").insert(
          desired.map((name) => ({ freelancer_id: profileId, skill_id: map.get(name)! })),
        );
      }
    },
    onSuccess: () => {
      toast.success("Profile saved");
      qc.invalidateQueries({ queryKey: ["freelancer-profile"] });
      qc.invalidateQueries({ queryKey: ["freelancer-stats"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function handleResumeFile(file: File) {
    if (!data?.profile) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Resume must be under 5 MB");
      return;
    }
    try {
      const path = `${user!.id}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("resumes").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      await supabase.from("freelancer_profiles").upsert(
        { profile_id: data.profile.id, resume_url: path },
        { onConflict: "profile_id" },
      );
      // Read text if it's a text/markdown file; otherwise prompt user to paste.
      if (file.type.startsWith("text/") || file.name.endsWith(".md") || file.name.endsWith(".txt")) {
        const text = await file.text();
        setResumeText(text);
      } else {
        toast.info("Resume uploaded. Paste the text below for AI analysis.");
      }
      toast.success("Resume uploaded");
      qc.invalidateQueries({ queryKey: ["freelancer-profile"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function runAnalysis() {
    if (resumeText.trim().length < 50) {
      toast.error("Paste at least a few paragraphs of your resume first");
      return;
    }
    setAnalyzing(true);
    try {
      const res = await analyze({ data: { resumeText } });
      setAnalysis(res);
      if (res.skills?.length) {
        setSkills((prev) => Array.from(new Set([...prev, ...res.skills.map((s) => s.toLowerCase())])));
      }
      if (res.title) setForm((f) => ({ ...f, title: f.title || res.title }));
      toast.success("AI analysis complete");
      qc.invalidateQueries({ queryKey: ["freelancer-profile"] });
      qc.invalidateQueries({ queryKey: ["freelancer-stats"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setAnalyzing(false);
    }
  }

  function addSkill() {
    const v = skillInput.trim().toLowerCase();
    if (!v) return;
    if (!skills.includes(v)) setSkills([...skills, v]);
    setSkillInput("");
  }

  return (
    <DashboardShell>
      <div className="space-y-8">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Profile</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Your freelancer profile</h1>
          <p className="mt-1 text-sm text-muted-foreground">Tell clients who you are. Upload a resume to unlock AI feedback.</p>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <Section title="Basics">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Full name"><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></Field>
                  <Field label="Location"><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Lisbon, Portugal" /></Field>
                  <Field label="Headline"><Input value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} placeholder="Designer & strategist" /></Field>
                  <Field label="Title"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Senior Product Designer" /></Field>
                  <Field label="Hourly rate (USD)"><Input type="number" value={form.hourly_rate} onChange={(e) => setForm({ ...form, hourly_rate: e.target.value })} /></Field>
                  <Field label="Years of experience"><Input type="number" value={form.experience_years} onChange={(e) => setForm({ ...form, experience_years: e.target.value })} /></Field>
                  <Field label="Availability">
                    <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.availability} onChange={(e) => setForm({ ...form, availability: e.target.value as "available" | "busy" | "unavailable" })}>
                      <option value="available">Available</option>
                      <option value="busy">Busy</option>
                      <option value="unavailable">Unavailable</option>
                    </select>
                  </Field>
                </div>
                <div className="mt-4">
                  <Field label="Bio"><Textarea rows={4} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Short summary of who you are and what you build…" /></Field>
                </div>
              </Section>

              <Section title="Skills">
                <div className="flex flex-wrap gap-2">
                  {skills.map((s) => (
                    <Badge key={s} variant="secondary" className="gap-1 capitalize">
                      {s}
                      <button onClick={() => setSkills(skills.filter((x) => x !== s))} className="ml-0.5 rounded-full p-0.5 hover:bg-foreground/10">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  {skills.length === 0 && <p className="text-sm text-muted-foreground">No skills yet. Add a few or upload your resume to extract them.</p>}
                </div>
                <div className="mt-3 flex gap-2">
                  <Input value={skillInput} onChange={(e) => setSkillInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }} placeholder="e.g. react, figma, copywriting" />
                  <Button type="button" variant="outline" onClick={addSkill}>Add</Button>
                </div>
              </Section>

              <Section title="Resume & AI feedback" icon={<Sparkles className="h-4 w-4 text-[var(--indigo)]" />}>
                <div className="rounded-2xl border border-dashed border-border bg-background/60 p-5">
                  <label className="flex cursor-pointer flex-col items-center gap-2 text-center">
                    <Upload className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm font-medium">Upload resume (PDF, DOCX, TXT, MD)</span>
                    <span className="text-xs text-muted-foreground">Stored privately. Only you can read it.</span>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.txt,.md,text/*"
                      className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleResumeFile(f); }}
                    />
                  </label>
                </div>
                <div className="mt-4">
                  <Field label="Or paste your resume text for AI analysis">
                    <Textarea rows={8} value={resumeText} onChange={(e) => setResumeText(e.target.value)} placeholder="Paste full resume text here…" />
                  </Field>
                </div>
                <div className="mt-3 flex justify-end">
                  <Button onClick={runAnalysis} disabled={analyzing} className="gap-2">
                    {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    Analyze with AI
                  </Button>
                </div>

                <AnimatePresence>
                  {analysis && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-5 space-y-3 rounded-2xl border border-border/60 bg-surface-elevated p-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-display text-lg font-semibold">AI summary</h4>
                        <span className="rounded-full bg-[var(--sage)]/20 px-2.5 py-1 text-xs font-medium text-foreground">Score {analysis.score}/100</span>
                      </div>
                      <p className="text-sm leading-relaxed text-foreground/80">{analysis.summary}</p>
                      <div className="grid gap-3 md:grid-cols-2">
                        <FeedbackList icon={<CheckCircle2 className="h-3.5 w-3.5 text-[var(--sage)]" />} title="Strengths" items={analysis.strengths} />
                        <FeedbackList icon={<AlertCircle className="h-3.5 w-3.5 text-[var(--coral)]" />} title="Improvements" items={analysis.improvements} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Section>
            </div>

            <aside className="space-y-4">
              <div className="sticky top-20 space-y-4">
                <div className="rounded-2xl border border-border/60 bg-surface-elevated p-5 shadow-soft">
                  <h4 className="font-display text-lg font-semibold">Profile strength</h4>
                  <p className="mt-1 text-sm text-muted-foreground">Save your changes to update your profile across SkillChain.</p>
                  <Button onClick={() => save.mutate()} disabled={save.isPending} className="mt-4 w-full">
                    {save.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Save profile
                  </Button>
                </div>
                {(data?.profile as { freelancer_profiles?: { ai_summary?: string | null; resume_url?: string | null } } | null)?.freelancer_profiles?.ai_summary && (
                  <div className="rounded-2xl border border-border/60 bg-surface-elevated p-5 shadow-soft">
                    <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground"><Sparkles className="h-3.5 w-3.5" /> Last AI summary</div>
                    <p className="text-sm text-foreground/80">{(data!.profile as { freelancer_profiles: { ai_summary: string } }).freelancer_profiles.ai_summary}</p>
                  </div>
                )}
                {(data?.profile as { freelancer_profiles?: { resume_url?: string | null } } | null)?.freelancer_profiles?.resume_url && (
                  <div className="flex items-center gap-2 rounded-2xl border border-border/60 bg-surface-elevated p-4 text-sm">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    Resume on file
                  </div>
                )}
              </div>
            </aside>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

function Section({ title, children, icon }: { title: string; children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-border/60 bg-surface-elevated p-6 shadow-soft">
      <h3 className="mb-4 flex items-center gap-2 font-display text-xl font-semibold tracking-tight">{icon}{title}</h3>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function FeedbackList({ title, items, icon }: { title: string; items: string[]; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-background/60 p-3">
      <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</div>
      <ul className="space-y-1.5">
        {items?.map((it, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">{icon}<span>{it}</span></li>
        ))}
      </ul>
    </div>
  );
}