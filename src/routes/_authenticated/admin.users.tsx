import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { adminListUsers, adminSetSuspension, adminSetRole } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({ meta: [{ title: "Users · Admin · SkillChain" }] }),
  component: AdminUsers,
});

function AdminUsers() {
  const listFn = useServerFn(adminListUsers);
  const suspendFn = useServerFn(adminSetSuspension);
  const roleFn = useServerFn(adminSetRole);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ["admin-users"], queryFn: () => listFn() });

  const suspendMut = useMutation({
    mutationFn: (vars: { profileId: string; suspended: boolean }) =>
      suspendFn({ data: vars }),
    onSuccess: () => {
      toast.success("Updated");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const roleMut = useMutation({
    mutationFn: (vars: { authUserId: string; role: "admin" | "client" | "freelancer" }) =>
      roleFn({ data: vars }),
    onSuccess: () => {
      toast.success("Role updated");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Admin</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Users</h1>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border/60 bg-surface-elevated shadow-soft">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Joined</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading && (
                <tr><td className="px-5 py-6 text-muted-foreground" colSpan={5}>Loading…</td></tr>
              )}
              {!isLoading && (data ?? []).length === 0 && (
                <tr><td className="px-5 py-6 text-muted-foreground" colSpan={5}>No users yet.</td></tr>
              )}
              {(data ?? []).map((u: any) => (
                <tr key={u.id} className="hover:bg-muted/30">
                  <td className="px-5 py-3">
                    <div className="font-medium">{u.full_name ?? "Unnamed"}</div>
                    <div className="text-xs text-muted-foreground">{u.headline ?? u.location ?? ""}</div>
                  </td>
                  <td className="px-5 py-3">
                    <select
                      value={u.role}
                      onChange={(e) =>
                        roleMut.mutate({ authUserId: u.auth_user_id, role: e.target.value as any })
                      }
                      className="rounded-lg border border-border bg-background px-2 py-1 text-xs"
                    >
                      <option value="freelancer">freelancer</option>
                      <option value="client">client</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3">
                    {u.is_suspended ? (
                      <span className="rounded-full bg-[var(--coral)]/15 px-2 py-0.5 text-xs font-medium text-[var(--coral)]">Suspended</span>
                    ) : (
                      <span className="rounded-full bg-[var(--sage)]/20 px-2 py-0.5 text-xs font-medium text-foreground/80">Active</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() =>
                        suspendMut.mutate({ profileId: u.id, suspended: !u.is_suspended })
                      }
                      className="rounded-lg border border-border px-3 py-1 text-xs font-medium hover:bg-muted"
                    >
                      {u.is_suspended ? "Reactivate" : "Suspend"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardShell>
  );
}
