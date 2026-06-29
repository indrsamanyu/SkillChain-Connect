import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { adminListReports, adminResolveReport } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/reports")({
  head: () => ({ meta: [{ title: "Reports · Admin · SkillChain" }] }),
  component: AdminReports,
});

function AdminReports() {
  const listFn = useServerFn(adminListReports);
  const resolveFn = useServerFn(adminResolveReport);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ["admin-reports"], queryFn: () => listFn() });
  const mut = useMutation({
    mutationFn: (vars: { reportId: string; status: "resolved" | "dismissed" }) =>
      resolveFn({ data: vars }),
    onSuccess: () => {
      toast.success("Report updated");
      qc.invalidateQueries({ queryKey: ["admin-reports"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Admin</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Reports queue</h1>
        </div>

        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && (data ?? []).length === 0 && (
          <div className="rounded-3xl border border-dashed border-border bg-surface-elevated/60 p-12 text-center">
            <h2 className="font-display text-xl font-semibold">Nothing to review</h2>
            <p className="mt-1 text-sm text-muted-foreground">User reports will appear here.</p>
          </div>
        )}

        <div className="space-y-3">
          {(data ?? []).map((r: any) => (
            <div
              key={r.id}
              className="rounded-2xl border border-border/60 bg-surface-elevated p-5 shadow-soft"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="rounded-full bg-muted px-2 py-0.5 font-medium uppercase tracking-wider">
                      {r.target_type}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 font-medium ${
                        r.status === "open"
                          ? "bg-[var(--amber)]/20 text-foreground/80"
                          : r.status === "resolved"
                            ? "bg-[var(--sage)]/20 text-foreground/80"
                            : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {r.status}
                    </span>
                    <span className="text-muted-foreground">
                      {new Date(r.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-2 text-sm">{r.reason}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Target ID: {r.target_id}</p>
                  {r.resolution_note && (
                    <p className="mt-2 text-xs italic text-muted-foreground">
                      Resolution: {r.resolution_note}
                    </p>
                  )}
                </div>
                {r.status === "open" && (
                  <div className="flex flex-shrink-0 gap-2">
                    <button
                      onClick={() => mut.mutate({ reportId: r.id, status: "resolved" })}
                      className="rounded-lg bg-foreground px-3 py-1.5 text-xs font-medium text-background"
                    >
                      Resolve
                    </button>
                    <button
                      onClick={() => mut.mutate({ reportId: r.id, status: "dismissed" })}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardShell>
  );
}
