"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  BriefcaseBusiness,
  Check,
  Clock3,
  ExternalLink,
  Keyboard,
  MapPin,
  Menu,
  Moon,
  Search,
  SlidersHorizontal,
  Sun,
  X,
} from "lucide-react";
import type { JobListResponse, JobRecord } from "@/lib/types";

type Filters = { q: string; location: string; remote: string; company: string; employmentType: string };
const defaultFilters: Filters = { q: "", location: "", remote: "", company: "", employmentType: "" };
const heroCells = ["Staff engineer", "Backend systems", "Brand design", "Growth data", "Product platform"];

function relativeTime(date: string | null) {
  if (!date) return "Recently listed";
  const hours = Math.floor((Date.now() - new Date(date).getTime()) / 3600000);
  if (hours < 1) return "Posted just now";
  if (hours < 24) return "Posted " + hours + "h ago";
  const days = Math.floor(hours / 24);
  return days === 1 ? "Posted yesterday" : "Posted " + days + "d ago";
}

function isFresh(date: string | null) {
  return Boolean(date && Date.now() - new Date(date).getTime() < 86400000);
}

function salary(job: JobRecord) {
  if (!job.salaryMin && !job.salaryMax) return "Salary not listed";
  const format = (value: number) => value >= 100000 ? "₹" + (value / 100000).toFixed(1).replace(/\\.0$/, "") + "L" : "₹" + Math.round(value / 1000) + "k";
  if (job.salaryMin && job.salaryMax) return format(job.salaryMin) + " – " + format(job.salaryMax);
  return format(job.salaryMin ?? job.salaryMax ?? 0);
}

function skills(job: JobRecord) {
  const words = ["TypeScript", "React", "Python", "SQL", "Product", "Design", "Data", "AWS", "Android"];
  const source = (job.title + " " + job.description).toLowerCase();
  return words.filter((word) => source.includes(word.toLowerCase())).slice(0, 3);
}

function initials(company: string) {
  return company.split(/\s+/).map((word) => word[0]).join("").slice(0, 2).toUpperCase();
}

