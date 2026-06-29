import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/lib/auth-store";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/client/jobs/new")({
  head: () => ({ meta: [{ title: "Post a job · SkillChain" }] }),
  component: NewJob,
});

function NewJob() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: "", description: "", budget_min: "", budget_max: "", duration: "",
    experience_level: "intermediate" as "entry" | "intermediate" | "expert",
  });
  const [skillInput, setSkillInput] = useState("");
  const [skills, setSkills] = useState<string[]>([]);

  const create = useMutation({
    mutationFn: async () => {
      const { data: profile } = await supabase.from("profiles").select("id").eq("auth_user_id", user!.id).maybeSingle();
      if (!profile) throw new Error("Profile not found");
      const { data: job, error } = await supabase
        .from("jobs")
        .insert({
          client_id: profile.id,
          title: form.title,
          description: form.description,
          budget_min: form.budget_min ? Number(form.budget_min) : null,
          budget_max: form.budget_max ? Number(form.budget_max) : null,
          duration: form.duration || null,
          experience_level: form.experience_level,
          required_skills: skills.length ? skills : null,
          status: "open",
        })
        .select("id")
        .single();
      if (error) throw error;
      return job.id;
    },
    onSuccess: (id) => {
      toast.success("Job posted");
      navigate({ to: "/client/jobs/$jobId", params: { jobId: id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function addSkill() {
    const v = skillInput.trim().toLowerCase();
    if (!v) return;
    if (!skills.includes(v)) setSkills([...skills, v]);
    setSkillInput("");
  }

  return (
    <DashboardShell>
      <div className="mx-auto max-w-2xl space-y-8">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">New job</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Post a role</h1>
          <p className="mt-1 text-sm text-muted-foreground">A clear job post attracts better candidates.</p>
        </div>

        <div className="space-y-5 rounded-3xl border border-border/60 bg-surface-elevated p-6 shadow-soft">
          <Field label="Title"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Senior React Engineer" /></Field>
          <Field label="Description"><Textarea rows={8} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What needs to be built? Scope, timelines, must-haves…" /></Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Budget min (USD)"><Input type="number" value={form.budget_min} onChange={(e) => setForm({ ...form, budget_min: e.target.value })} /></Field>
            <Field label="Budget max (USD)"><Input type="number" value={form.budget_max} onChange={(e) => setForm({ ...form, budget_max: e.target.value })} /></Field>
            <Field label="Duration"><Input value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} placeholder="3 months / ongoing" /></Field>
            <Field label="Experience level">
              <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.experience_level} onChange={(e) => setForm({ ...form, experience_level: e.target.value as typeof form.experience_level })}>
                <option value="entry">Entry</option>
                <option value="intermediate">Intermediate</option>
                <option value="expert">Expert</option>
              </select>
            </Field>
          </div>
          <Field label="Required skills">
            <div className="flex flex-wrap gap-2">
              {skills.map((s) => (
                <Badge key={s} variant="secondary" className="gap-1 capitalize">
                  {s}
                  <button onClick={() => setSkills(skills.filter((x) => x !== s))} className="ml-0.5 rounded-full p-0.5 hover:bg-foreground/10"><X className="h-3 w-3" /></button>
                </Badge>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <Input value={skillInput} onChange={(e) => setSkillInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }} placeholder="react, typescript, figma" />
              <Button type="button" variant="outline" onClick={addSkill}>Add</Button>
            </div>
          </Field>

          <div className="flex justify-end pt-2">
            <Button onClick={() => create.mutate()} disabled={create.isPending || !form.title.trim() || !form.description.trim()}>
              {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Publish job
            </Button>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</Label>{children}</div>;
}