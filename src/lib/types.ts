export type EmploymentType = "Full-time" | "Part-time" | "Contract" | "Internship" | "Temporary";

export type JobRecord = {
  id: string;
  source: string;
  sourceJobId: string | null;
  canonicalUrl: string;
  title: string;
  company: string;
  location: string;
  description: string;
  employmentType: string | null;
  remote: boolean;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  postedAt: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  contentHash: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type JobListResponse = { jobs: JobRecord[]; total: number; page: number; pageSize: number; totalPages: number };
