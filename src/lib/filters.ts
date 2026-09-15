import type { JobRecord } from "./types";

export type JobFilters = { q?: string; location?: string; remote?: string; company?: string; employmentType?: string };

export function filterJobs(items: JobRecord[], filters: JobFilters) {
  const q = filters.q?.trim().toLowerCase();
  return items.filter((job) => {
    if (q && !`${job.title} ${job.company} ${job.description}`.toLowerCase().includes(q)) return false;
    if (filters.location && !job.location.toLowerCase().includes(filters.location.toLowerCase())) return false;
    if (filters.remote === "true" && !job.remote) return false;
    if (filters.remote === "false" && job.remote) return false;
    if (filters.company && job.company !== filters.company) return false;
    if (filters.employmentType && job.employmentType !== filters.employmentType) return false;
    return true;
  });
}

export function isFresh(job: Pick<JobRecord, "isActive" | "lastSeenAt">, days = Number(process.env.FRESHNESS_DAYS ?? 7)) {
  return job.isActive && Date.now() - new Date(job.lastSeenAt).getTime() <= days * 86_400_000;
}
