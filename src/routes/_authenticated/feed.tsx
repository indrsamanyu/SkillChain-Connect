import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/lib/auth-store";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Send,
  Briefcase,
  Loader2,
  DollarSign,
  Clock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/feed" as never)({
  head: () => ({ meta: [{ title: "Feed · SkillChain" }] }),
  component: FeedPage,
});

/* ─── Types ─────────────────────────────────────────────── */

type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  headline: string | null;
  user_roles: { role: string }[];
};

type PostRow = {
  id: string;
  content: string;
  created_at: string;
  author_id: string;
  profiles: Profile;
};

type JobRow = {
  id: string;
  title: string;
  description: string;
  required_skills: string[];
  budget_min: number | null;
  budget_max: number | null;
  duration: string | null;
  experience_level: string | null;
  created_at: string;
  client_id: string;
  profiles: { full_name: string | null; avatar_url: string | null; headline: string | null };
};

type FeedItem =
  | { kind: "post"; data: PostRow }
  | { kind: "job"; data: JobRow };

/* ─── Page ───────────────────────────────────────────────── */

function FeedPage() {
  const user = useAuthStore((s) => s.user);
  const role = useAuthStore((s) => s.role);
  const qc = useQueryClient();
  const [draft, setDraft] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [draft]);

  /* ── Fetch my profile id ── */
  const { data: myProfile } = useQuery({
    queryKey: ["my-profile-id", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, headline")
        .eq("auth_user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  /* ── Fetch posts ── */
  const { data: posts = [], isLoading: loadingPosts } = useQuery({
    queryKey: ["feed-posts"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("posts")
        .select(
          "id, content, created_at, author_id, profiles(id, full_name, avatar_url, headline, user_roles(role))",
        )
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as PostRow[];
    },
  });

  /* ── Fetch recent open jobs ── */
  const { data: jobs = [], isLoading: loadingJobs } = useQuery({
    queryKey: ["feed-jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select(
          "id, title, description, required_skills, budget_min, budget_max, duration, experience_level, created_at, client_id, profiles(full_name, avatar_url, headline)",
        )
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as unknown as JobRow[];
    },
  });

  /* ── Merge and sort feed ── */
  const feed: FeedItem[] = [
    ...posts.map((p) => ({ kind: "post" as const, data: p })),
    ...jobs.map((j) => ({ kind: "job" as const, data: j })),
  ].sort(
    (a, b) =>
      new Date(b.data.created_at).getTime() -
      new Date(a.data.created_at).getTime(),
  );

  /* ── Post mutation ── */
  const post = useMutation({
    mutationFn: async () => {
      if (!myProfile) throw new Error("Profile not loaded");
      if (!draft.trim()) throw new Error("Post cannot be empty");
      const { error } = await (supabase as any).from("posts").insert({
        author_id: myProfile.id,
        content: draft.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setDraft("");
      toast.success("Posted!");
      qc.invalidateQueries({ queryKey: ["feed-posts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  /* ── Delete mutation ── */
  const deletePost = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await (supabase as any).from("posts").delete().eq("id", postId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Post deleted");
      qc.invalidateQueries({ queryKey: ["feed-posts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const loading = loadingPosts || loadingJobs;

  return (
    <DashboardShell>
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Community
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            Feed
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Posts and open jobs from everyone on the platform.
          </p>
        </div>

        {/* Compose box */}
        <div className="rounded-2xl border border-border/60 bg-surface-elevated p-4 shadow-soft">
          <div className="flex gap-3">
            <Avatar
              name={myProfile?.full_name}
              url={myProfile?.avatar_url}
              size={36}
            />
            <div className="flex-1 space-y-3">
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={
                  role === "client"
                    ? "Share an update, or post a job from the Jobs tab…"
                    : "Share something with the community…"
                }
                rows={2}
                className="w-full resize-none rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition focus:border-[var(--indigo)] focus:ring-2 focus:ring-[var(--indigo)]/15"
                maxLength={2000}
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {draft.length}/2000
                </span>
                <Button
                  size="sm"
                  disabled={!draft.trim() || post.isPending}
                  onClick={() => post.mutate()}
                  className="gap-1.5"
                >
                  {post.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  Post
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Feed */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : feed.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
            No posts yet. Be the first to post!
          </p>
        ) : (
          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {feed.map((item, i) =>
                item.kind === "post" ? (
                  <motion.div
                    key={`post-${item.data.id}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i, 10) * 0.03 }}
                  >
                    <PostCard
                      post={item.data}
                      myProfileId={myProfile?.id}
                      onDelete={(id) => deletePost.mutate(id)}
                      expanded={expanded.has(item.data.id)}
                      onToggle={(id) =>
                        setExpanded((prev) => {
                          const next = new Set(prev);
                          next.has(id) ? next.delete(id) : next.add(id);
                          return next;
                        })
                      }
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key={`job-${item.data.id}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i, 10) * 0.03 }}
                  >
                    <JobCard
                      job={item.data}
                      expanded={expanded.has(item.data.id)}
                      onToggle={(id) =>
                        setExpanded((prev) => {
                          const next = new Set(prev);
                          next.has(id) ? next.delete(id) : next.add(id);
                          return next;
                        })
                      }
                    />
                  </motion.div>
                ),
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

/* ─── PostCard ───────────────────────────────────────────── */

function PostCard({
  post,
  myProfileId,
  onDelete,
  expanded,
  onToggle,
}: {
  post: PostRow;
  myProfileId?: string;
  onDelete: (id: string) => void;
  expanded: boolean;
  onToggle: (id: string) => void;
}) {
  const role =
    (post.profiles?.user_roles?.[0]?.role as string | undefined) ??
    "freelancer";
  const isLong = post.content.length > 280;
  const displayContent =
    isLong && !expanded ? post.content.slice(0, 280) + "…" : post.content;
  const isOwn = myProfileId === post.author_id;

  return (
    <div className="rounded-2xl border border-border/60 bg-surface-elevated p-4 shadow-soft">
      <div className="flex items-start gap-3">
        <Avatar
          name={post.profiles?.full_name}
          url={post.profiles?.avatar_url}
          size={36}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">
              {post.profiles?.full_name ?? "Unknown"}
            </span>
            <RoleBadge role={role} />
            {post.profiles?.headline && (
              <span className="truncate text-xs text-muted-foreground">
                · {post.profiles.headline}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {timeAgo(post.created_at)}
          </p>
        </div>
        {isOwn && (
          <button
            onClick={() => onDelete(post.id)}
            className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition"
          >
            Delete
          </button>
        )}
      </div>

      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
        {displayContent}
      </p>
      {isLong && (
        <button
          onClick={() => onToggle(post.id)}
          className="mt-1 flex items-center gap-1 text-xs text-[var(--indigo)] hover:underline"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3 w-3" /> Show less
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" /> Show more
            </>
          )}
        </button>
      )}
    </div>
  );
}

/* ─── JobCard ────────────────────────────────────────────── */

function JobCard({
  job,
  expanded,
  onToggle,
}: {
  job: JobRow;
  expanded: boolean;
  onToggle: (id: string) => void;
}) {
  const isLong = job.description.length > 200;
  const displayDesc =
    isLong && !expanded ? job.description.slice(0, 200) + "…" : job.description;

  return (
    <div className="rounded-2xl border border-[var(--indigo)]/20 bg-[var(--indigo)]/5 p-4 shadow-soft">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--indigo)]/15 text-[var(--indigo)]">
          <Briefcase className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">{job.title}</span>
            <Badge
              variant="outline"
              className="border-[var(--indigo)]/30 bg-[var(--indigo)]/10 text-[var(--indigo)] text-[10px]"
            >
              Job Opening
            </Badge>
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Posted by {job.profiles?.full_name ?? "a client"} ·{" "}
            {timeAgo(job.created_at)}
          </p>
        </div>
      </div>

      {/* Description */}
      <p className="mt-3 text-sm leading-relaxed text-foreground/80">
        {displayDesc}
      </p>
      {isLong && (
        <button
          onClick={() => onToggle(job.id)}
          className="mt-1 flex items-center gap-1 text-xs text-[var(--indigo)] hover:underline"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3 w-3" /> Show less
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" /> Show more
            </>
          )}
        </button>
      )}

      {/* Meta */}
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        {(job.budget_min || job.budget_max) && (
          <span className="flex items-center gap-1">
            <DollarSign className="h-3 w-3" />$
            {job.budget_min ?? "—"} – ${job.budget_max ?? "—"}
          </span>
        )}
        {job.duration && (
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {job.duration}
          </span>
        )}
        {job.experience_level && (
          <span className="capitalize">{job.experience_level}</span>
        )}
      </div>

      {/* Skills */}
      {job.required_skills?.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {job.required_skills.slice(0, 6).map((s) => (
            <Badge key={s} variant="secondary" className="text-[10px] capitalize">
              {s}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Helpers ────────────────────────────────────────────── */

function Avatar({
  name,
  url,
  size,
}: {
  name?: string | null;
  url?: string | null;
  size: number;
}) {
  const initials = (name ?? "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (url) {
    return (
      <img
        src={url}
        alt={name ?? "avatar"}
        width={size}
        height={size}
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="grid shrink-0 place-items-center rounded-full bg-[var(--indigo)]/20 font-semibold text-[var(--indigo)]"
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {initials}
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, { label: string; color: string }> = {
    freelancer: { label: "Freelancer", color: "text-[var(--sage)]" },
    client: { label: "Client", color: "text-[var(--amber)]" },
    admin: { label: "Admin", color: "text-[var(--coral)]" },
  };
  const { label, color } = map[role] ?? { label: role, color: "" };
  return (
    <span className={`text-[10px] font-semibold uppercase tracking-wide ${color}`}>
      {label}
    </span>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}
