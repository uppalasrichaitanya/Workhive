import { createHash } from "node:crypto";
import { z } from "zod";

const stringish = z.union([z.string(), z.number()]).transform(String);
export const incomingJobSchema = z.object({
  id: stringish.optional(),
  sourceJobId: stringish.optional(),
  jobId: stringish.optional(),
  url: z.string().url().optional(),
  applyUrl: z.string().url().optional(),
  canonicalUrl: z.string().url().optional(),
  title: z.string().min(2),
  company: z.string().min(1).optional(),
  companyName: z.string().min(1).optional(),
  organization: z.string().min(1).optional(),
  location: z.union([z.string(), z.array(z.string())]).optional(),
  locations_derived: z.array(z.string()).optional(),
  locations_alt: z.array(z.string()).optional(),
  locations_raw: z.array(z.unknown()).optional(),
  locations_alt_raw: z.array(z.unknown()).optional(),
  description: z.string().optional(),
  jobDescription: z.string().optional(),
  description_text: z.string().optional(),
  employmentType: z.union([z.string(), z.array(z.string())]).optional(),
  jobType: z.string().optional(),
  employment_type: z.union([z.string(), z.array(z.string())]).optional(),
  remote: z.union([z.boolean(), z.string()]).optional(),
  isRemote: z.union([z.boolean(), z.string()]).optional(),
  remote_derived: z.union([z.boolean(), z.string()]).optional(),
  remoteEligible: z.union([z.boolean(), z.string()]).optional(),
  ai_work_arrangement: z.string().optional(),
  salaryMin: z.number().optional(),
  salaryMax: z.number().optional(),
  salary: z.string().optional(),
  salary_raw: z.string().optional(),
  salaryCurrency: z.string().optional(),
  ai_salary_currency: z.string().optional(),
  ai_salary_min_value: z.number().optional(),
  ai_salary_max_value: z.number().optional(),
  ai_salary_minvalue: z.number().optional(),
  ai_salary_maxvalue: z.number().optional(),
  postedAt: z.union([z.string(), z.date()]).optional(),
  datePosted: z.union([z.string(), z.date()]).optional(),
  date_posted: z.union([z.string(), z.date()]).optional(),
}).passthrough();

export type IncomingJob = z.infer<typeof incomingJobSchema>;

function truthy(value: unknown) {
  return value === true || ["true", "yes", "remote", "fully remote"].includes(String(value).toLowerCase());
}

const explicitNonIndiaPattern = /\b(?:united states|u\.s\.a?\.?|usa|canada|australia|united kingdom|england|germany|france|singapore|indiana|illinois|indianapolis|chicago|texas|california|new york|massachusetts|washington|florida|ohio|georgia|colorado|virginia|oregon|pennsylvania|maryland)\b/i;

export function isExplicitlyNonIndiaLocation(location: string) {
  return explicitNonIndiaPattern.test(location);
}

function rawLocation(value: unknown) {
  if (!Array.isArray(value)) return "";
  return value.map((entry) => {
    if (typeof entry === "string") return entry;
    if (!entry || typeof entry !== "object") return "";
    const address = (entry as { address?: unknown }).address;
    if (!address || typeof address !== "object") return "";
    const postal = address as { addressLocality?: unknown; addressRegion?: unknown; addressCountry?: unknown };
    return [postal.addressLocality, postal.addressRegion, postal.addressCountry].filter(Boolean).join(", ");
  }).filter(Boolean).join(", ");
}

function cleanUrl(value: string) {
  const url = new URL(value);
  url.hash = "";
  ["utm_source", "utm_medium", "utm_campaign", "ref"].forEach((key) => url.searchParams.delete(key));
  return url.toString().replace(/\/$/, "");
}

function parseSalary(value: string | undefined) {
  if (!value) return { min: undefined, max: undefined, currency: undefined };
  const numbers = [...value.replace(/,/g, "").matchAll(/[0-9]+(?:\.[0-9]+)?/g)].map((match) => Number(match[0]));
  return { min: numbers[0], max: numbers[1] ?? numbers[0], currency: /\$|usd/i.test(value) ? "USD" : "INR" };
}

export function normalizeJob(payload: unknown, source = "apify") {
  const item = incomingJobSchema.parse(payload);
  const canonicalUrl = item.canonicalUrl ?? item.applyUrl ?? item.url;
  if (!canonicalUrl) throw new Error("Job is missing a canonical URL");
  const sourceLocation = item.location ?? item.locations_derived ?? item.locations_alt;
  const location = Array.isArray(sourceLocation)
    ? sourceLocation.join(", ")
    : sourceLocation ?? (rawLocation(item.locations_raw) || rawLocation(item.locations_alt_raw) || "India");
  const salary = parseSalary(item.salary ?? item.salary_raw);
  const title = item.title.trim();
  const company = (item.company ?? item.companyName ?? item.organization ?? "Unknown company").trim();
  const description = (item.description ?? item.description_text ?? item.jobDescription ?? "").trim();
  const contentHash = createHash("sha256").update(`${title}|${company}|${location}|${description}`).digest("hex");
  const posted = item.postedAt ?? item.datePosted ?? item.date_posted;
  const employment = item.employmentType ?? item.employment_type ?? item.jobType;
  const employmentType = Array.isArray(employment) ? employment.join(", ") : employment;
  const workArrangement = item.ai_work_arrangement;
  return {
    source,
    sourceJobId: item.sourceJobId ?? item.jobId ?? item.id ?? null,
    canonicalUrl: cleanUrl(canonicalUrl),
    title,
    company,
    location,
    description,
    employmentType: employmentType ?? null,
    remote: truthy(item.remote ?? item.isRemote ?? item.remote_derived ?? item.remoteEligible) || /^(remote|fully remote)$/i.test(workArrangement ?? "") || /remote/i.test(location),
    salaryMin: item.salaryMin ?? item.ai_salary_min_value ?? item.ai_salary_minvalue ?? salary.min ?? null,
    salaryMax: item.salaryMax ?? item.ai_salary_max_value ?? item.ai_salary_maxvalue ?? salary.max ?? null,
    salaryCurrency: item.salaryCurrency ?? item.ai_salary_currency ?? salary.currency ?? null,
    postedAt: posted ? new Date(posted) : null,
    contentHash,
    rawPayload: payload,
  };
}

export function duplicateKeys(job: { source: string; sourceJobId?: string | null; canonicalUrl: string; contentHash: string }) {
  return [job.sourceJobId ? `${job.source}:${job.sourceJobId}` : null, job.canonicalUrl, job.contentHash].filter(Boolean) as string[];
}
