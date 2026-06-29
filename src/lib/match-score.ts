// Lightweight TF-IDF + cosine similarity used to rank jobs for a freelancer.
// Pure TypeScript, runs anywhere. Not a real ML service — deterministic heuristic.

const STOP = new Set([
  "the","a","an","and","or","but","of","to","in","on","for","with","at","by","is","are","be","as","this","that","it","from","we","you","your","our","their","i","my","me","they","them",
]);

export function tokenize(text: string): string[] {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9+#./\s-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP.has(t));
}

function tf(tokens: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const t of tokens) m.set(t, (m.get(t) ?? 0) + 1);
  const total = tokens.length || 1;
  for (const [k, v] of m) m.set(k, v / total);
  return m;
}

export function buildIdf(corpora: string[][]): Map<string, number> {
  const df = new Map<string, number>();
  for (const doc of corpora) {
    const seen = new Set(doc);
    for (const t of seen) df.set(t, (df.get(t) ?? 0) + 1);
  }
  const N = corpora.length || 1;
  const idf = new Map<string, number>();
  for (const [k, v] of df) idf.set(k, Math.log((N + 1) / (v + 1)) + 1);
  return idf;
}

export function tfidfVector(tokens: string[], idf: Map<string, number>): Map<string, number> {
  const v = tf(tokens);
  for (const [k, val] of v) v.set(k, val * (idf.get(k) ?? 1));
  return v;
}

export function cosine(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0, na = 0, nb = 0;
  for (const [k, va] of a) {
    na += va * va;
    const vb = b.get(k);
    if (vb) dot += va * vb;
  }
  for (const vb of b.values()) nb += vb * vb;
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

export interface FreelancerProfileForMatch {
  title?: string | null;
  skills: string[];
  resume_text?: string | null;
}

export interface JobForMatch {
  id: string;
  title: string;
  description: string;
  required_skills?: string[] | null;
}

export function scoreJobs(profile: FreelancerProfileForMatch, jobs: JobForMatch[]): Map<string, number> {
  const profileDoc = [
    profile.title ?? "",
    (profile.skills ?? []).join(" "),
    profile.resume_text ?? "",
  ].join(" ");

  const docs = [profileDoc, ...jobs.map((j) => `${j.title} ${j.description} ${(j.required_skills ?? []).join(" ")}`)];
  const tokens = docs.map(tokenize);
  const idf = buildIdf(tokens);
  const profileVec = tfidfVector(tokens[0], idf);

  const profileSkillsLower = new Set((profile.skills ?? []).map((s) => s.toLowerCase().trim()));

  const out = new Map<string, number>();
  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i];
    const jobVec = tfidfVector(tokens[i + 1], idf);
    const sim = cosine(profileVec, jobVec); // 0..1
    const required = (job.required_skills ?? []).map((s) => s.toLowerCase().trim());
    const overlap =
      required.length === 0
        ? 0
        : required.filter((s) => profileSkillsLower.has(s)).length / required.length;
    // Blend: 60% skill overlap, 40% semantic cosine. Scale to 0-100.
    const blended = (overlap * 0.6 + sim * 0.4) * 100;
    out.set(job.id, Math.round(blended));
  }
  return out;
}