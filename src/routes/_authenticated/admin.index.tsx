import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Users, Briefcase, FileText, AlertTriangle } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { adminPlatformStats } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [{ title: "Platform overview · Admin · SkillChain" }],
  }),
  component: AdminOverview,
});

const COLORS = ["#6366f1", "#f97316", "#10b981", "#a855f7"];

function AdminOverview() {
  const fn = useServerFn(adminPlatformStats);
  const { data, isLoading } = useQuery({ queryKey: ["admin-stats"], queryFn: () => fn() });

  return (
    <DashboardShell>
      <div className="space-y-8">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Admin</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Platform overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Health and activity across SkillChain.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Users} label="Users" value={data?.totals.users ?? 0} loading={isLoading} />
          <StatCard icon={Briefcase} label="Jobs" value={data?.totals.jobs ?? 0} loading={isLoading} />
          <StatCard icon={FileText} label="Applications" value={data?.totals.applications ?? 0} loading={isLoading} />
          <StatCard
            icon={AlertTriangle}
            label="Open reports"
            value={data?.totals.openReports ?? 0}
            loading={isLoading}
            accent="coral"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-border/60 bg-surface-elevated p-6 shadow-soft">
            <h2 className="font-display text-lg font-semibold">Signups · last 30 days</h2>
            <div className="mt-4 h-64">
              <ResponsiveContainer>
                <BarChart data={data?.signups ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#6366f1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-3xl border border-border/60 bg-surface-elevated p-6 shadow-soft">
            <h2 className="font-display text-lg font-semibold">Role mix</h2>
            <div className="mt-4 h-64">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={Object.entries(data?.roleMix ?? {}).map(([name, value]) => ({ name, value }))}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label
                  >
                    {Object.keys(data?.roleMix ?? {}).map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  loading,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  loading?: boolean;
  accent?: "coral";
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-surface-elevated p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        <span
          className={`grid h-8 w-8 place-items-center rounded-xl ${
            accent === "coral" ? "bg-[var(--coral)]/15 text-[var(--coral)]" : "bg-[var(--indigo)]/10 text-[var(--indigo)]"
          }`}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 font-display text-3xl font-semibold tracking-tight">
        {loading ? "—" : value.toLocaleString()}
      </p>
    </div>
  );
}
