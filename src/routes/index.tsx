import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Brain,
  Zap,
  Users,
  FileText,
  TrendingUp,
  CheckCircle2,
  Star,
} from "lucide-react";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SkillChain — AI-powered freelance hiring" },
      {
        name: "description",
        content:
          "SkillChain matches verified freelancers with ambitious teams using intelligent AI ranking. Hire faster, hire better.",
      },
      { property: "og:title", content: "SkillChain — AI-powered freelance hiring" },
      {
        property: "og:description",
        content: "Match verified freelance talent with teams using intelligent AI ranking.",
      },
    ],
  }),
  component: LandingPage,
});

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.6, ease: [0.2, 0.8, 0.2, 1] as const },
};

function LandingPage() {
  return (
    <div className="min-h-screen bg-warm-gradient">
      <MarketingHeader />
      <Hero />
      <SocialProof />
      <HowItWorks />
      <Features />
      <SplitCTA />
      <MarketingFooter />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative mx-auto max-w-6xl px-6 pt-20 pb-24 text-center md:pt-28">
      <div className="mx-auto inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-xs text-foreground/70 shadow-soft">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--sage)]" />
        Now matching with Gemini-powered insights
      </div>
      <h1 className="mx-auto mt-6 max-w-3xl text-5xl font-semibold tracking-tight md:text-6xl">
        Hire verified freelancers,
        <span className="block bg-gradient-to-r from-[var(--indigo)] via-[var(--coral)] to-[var(--amber-soft)] bg-clip-text text-transparent">
          matched by intelligent AI.
        </span>
      </h1>
      <p className="mx-auto mt-5 max-w-xl text-balance text-base text-muted-foreground md:text-lg">
        SkillChain ranks candidates against your job using machine learning,
        then explains the fit in plain English. Faster hires, calmer process.
      </p>
      <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
        <Link
          to="/auth"
          search={{ mode: "signup", role: "client" } as never}
          className="group inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background shadow-elevated transition-transform hover:-translate-y-px"
        >
          Hire talent
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
        <Link
          to="/auth"
          search={{ mode: "signup", role: "freelancer" } as never}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-elevated px-5 py-3 text-sm font-medium shadow-soft hover:-translate-y-px transition-transform"
        >
          Find work
        </Link>
      </div>

      <div className="relative mx-auto mt-16 max-w-5xl">
        <div className="absolute -inset-x-10 -inset-y-6 -z-10 rounded-[2rem] bg-gradient-to-br from-[var(--lavender)]/40 via-[var(--peach)]/30 to-[var(--sage)]/30 blur-2xl" />
        <DashboardPreview />
      </div>
    </section>
  );
}

