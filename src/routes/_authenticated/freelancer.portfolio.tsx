import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/lib/auth-store";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, ExternalLink, Loader2, FolderKanban } from "lucide-react";

export const Route = createFileRoute("/_authenticated/freelancer/portfolio")({
  head: () => ({ meta: [{ title: "Portfolio · SkillChain" }] }),
  component: PortfolioPage,
});

function PortfolioPage() {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["portfolio", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: profile } = await supabase.from("profiles").select("id").eq("auth_user_id", user!.id).maybeSingle();
      if (!profile) return { profileId: null, items: [] };
      const { data: items } = await supabase
        .from("portfolios")
        .select("*")
        .eq("freelancer_id", profile.id)
        .order("created_at", { ascending: false });
      return { profileId: profile.id, items: items ?? [] };
    },
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", project_url: "", tags: "" });

  const create = useMutation({
    mutationFn: async () => {
      if (!data?.profileId) throw new Error("Profile not ready");
      const { error } = await supabase.from("portfolios").insert({
        freelancer_id: data.profileId,
        title: form.title,
        description: form.description || null,
        project_url: form.project_url || null,
        tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Project added");
      setOpen(false);
      setForm({ title: "", description: "", project_url: "", tags: "" });
      qc.invalidateQueries({ queryKey: ["portfolio"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("portfolios").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Removed");
      qc.invalidateQueries({ queryKey: ["portfolio"] });
    },
  });

  return (
    <DashboardShell>
      <div className="space-y-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Portfolio</p>
            <h1 className="font-display text-3xl font-semibold tracking-tight">Showcase your work</h1>
            <p className="mt-1 text-sm text-muted-foreground">Add projects clients can browse before they hire you.</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> New project</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add a project</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <Field label="Title"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
                <Field label="Description"><Textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
                <Field label="URL"><Input placeholder="https://" value={form.project_url} onChange={(e) => setForm({ ...form, project_url: e.target.value })} /></Field>
                <Field label="Tags (comma-separated)"><Input placeholder="react, design system" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} /></Field>
              </div>
              <DialogFooter>
                <Button onClick={() => create.mutate()} disabled={create.isPending || !form.title.trim()}>
                  {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Add project
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : (data?.items?.length ?? 0) === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-surface-elevated/60 p-12 text-center">
            <FolderKanban className="mx-auto h-8 w-8 text-muted-foreground" />
            <h2 className="mt-3 font-display text-xl font-semibold">No projects yet</h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">Add your best work — case studies, side projects, or live products.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {data!.items.map((p) => (
              <article key={p.id} className="group rounded-2xl border border-border/60 bg-surface-elevated p-5 shadow-soft">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-display text-lg font-semibold tracking-tight">{p.title}</h3>
                  <button onClick={() => remove.mutate(p.id)} className="rounded-full p-1.5 text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:bg-muted hover:text-foreground">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {p.description && <p className="mt-2 text-sm text-foreground/80">{p.description}</p>}
                {p.tags && p.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {p.tags.map((t) => <Badge key={t} variant="secondary" className="capitalize">{t}</Badge>)}
                  </div>
                )}
                {p.project_url && (
                  <a href={p.project_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[var(--indigo)] hover:underline">
                    View project <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</Label>{children}</div>;
}