"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { ArrowLeft, Bookmark, BriefcaseBusiness, Check, Clock3, ExternalLink, MapPin } from "lucide-react";
import type { JobRecord } from "@/lib/types";

function relativeTime(date: string | null) {
  if (!date) return "Recently listed";
  const hours = Math.floor((Date.now() - new Date(date).getTime()) / 3600000);
  if (hours < 1) return "Posted just now";
  if (hours < 24) return "Posted " + hours + "h ago";
  const days = Math.floor(hours / 24);
  return days === 1 ? "Posted yesterday" : "Posted " + days + "d ago";
}
function salary(job: JobRecord) {
  if (!job.salaryMin && !job.salaryMax) return "Salary not listed";
  const format = (value: number) => value >= 100000 ? "₹" + (value / 100000).toFixed(1).replace(/\.0$/, "") + "L" : "₹" + Math.round(value / 1000) + "k";
  return job.salaryMin && job.salaryMax ? format(job.salaryMin) + " – " + format(job.salaryMax) : format(job.salaryMin ?? job.salaryMax ?? 0);
}
function initials(company: string) { return company.split(/\s+/).map((word) => word[0]).join("").slice(0, 2).toUpperCase(); }

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [job, setJob] = useState<JobRecord | null>(null);
  const [missing, setMissing] = useState(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    params.then(({ id }) => fetch("/api/jobs/" + id).then((response) => { if (!response.ok) throw new Error("missing"); return response.json(); }).then((result) => setJob(result.job)).catch(() => setMissing(true)));
    try { const current = JSON.parse(localStorage.getItem("india-jobs-saved") ?? "[]") as string[]; setSaved(current.includes(location.pathname.split("/").pop() ?? "")); } catch { setSaved(false); }
  }, [params]);
  const toggleSaved = () => { if (!job) return; const current = JSON.parse(localStorage.getItem("india-jobs-saved") ?? "[]") as string[]; const next = current.includes(job.id) ? current.filter((id) => id !== job.id) : [...current, job.id]; localStorage.setItem("india-jobs-saved", JSON.stringify(next)); setSaved(!saved); };
  if (missing) return <main className="workspace"><Link href="/jobs" className="open-source"><ArrowLeft size={14} /> Back to jobs</Link><div className="empty-state" style={{ marginTop: 36 }}><h3>Job not found</h3><p>This listing may have expired or been removed.</p></div></main>;
  if (!job) return <main className="workspace"><div className="job-list"><div className="skeleton" /><div className="skeleton" /></div></main>;
  return <div className="app-shell"><header className="topbar"><div className="topbar-inner"><Link href="/" className="brand"><Image src="/workhive-mark.svg" width={29} height={29} alt="" priority /><span>workhive</span></Link><Link href="/jobs" className="open-source"><ArrowLeft size={14} /> Back to search</Link></div></header><main className="workspace" style={{ maxWidth: 980 }}><Link href="/jobs" className="open-source"><ArrowLeft size={14} /> All jobs</Link><section style={{ marginTop: 28 }}><div className="detail-header"><div className="company-avatar" style={{ width: 52, height: 52, fontSize: 16 }}>{initials(job.company)}</div><div><div className="eyebrow">{job.source} listing</div><h1 className="detail-title" style={{ fontSize: "clamp(27px, 4vw, 42px)", marginTop: 7 }}>{job.title}</h1><p className="detail-company" style={{ fontSize: 15 }}>{job.company}</p></div><div className="detail-actions"><button className={"save-button " + (saved ? "save-button-saved" : "")} onClick={toggleSaved} aria-label={saved ? "Remove saved job" : "Save job"}>{saved ? <Check size={16} /> : <Bookmark size={16} />}</button></div></div><div className="detail-meta" style={{ maxWidth: 700, marginTop: 28 }}><div className="detail-meta-item"><MapPin size={13} /> Location<strong>{job.location}</strong></div><div className="detail-meta-item"><span style={{ fontSize: 13 }}>₹</span> Compensation<strong>{salary(job)}</strong></div><div className="detail-meta-item"><BriefcaseBusiness size={13} /> Type<strong>{job.employmentType ?? "Not specified"}</strong></div><div className="detail-meta-item"><Clock3 size={13} /> Freshness<strong>{relativeTime(job.postedAt)}</strong></div></div><div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 250px", gap: 48, marginTop: 30 }}><div><h2 className="detail-section-title" style={{ fontSize: 15 }}>About the role</h2><div className="detail-description" style={{ maxHeight: "none", fontSize: 14 }}>{job.description || "The employer has not provided a description."}</div></div><aside><a className="apply-button" style={{ width: "100%", justifyContent: "center", padding: "12px 15px", fontSize: 13 }} href={job.canonicalUrl} target="_blank" rel="noreferrer">Apply on {job.source} <ExternalLink size={14} /></a><div className="filter-tip" style={{ marginTop: 16 }}>Why this may fit: the role is listed for {job.location}, is {job.remote ? "remote-friendly" : "office or hybrid"}, and is a {job.employmentType?.toLowerCase() ?? "professional"} opportunity.</div></aside></div></section></main><a className="mobile-sticky-apply apply-button" href={job.canonicalUrl} target="_blank" rel="noreferrer">Apply now <ExternalLink size={14} /></a></div>;
}
