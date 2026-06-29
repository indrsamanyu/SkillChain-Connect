import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Admin access required");
}

export const adminListUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data: profiles } = await context.supabase
      .from("profiles")
      .select("id, auth_user_id, full_name, headline, location, is_suspended, created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    const { data: roles } = await context.supabase.from("user_roles").select("user_id, role");
    const roleByUser = new Map<string, string>();
    (roles ?? []).forEach((r: any) => roleByUser.set(r.user_id, r.role));
    return (profiles ?? []).map((p: any) => ({
      ...p,
      role: roleByUser.get(p.auth_user_id) ?? "freelancer",
    }));
  });

export const adminSetSuspension = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ profileId: z.string().uuid(), suspended: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("profiles")
      .update({ is_suspended: data.suspended })
      .eq("id", data.profileId);
    if (error) throw error;
    return { ok: true };
  });

export const adminSetRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        authUserId: z.string().uuid(),
        role: z.enum(["admin", "client", "freelancer"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    await context.supabase.from("user_roles").delete().eq("user_id", data.authUserId);
    const { error } = await context.supabase
      .from("user_roles")
      .insert({ user_id: data.authUserId, role: data.role });
    if (error) throw error;
    return { ok: true };
  });

export const adminListReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data } = await context.supabase
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    return data ?? [];
  });

export const adminResolveReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        reportId: z.string().uuid(),
        status: z.enum(["resolved", "dismissed"]),
        note: z.string().max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("reports")
      .update({ status: data.status, resolution_note: data.note ?? null })
      .eq("id", data.reportId);
    if (error) throw error;
    return { ok: true };
  });

export const adminPlatformStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const [usersRes, jobsRes, appsRes, reportsRes] = await Promise.all([
      context.supabase.from("profiles").select("*", { count: "exact", head: true }),
      context.supabase.from("jobs").select("*", { count: "exact", head: true }),
      context.supabase.from("applications").select("*", { count: "exact", head: true }),
      context.supabase
        .from("reports")
        .select("*", { count: "exact", head: true })
        .eq("status", "open"),
    ]);

    const { data: roles } = await context.supabase.from("user_roles").select("role");
    const roleMix: Record<string, number> = { admin: 0, client: 0, freelancer: 0 };
    (roles ?? []).forEach((r: any) => {
      roleMix[r.role] = (roleMix[r.role] ?? 0) + 1;
    });

    const { data: recentProfiles } = await context.supabase
      .from("profiles")
      .select("created_at")
      .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order("created_at", { ascending: true });
    const signupsByDay = new Map<string, number>();
    (recentProfiles ?? []).forEach((p: any) => {
      const day = (p.created_at as string).slice(0, 10);
      signupsByDay.set(day, (signupsByDay.get(day) ?? 0) + 1);
    });
    const signups = Array.from(signupsByDay.entries()).map(([day, count]) => ({ day, count }));

    return {
      totals: {
        users: usersRes.count ?? 0,
        jobs: jobsRes.count ?? 0,
        applications: appsRes.count ?? 0,
        openReports: reportsRes.count ?? 0,
      },
      roleMix,
      signups,
    };
  });
