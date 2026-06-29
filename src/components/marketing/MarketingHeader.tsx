import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-40 w-full">
      <div className="mx-auto mt-4 flex max-w-6xl items-center justify-between rounded-full px-4 py-2.5 glass shadow-soft">
        <Link to="/" className="flex items-center gap-2 px-2">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-[var(--indigo)] text-white shadow-glow">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">
            SkillChain
          </span>
        </Link>
        <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          <a href="#how" className="hover:text-foreground transition-colors">How it works</a>
          <a href="#features" className="hover:text-foreground transition-colors">Features</a>
          <a href="#for-clients" className="hover:text-foreground transition-colors">For clients</a>
          <a href="#for-freelancers" className="hover:text-foreground transition-colors">For freelancers</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            to="/auth"
            search={{ mode: "signin" } as never}
            className="rounded-full px-4 py-1.5 text-sm font-medium text-foreground/80 hover:text-foreground"
          >
            Sign in
          </Link>
          <Link
            to="/auth"
            search={{ mode: "signup" } as never}
            className="rounded-full bg-foreground px-4 py-1.5 text-sm font-medium text-background shadow-soft transition-transform hover:-translate-y-px"
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}