function DashboardPreview() {
  const candidates = [
    { name: "Maya Chen", role: "Senior Product Designer", score: 96, tag: "Top match", color: "var(--sage)" },
    { name: "Daniel Park", role: "Full-Stack Engineer", score: 91, tag: "Strong fit", color: "var(--indigo)" },
    { name: "Aisha Khan", role: "ML Engineer", score: 87, tag: "Worth a look", color: "var(--coral)" },
  ];
  return (
    <div className="rounded-[1.75rem] border border-border/70 bg-surface-elevated p-3 shadow-elevated">
      <div className="grid gap-3 md:grid-cols-[1.4fr,1fr]">
        <div className="rounded-2xl bg-background p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Job</p>
              <h3 className="mt-1 text-lg font-semibold">Senior Product Designer · Remote</h3>
            </div>
            <span className="rounded-full bg-[var(--sage)]/15 px-2.5 py-1 text-xs font-medium text-[oklch(0.4_0.08_155)]">
              12 applicants
            </span>
          </div>
          <div className="mt-6 space-y-3">
            {candidates.map((c) => (
              <div
                key={c.name}
                className="flex items-center gap-3 rounded-xl border border-border/60 bg-surface-elevated p-3"
              >
                <div
                  className="grid h-10 w-10 place-items-center rounded-full text-sm font-semibold text-white"
                  style={{ background: c.color }}
                >
                  {c.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate text-sm font-medium">{c.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{c.role}</p>
                </div>
                <div className="text-right">
                  <p className="font-display text-lg font-semibold tabular-nums">{c.score}</p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{c.tag}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-[var(--indigo)]/8 to-[var(--lavender)]/15 p-6 text-left">
          <div className="flex items-center gap-2 text-xs font-medium text-[var(--indigo)]">
            <Brain className="h-3.5 w-3.5" /> AI insight
          </div>
          <p className="mt-3 text-sm leading-relaxed text-foreground/80">
            Maya consistently ships polished design systems and has shipped
            three remote products at similar scale. Her portfolio shows strong
            judgment around motion and accessibility.
          </p>
          <div className="mt-5 space-y-2">
            {["10y design", "Design systems", "Motion", "Accessibility"].map((t) => (
              <span
                key={t}
                className="mr-1.5 inline-block rounded-full bg-surface-elevated px-2.5 py-1 text-xs text-foreground/70"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SocialProof() {
  const logos = ["Linear", "Stripe", "Vercel", "Arc", "Notion", "Framer"];
  return (
    <section className="mx-auto max-w-6xl px-6">
      <p className="text-center text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
        Trusted by teams shaping the modern web
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 opacity-70">
        {logos.map((l) => (
          <span key={l} className="font-display text-lg font-semibold text-foreground/60">
            {l}
          </span>
        ))}
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      icon: FileText,
      title: "Post a brief",
      body: "Describe the role in your own words. AI extracts skills, seniority, and scope.",
      tint: "var(--peach)",
    },
    {
      icon: Brain,
      title: "AI ranks talent",
      body: "Verified freelancers are ranked using ML embeddings and skill graphs.",
      tint: "var(--lavender)",
    },
    {
      icon: CheckCircle2,
      title: "Hire with clarity",
      body: "Each match comes with an explanation, fit score, and suggested interview questions.",
      tint: "var(--sage)",
    },
  ];
  return (
    <section id="how" className="mx-auto mt-32 max-w-6xl px-6">
      <motion.div {...fadeUp} className="mx-auto max-w-2xl text-center">
        <h2 className="text-4xl font-semibold tracking-tight md:text-5xl">
          A calmer way to hire.
        </h2>
        <p className="mt-4 text-muted-foreground">
          Three steps. No noisy inbox. No guessing who's qualified.
        </p>
      </motion.div>
      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {steps.map((s, i) => (
          <motion.div
            key={s.title}
            {...fadeUp}
            transition={{ ...fadeUp.transition, delay: i * 0.08 }}
            className="rounded-3xl border border-border/60 bg-surface-elevated p-7 shadow-soft"
          >
            <div
              className="grid h-11 w-11 place-items-center rounded-2xl"
              style={{ background: `color-mix(in oklab, ${s.tint} 35%, transparent)` }}
            >
              <s.icon className="h-5 w-5 text-foreground/80" />
            </div>
            <h3 className="mt-5 text-lg font-semibold">{s.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function Features() {
  const features = [
    { icon: Brain, title: "AI candidate ranking", body: "TF-IDF + embedding similarity rank talent against your job in seconds." },
    { icon: Sparkles, title: "Gemini insights", body: "Plain-English fit explanations and tailored interview questions." },
    { icon: ShieldCheck, title: "Verified skills", body: "Skill badges backed by portfolio review and AI cross-checks." },
    { icon: Zap, title: "Lightning fast", body: "Server-rendered TanStack Start. Sub-second page loads everywhere." },
    { icon: Users, title: "Talent CRM", body: "Save candidates, track applications, share with your team." },
    { icon: TrendingUp, title: "Insights dashboard", body: "Pipeline analytics that actually help you make decisions." },
  ];
  return (
    <section id="features" className="mx-auto mt-32 max-w-6xl px-6">
      <motion.div {...fadeUp} className="mx-auto max-w-2xl text-center">
        <h2 className="text-4xl font-semibold tracking-tight md:text-5xl">Built for both sides of the table.</h2>
        <p className="mt-4 text-muted-foreground">
          A product designed around the people doing the work — clients and freelancers alike.
        </p>
      </motion.div>
      <div className="mt-12 grid gap-5 md:grid-cols-3">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            {...fadeUp}
            transition={{ ...fadeUp.transition, delay: i * 0.05 }}
            className="group relative overflow-hidden rounded-2xl border border-border/60 bg-surface-elevated p-6 shadow-soft transition-shadow hover:shadow-elevated"
          >
            <f.icon className="h-5 w-5 text-[var(--indigo)]" />
            <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">{f.body}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function SplitCTA() {
  return (
    <section className="mx-auto mt-32 max-w-6xl px-6">
      <div className="grid gap-5 md:grid-cols-2">
        <motion.div
          id="for-clients"
          {...fadeUp}
          className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-[var(--indigo)]/8 to-[var(--lavender)]/15 p-8 shadow-soft"
        >
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--indigo)]">For clients</p>
          <h3 className="mt-3 font-display text-3xl font-semibold tracking-tight">
            Build your team faster.
          </h3>
          <p className="mt-3 max-w-md text-sm text-muted-foreground">
            Stop reading 200 résumés. Post a job and let SkillChain do the first pass.
          </p>
          <Link
            to="/auth"
            search={{ mode: "signup", role: "client" } as never}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background"
          >
            Post your first job <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
        <motion.div
          id="for-freelancers"
          {...fadeUp}
          transition={{ ...fadeUp.transition, delay: 0.08 }}
          className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-[var(--peach)]/30 to-[var(--amber-soft)]/25 p-8 shadow-soft"
        >
          <p className="text-xs font-medium uppercase tracking-wider text-[oklch(0.45_0.15_30)]">For freelancers</p>
          <h3 className="mt-3 font-display text-3xl font-semibold tracking-tight">
            Get matched to work you'll love.
          </h3>
          <p className="mt-3 max-w-md text-sm text-muted-foreground">
            Build a verified profile and let AI surface the right opportunities for you.
          </p>
          <Link
            to="/auth"
            search={{ mode: "signup", role: "freelancer" } as never}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background"
          >
            Create your profile <Star className="h-4 w-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