export default function JobsWorkspace() {
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<JobListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<JobRecord | null>(null);
  const [saved, setSaved] = useState<string[]>([]);
  const [dark, setDark] = useState(false);
  const [mobileFilters, setMobileFilters] = useState(false);
  const [mobileDetail, setMobileDetail] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setFilters({ q: params.get("q") ?? "", location: params.get("location") ?? "", remote: params.get("remote") ?? "", company: params.get("company") ?? "", employmentType: params.get("employmentType") ?? "" });
    setPage(Math.max(1, Number(params.get("page") ?? 1) || 1));
    try { setSaved(JSON.parse(localStorage.getItem("india-jobs-saved") ?? "[]")); } catch { setSaved([]); }
    setDark(localStorage.getItem("india-jobs-theme") === "dark");
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("india-jobs-theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); searchRef.current?.focus(); }
      if (event.key === "/" && document.activeElement?.tagName !== "INPUT") { event.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => value && params.set(key, value));
    params.set("page", String(page));
    params.set("pageSize", showSaved ? "50" : "8");
    window.history.replaceState(null, "", "/?" + params.toString());
    setLoading(true);
    setError("");
    fetch("/api/jobs?" + params.toString(), { signal: controller.signal })
      .then((response) => { if (!response.ok) throw new Error("Unable to load jobs"); return response.json() as Promise<JobListResponse>; })
      .then((result) => {
        setData(result);
        if (!selected && result.jobs[0]) setSelected(result.jobs[0]);
        else if (selected && !result.jobs.some((job) => job.id === selected.id)) setSelected(result.jobs[0] ?? null);
      })
      .catch((reason: unknown) => { if (reason instanceof DOMException && reason.name === "AbortError") return; setError("We could not load the latest roles. Check your connection and try again."); })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [filters, page, showSaved]); // eslint-disable-line react-hooks/exhaustive-deps

  const companies = useMemo(() => Array.from(new Set((data?.jobs ?? []).map((job) => job.company))).sort(), [data]);
  const activeChips = Object.entries(filters).filter(([, value]) => value);
  const visibleJobs = showSaved ? (data?.jobs ?? []).filter((job) => saved.includes(job.id)) : (data?.jobs ?? []);
  const toggleSaved = (id: string) => setSaved((current) => {
    const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
    localStorage.setItem("india-jobs-saved", JSON.stringify(next));
    return next;
  });
  const updateFilter = (key: keyof Filters, value: string) => { setFilters((current) => ({ ...current, [key]: value })); setPage(1); };
  const clearFilters = () => { setFilters(defaultFilters); setPage(1); };
  const selectJob = (job: JobRecord) => { setSelected(job); setMobileDetail(true); };

  return <div className="app-shell">
    <header className="topbar">
      <div className="topbar-inner">
        <Link href="/" className="brand"><Image src="/workhive-mark.svg" width={30} height={30} alt="" priority /><span>workhive</span></Link>
        <nav className="nav-actions" aria-label="Main navigation">
          <a className="nav-link" href="#search">Search roles</a>
          <button className="nav-link" onClick={() => { setShowSaved((value) => !value); setPage(1); }}>{showSaved ? "All roles" : "Saved"} <span className="source-line">({saved.length})</span></button>
          <span className="shortcut"><Keyboard size={12} /> K</span>
          <button className="icon-button" onClick={() => setDark((value) => !value)} aria-label={dark ? "Use light theme" : "Use dark theme"} title={dark ? "Use light theme" : "Use dark theme"}>{dark ? <Sun size={16} /> : <Moon size={16} />}</button>
        </nav>
      </div>
    </header>
    <main className="workspace" id="search">
      <section className="hero">
        <div className="eyebrow">India · technology · startups</div>
        <h1 className="workspace-title">Find work worth doing.</h1>
        <p className="workspace-subtitle">A focused ledger of roles from public employer and ATS pages. Clear sources, direct applications, no noise.</p>
        <div className="comb-stage" aria-hidden="true">{heroCells.map((cell, index) => <span className={"comb-cell comb-cell-" + index} key={cell}><span>{cell}</span></span>)}</div>
        <form className="search-bar" onSubmit={(event) => { event.preventDefault(); setPage(1); }}>
          <Search className="search-icon" size={19} />
          <input ref={searchRef} className="search-input" value={filters.q} onChange={(event) => updateFilter("q", event.target.value)} placeholder="Search jobs" aria-label="Search by title, skill, or company" />
          <span className="shortcut"><Keyboard size={12} /> K</span>
          <button className="search-submit" type="submit"><Search size={15} /><span>Search</span></button>
        </form>
      </section>
      <div className="content-grid">
        <aside className="filter-rail" aria-label="Job filters">
          <div className="filter-heading"><span><SlidersHorizontal size={14} /> Filters</span><button className="clear-button" onClick={clearFilters}>Clear all</button></div>
          <div className="desktop-filter"><FilterControls filters={filters} updateFilter={updateFilter} companies={companies} /></div>
          <button className="mobile-filter-button" aria-label="More filters" onClick={() => setMobileFilters(true)}><Menu size={15} /> Refine</button>
          <div className="filter-note">Sources are named on every card. Jobs link directly to the original application.</div>
        </aside>
        <section className="results-column" aria-live="polite">
          <div className="results-toolbar"><div className="results-count">{showSaved ? visibleJobs.length : data?.total ?? 0} roles found <span>{showSaved ? "saved on this device" : "matching this ledger"}</span></div><select className="sort-select" aria-label="Sort jobs"><option>Newest first</option></select></div>
          {activeChips.length > 0 && <div className="active-chips">{activeChips.map(([key, value]) => <span className="chip" key={key}>{value}<button onClick={() => updateFilter(key as keyof Filters, "")} aria-label={"Remove " + value + " filter"}><X size={12} /></button></span>)}</div>}
          {error ? <div className="error-state">{error} <button className="reset-button" onClick={() => setFilters({ ...filters })}>Retry</button></div> : loading ? <div className="job-list">{[1, 2, 3, 4].map((item) => <div className="skeleton" key={item} />)}</div> : showSaved && visibleJobs.length === 0 ? <SavedEmpty onReset={() => setShowSaved(false)} /> : visibleJobs.length ? <div className="job-list">{visibleJobs.map((job) => <JobCard key={job.id} job={job} selected={selected?.id === job.id} saved={saved.includes(job.id)} onSelect={() => selectJob(job)} onSave={() => toggleSaved(job.id)} />)}</div> : <EmptyState onReset={clearFilters} />}
          {data && data.totalPages > 1 && !showSaved && <div className="pagination"><button className="page-button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} aria-label="Previous page"><ArrowLeft size={14} /></button><span className="page-label">Page {page} of {data.totalPages}</span><button className="page-button" disabled={page >= data.totalPages} onClick={() => setPage((value) => value + 1)} aria-label="Next page"><ArrowRight size={14} /></button></div>}
        </section>
        <DetailPanel job={selected} saved={selected ? saved.includes(selected.id) : false} onSave={() => selected && toggleSaved(selected.id)} />
      </div>
    </main>
    {mobileFilters && <div className="refine-sheet"><div className="refine-header"><strong>Refine results</strong><button className="icon-button" onClick={() => setMobileFilters(false)} aria-label="Close filters"><X size={17} /></button></div><FilterControls filters={filters} updateFilter={updateFilter} companies={companies} /><button className="apply-filters" onClick={() => setMobileFilters(false)}>Show roles</button></div>}
    {mobileDetail && selected && <div className="mobile-detail-view"><DetailPanel job={selected} saved={saved.includes(selected.id)} onSave={() => toggleSaved(selected.id)} onClose={() => setMobileDetail(false)} /></div>}
  </div>;
}

function FilterControls({ filters, updateFilter, companies }: { filters: Filters; updateFilter: (key: keyof Filters, value: string) => void; companies: string[] }) {
  return <div className="filter-controls">
    <div className="filter-group"><label className="filter-label" htmlFor="location">Location</label><input id="location" className="filter-input" value={filters.location} onChange={(event) => updateFilter("location", event.target.value)} placeholder="Bengaluru, Delhi, remote" /></div>
    <div className="filter-group"><span className="filter-label">Work mode</span><div className="segmented">{[["", "Any"], ["true", "Remote"], ["false", "On-site"]].map(([value, label]) => <button type="button" key={value} className={"segment " + (filters.remote === value ? "segment-active" : "")} onClick={() => updateFilter("remote", value)}>{label}</button>)}</div></div>
    <div className="filter-group"><label className="filter-label" htmlFor="company">Company</label><select id="company" className="filter-select" value={filters.company} onChange={(event) => updateFilter("company", event.target.value)}><option value="">All companies</option>{companies.map((company) => <option key={company}>{company}</option>)}</select></div>
    <div className="filter-group"><label className="filter-label" htmlFor="employment">Employment type</label><select id="employment" className="filter-select" value={filters.employmentType} onChange={(event) => updateFilter("employmentType", event.target.value)}><option value="">Any type</option><option>Full-time</option><option>Part-time</option><option>Contract</option><option>Internship</option></select></div>
  </div>;
}

function JobCard({ job, selected, saved, onSelect, onSave }: { job: JobRecord; selected: boolean; saved: boolean; onSelect: () => void; onSave: () => void }) {
  const fresh = isFresh(job.postedAt);
  const jobSkills = skills(job);
  return <article className={"job-card " + (selected ? "job-card-selected" : "")} onClick={onSelect} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(); } }} tabIndex={0}>
    <div className="job-card-top"><div className="company-avatar">{initials(job.company)}</div><div className="job-card-main"><h2 className="job-title"><span className={"job-title-text " + (fresh ? "freshness-fresh" : "freshness-old")}>{job.title}</span></h2><p className="company-name">{job.company}</p></div><button className={"save-button " + (saved ? "save-button-saved" : "")} onClick={(event) => { event.stopPropagation(); onSave(); }} aria-label={saved ? "Remove saved job" : "Save job"} title={saved ? "Remove saved job" : "Save job"}>{saved ? <Check size={15} /> : <Bookmark size={15} />}</button></div>
    <div className="job-meta"><span className="meta-item"><MapPin size={13} />{job.location}</span><span className="meta-item"><BriefcaseBusiness size={13} />{job.employmentType ?? "Role"}</span><span className="meta-item"><Clock3 size={13} />{relativeTime(job.postedAt)}</span></div>
    <div className="job-card-bottom"><div><div className="tag-row">{jobSkills.map((skill) => <span className="skill-tag" key={skill}>{skill}</span>)}</div><div className="source-line salary-line">{salary(job)}</div></div><span className="source-stamp">{job.source}</span><a className="apply-button" href={job.canonicalUrl} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>Apply <ExternalLink size={12} /></a></div>
  </article>;
}

