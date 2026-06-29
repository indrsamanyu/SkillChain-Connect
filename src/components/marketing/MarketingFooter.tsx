import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

export function MarketingFooter() {
  return (
    <footer className="mt-32 border-t border-border/60 bg-surface-elevated">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 md:grid-cols-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-[var(--indigo)] text-white">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="font-display text-lg font-semibold">SkillChain</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Where verified talent meets ambitious teams. Powered by AI matching.
          </p>
        </div>
        <div>
          <h4 className="text-sm font-semibold">Product</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><a href="#features" className="hover:text-foreground">Features</a></li>
            <li><a href="#how" className="hover:text-foreground">How it works</a></li>
            <li><Link to="/auth" search={{ mode: "signup" } as never} className="hover:text-foreground">Get started</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold">For talent</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><a href="#for-freelancers" className="hover:text-foreground">Freelancers</a></li>
            <li><a href="#for-clients" className="hover:text-foreground">Clients</a></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold">Company</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>About</li>
            <li>Careers</li>
            <li>Contact</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} SkillChain. Crafted with care.
      </div>
    </footer>
  );
}