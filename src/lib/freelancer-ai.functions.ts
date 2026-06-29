import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface ResumeAnalysis {
  summary: string;
  title: string;
  skills: string[];
  experience_years: number;
  strengths: string[];
  improvements: string[];
  score: number;
}

const inputSchema = z.object({ resumeText: z.string().min(50).max(50000) });

export const analyzeResume = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { chatCompletion } = await import("@/lib/ai-gateway.server");

    const raw = await chatCompletion(
      [
        {
          role: "system",
          content:
            "You are a senior technical recruiter. Analyze the resume and return STRICT JSON only with keys: summary (2-3 sentence professional summary), title (short headline like 'Senior Full-Stack Engineer'), skills (array of 5-15 lowercase skill strings), experience_years (integer estimate), strengths (3-5 short bullets), improvements (3-5 short actionable bullets), score (0-100 integer profile completeness/strength score). No prose outside JSON.",
        },
        { role: "user", content: data.resumeText },
      ],
      { json: true },
    );

    let parsed: ResumeAnalysis;
    try {
      parsed = JSON.parse(raw) as ResumeAnalysis;
    } catch {
      throw new Error("AI returned invalid JSON");
    }

    // Persist summary/score/title onto freelancer_profiles for the current user.
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("id")
      .eq("auth_user_id", context.userId)
      .maybeSingle();

    if (profile?.id) {
      await context.supabase.from("freelancer_profiles").upsert(
        {
          profile_id: profile.id,
          ai_summary: parsed.summary,
          ai_score: Math.max(0, Math.min(100, parsed.score ?? 0)),
          title: parsed.title?.slice(0, 120) ?? null,
          experience_years: parsed.experience_years ?? null,
          resume_text: data.resumeText.slice(0, 20000),
        },
        { onConflict: "profile_id" },
      );
    }

    return parsed;
  });