function DetailPanel({ job, saved, onSave, onClose }: { job: JobRecord | null; saved: boolean; onSave: () => void; onClose?: () => void }) {
  if (!job) return <aside className="detail-panel"><div className="detail-empty"><div><div className="detail-empty-icon"><BriefcaseBusiness size={20} /></div><strong>Select a role to preview it</strong><p>Compare the ledger entry here, then apply at the original source.</p></div></div></aside>;
  return <aside className="detail-panel">
    <div className="detail-header">{onClose && <button className="detail-close icon-button" onClick={onClose} aria-label="Close role details"><ArrowLeft size={17} /></button>}<div className="company-avatar">{initials(job.company)}</div><div><span className="source-stamp detail-stamp">{job.source}</span><h2 className="detail-title">{job.title}</h2><p className="detail-company">{job.company}</p></div><div className="detail-actions"><button className={"save-button " + (saved ? "save-button-saved" : "")} onClick={onSave} aria-label="Save job">{saved ? <Check size={15} /> : <Bookmark size={15} />}</button></div></div>
    <div className="detail-meta"><div className="detail-meta-item"><MapPin size={13} /> Location<strong>{job.location}</strong></div><div className="detail-meta-item"><span>₹</span> Compensation<strong>{salary(job)}</strong></div><div className="detail-meta-item"><BriefcaseBusiness size={13} /> Type<strong>{job.employmentType ?? "Not specified"}</strong></div><div className="detail-meta-item"><Clock3 size={13} /> Freshness<strong>{relativeTime(job.postedAt)}</strong></div></div>
    <div className="tag-row">{skills(job).map((skill) => <span className="skill-tag" key={skill}>{skill}</span>)}</div><h3 className="detail-section-title">The role</h3><div className="detail-description">{job.description || "The employer has not provided a description."}</div>
    <div className="detail-footer"><span className="source-line">Source: {job.source}</span><a className="open-source" href={job.canonicalUrl} target="_blank" rel="noreferrer">Open source <ExternalLink size={13} /></a></div><Link href={"/jobs/" + job.id} className="open-source detail-link">View full details <ArrowRight size={13} /></Link>
  </aside>;
}

function EmptyState({ onReset }: { onReset: () => void }) { return <div className="empty-state"><div className="empty-icon"><Search size={18} /></div><h3>No roles match these filters</h3><p>Try widening location or work mode.</p><button className="reset-button" onClick={onReset}>Clear filters</button></div>; }
function SavedEmpty({ onReset }: { onReset: () => void }) { return <div className="empty-state"><div className="empty-icon"><Bookmark size={18} /></div><h3>No saved roles yet</h3><p>Save a role to keep it on this device.</p><button className="reset-button" onClick={onReset}>Browse all roles</button></div>; }
