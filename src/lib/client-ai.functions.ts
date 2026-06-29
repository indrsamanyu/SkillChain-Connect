import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface CandidateInsight {
  verdict: string; // 1-sentence bottom line
  fit: string;     // 2-3 sentence rationale
  highlights: string[]; // 2-4 short bullets of strengths
  concerns: string[];   // 1-3 short bullets of gaps
}

const inputSchema = z.object({
  jobId: z.string().uuid(),
  applicationId: z.string().uuid(),
});

export const explainCandidate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { chatCompletion } = await import("@/lib/ai-gateway.server");

    const { data: job } = await context.supabase
      .from("jobs")
      .select("title, description, required_skills, experience_level, budget_min, budget_max")
      .eq("id", data.jobId)
      .maybeSingle();
    if (!job) throw new Error("Job not found");

    const { data: app } = await context.supabase
      .from("applications")
      .select("cover_letter, proposed_rate, ai_match_score, freelancer_id, freelancer:profiles!applications_freelancer_id_fkey(full_name, headline, bio, location, freelancer_profiles(title, experience_years, hourly_rate, ai_summary, resume_text))")
      .eq("id", data.applicationId)
      .maybeSingle();
    if (!app) throw new Error("Application not found");

    const { data: skills } = await context.supabase
      .from("freelancer_skills")
      .select("skills(name)")
      .eq("freelancer_id", app.freelancer_id);

    const freelancer = (app.freelancer ?? null) as {
      full_name: string | null; headline: string | null; bio: string | null; location: string | null;
      freelancer_profiles?: { title?: string | null; experience_years?: number | null; hourly_rate?: number | null; ai_summary?: string | null; resume_text?: string | null } | null;
    } | null;
    const fp = freelancer?.freelancer_profiles ?? null;
    const skillNames = ((skills ?? []) as Array<{ skills: { name: string } | null }>).map((s) => s.skills?.name).filter(Boolean);

    const prompt = `JOB
Title: ${job.title}
Description: ${job.description}
Required skills: ${(job.required_skills ?? []).join(", ") || "n/a"}
Experience level: ${job.experience_level ?? "n/a"}
Budget: ${job.budget_min ?? "?"}–${job.budget_max ?? "?"}

CANDIDATE
Name: ${freelancer?.full_name ?? "Unknown"}
Title: ${fp?.title ?? freelancer?.headline ?? "n/a"}
Years: ${fp?.experience_years ?? "n/a"}
Rate: ${fp?.hourly_rate ?? "n/a"}
Location: ${freelancer?.location ?? "n/a"}
Skills: ${skillNames.join(", ") || "n/a"}
Bio: ${freelancer?.bio ?? "n/a"}
AI summary: ${fp?.ai_summary ?? "n/a"}
Resume excerpt: ${(fp?.resume_text ?? "").slice(0, 1500)}
Cover letter: ${app.cover_letter ?? "n/a"}
Proposed rate: ${app.proposed_rate ?? "n/a"}
ML match score: ${app.ai_match_score ?? "n/a"}/100`;

    const raw = await chatCompletion(
      [
        {
          role: "system",
          content:
            "You are a senior hiring manager. Evaluate the candidate against the job. Return STRICT JSON only with keys: verdict (1 short sentence bottom-line recommendation), fit (2-3 sentences explaining fit), highlights (array of 2-4 short strings), concerns (array of 1-3 short strings). No prose outside JSON.",
        },
        { role: "user", content: prompt },
      ],
      { json: true },
    );

    let parsed: CandidateInsight;
    try { parsed = JSON.parse(raw) as CandidateInsight; }
    catch { throw new Error("AI returned invalid JSON"); }

    await context.supabase
      .from("applications")
      .update({ ai_insights: JSON.parse(JSON.stringify(parsed)) })
      .eq("id", data.applicationId);

    return parsed;
  });