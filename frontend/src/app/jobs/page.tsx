"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/ui/modal";
import {
  jobService,
  JobOut,
  StructuredRequirementsOut,
} from "@/services/jobs";
import {
  Briefcase,
  Search,
  MapPin,
  Bookmark,
  BookmarkCheck,
  Sparkles,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Building2,
  Calendar,
  Layers,
  FileCode2,
  AlertCircle,
  Clock,
  CheckCircle2,
  Globe,
} from "lucide-react";

const AVAILABLE_SOURCES = [
  { id: "indeed", label: "Indeed", status: "Active" },
  { id: "linkedin", label: "LinkedIn", status: "Guest API" },
  { id: "google", label: "Google Jobs", status: "Parser Deprecated" },
  { id: "glassdoor", label: "Glassdoor", status: "Blocked" },
  { id: "zip_recruiter", label: "ZipRecruiter", status: "US 403" },
];

const COUNTRY_OPTIONS = [
  { value: "auto", label: "Auto-Detect Region" },
  { value: "india", label: "India" },
  { value: "usa", label: "United States" },
  { value: "uk", label: "United Kingdom" },
  { value: "canada", label: "Canada" },
  { value: "germany", label: "Germany" },
];

const formatSourceLabel = (src: string) => {
  const lower = src.toLowerCase();
  if (lower.includes("linkedin")) return "LinkedIn";
  if (lower.includes("indeed")) return "Indeed";
  if (lower.includes("direct") || lower.includes("campus")) return "Campus Direct";
  if (lower.includes("google")) return "Google Jobs";
  if (lower.includes("glassdoor")) return "Glassdoor";
  if (lower.includes("zip")) return "ZipRecruiter";
  return src.toUpperCase();
};

export default function JobsPage() {
  const [activeTab, setActiveTab] = useState<"all" | "saved">("all");
  const [jobs, setJobs] = useState<JobOut[]>([]);
  const [savedJobs, setSavedJobs] = useState<JobOut[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [locationQuery, setLocationQuery] = useState<string>("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>("All");

  const [selectedSources, setSelectedSources] = useState<string[]>(["indeed", "linkedin"]);
  const [selectedCountry, setSelectedCountry] = useState<string>("auto");
  const [isRemoteOnly, setIsRemoteOnly] = useState<boolean>(false);
  const [selectedSourceFilter, setSelectedSourceFilter] = useState<string>("All");

  const [isScraping, setIsScraping] = useState<boolean>(false);
  const [scrapeSuccess, setScrapeSuccess] = useState<string>("");

  const [isCustomModalOpen, setIsCustomModalOpen] = useState<boolean>(false);
  const [customJdText, setCustomJdText] = useState<string>("");
  const [isAnalyzingCustom, setIsAnalyzingCustom] = useState<boolean>(false);
  const [customAnalysis, setCustomAnalysis] = useState<StructuredRequirementsOut | null>(null);
  const [customError, setCustomError] = useState<string>("");

  const roleTags = ["All", "Software Engineer", "Frontend", "Backend", "Fullstack", "AI / ML", "Data", "DevOps"];

  const toggleSource = (sourceId: string) => {
    if (selectedSources.includes(sourceId)) {
      if (selectedSources.length === 1) return;
      setSelectedSources(selectedSources.filter((s) => s !== sourceId));
    } else {
      setSelectedSources([...selectedSources, sourceId]);
    }
  };

  const loadJobs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const roleParam = selectedRoleFilter === "All" ? undefined : selectedRoleFilter;
      const sourceParam = selectedSourceFilter === "All" ? undefined : selectedSourceFilter;
      const res = await jobService.listJobs({
        search: searchQuery || undefined,
        location: locationQuery || undefined,
        role: roleParam,
        source: sourceParam,
        limit: 100,
      });
      setJobs(res.items);

      const saved = await jobService.getSavedJobs();
      setSavedJobs(saved);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load jobs feed.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, locationQuery, selectedRoleFilter, selectedSourceFilter]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const handleToggleSave = async (job: JobOut) => {
    const isCurrentlySaved = job.is_saved;
    const updatedJobs = jobs.map((j) =>
      j.id === job.id ? { ...j, is_saved: !isCurrentlySaved } : j
    );
    setJobs(updatedJobs);

    if (isCurrentlySaved) {
      setSavedJobs((prev) => prev.filter((s) => s.id !== job.id));
      try {
        await jobService.unsaveJob(job.id);
      } catch {
        setJobs(jobs);
      }
    } else {
      setSavedJobs((prev) => [{ ...job, is_saved: true }, ...prev]);
      try {
        await jobService.saveJob(job.id);
      } catch {
        setJobs(jobs);
      }
    }
  };

  const handleLiveScrape = async () => {
    setIsScraping(true);
    setScrapeSuccess("");
    setError("");
    try {
      const roleTarget = selectedRoleFilter === "All" ? "Software Engineer" : selectedRoleFilter;
      const res = await jobService.searchJobs({
        role: roleTarget,
        location: locationQuery || (isRemoteOnly ? "Remote" : "Bengaluru, India"),
        sources: selectedSources,
        country: selectedCountry === "auto" ? undefined : selectedCountry,
        is_remote: isRemoteOnly,
        limit: 15,
      });

      const breakdownParts: string[] = [];
      if (res.sources_status) {
        Object.entries(res.sources_status).forEach(([src, status]) => {
          breakdownParts.push(`${src.toUpperCase()}: ${String(status).replace(/_/g, " ")}`);
        });
      }
      const breakdownText = breakdownParts.length > 0 ? ` (${breakdownParts.join(" • ")})` : "";
      setScrapeSuccess(`Discovered ${res.total_found} active placements (${res.new_added} newly stored)${breakdownText}.`);
      await loadJobs();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to scrape live postings.";
      setError(msg);
    } finally {
      setIsScraping(false);
    }
  };

  const handleCustomJdAnalyze = async () => {
    if (!customJdText.trim()) return;
    setIsAnalyzingCustom(true);
    setCustomError("");
    setCustomAnalysis(null);
    try {
      const res = await jobService.analyzeJobDescription({
        raw_jd: customJdText,
      });
      setCustomAnalysis(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to analyze custom job description.";
      setCustomError(msg);
    } finally {
      setIsAnalyzingCustom(false);
    }
  };

  const sourceFilteredJobs = (activeTab === "all" ? jobs : savedJobs).filter(
    (j) =>
      selectedSourceFilter === "All" ||
      j.source.toLowerCase().includes(selectedSourceFilter.toLowerCase())
  );
  const displayedJobs = sourceFilteredJobs;

  return (
    <AppShell>
      <div className="space-y-6 pb-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-black pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-black text-white rounded-[5px]">
                <Briefcase className="w-5 h-5" />
              </span>
              <h1 className="text-2xl font-black uppercase tracking-tight">
                Job Intelligence & Discovery
              </h1>
            </div>
            <p className="text-xs text-neutral-600 font-medium mt-1">
              Live placement aggregation across LinkedIn, Indeed, and direct enterprise portals with deterministic requirements extraction.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsCustomModalOpen(true)}
              className="flex items-center gap-1.5 border-2 border-black shadow-[3px_3px_0px_#000]"
            >
              <FileCode2 className="w-4 h-4" />
              <span>Paste Custom JD</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleLiveScrape}
              disabled={isScraping}
              className="flex items-center gap-1.5 shadow-[3px_3px_0px_#000]"
            >
              <RefreshCw className={`w-4 h-4 ${isScraping ? "animate-spin" : ""}`} />
              <span>{isScraping ? "Scraping Live Placements..." : "Fetch Live Placements"}</span>
            </Button>
          </div>
        </div>

        {scrapeSuccess && (
          <div className="bg-neutral-100 border-2 border-black p-3 rounded-[5px] text-xs font-bold flex items-center gap-2 shadow-[2px_2px_0px_#000]">
            <CheckCircle2 className="w-4 h-4 text-black" />
            <span>{scrapeSuccess}</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border-2 border-black p-3 rounded-[5px] text-xs font-bold text-red-700 flex items-center gap-2 shadow-[2px_2px_0px_#000]">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <Card className="border-2 border-black shadow-[4px_4px_0px_#000]">
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-6 relative">
                <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  type="text"
                  placeholder="Search role, skills, keywords..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 border-2 border-black text-sm"
                />
              </div>

              <div className="md:col-span-4 relative">
                <MapPin className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  type="text"
                  placeholder="Location or 'Remote'"
                  value={locationQuery}
                  onChange={(e) => setLocationQuery(e.target.value)}
                  className="pl-9 border-2 border-black text-sm"
                />
              </div>

              <div className="md:col-span-2">
                <Button
                  variant="primary"
                  size="md"
                  onClick={loadJobs}
                  className="w-full flex items-center justify-center gap-1.5 shadow-[3px_3px_0px_#000]"
                >
                  <Search className="w-4 h-4" />
                  <span>Filter</span>
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-xs font-black uppercase tracking-wider text-neutral-500 mr-1 flex items-center gap-1">
                <Layers className="w-3 h-3" /> Track:
              </span>
              {roleTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSelectedRoleFilter(tag)}
                  className={`text-xs px-2.5 py-1 rounded-[5px] border-2 border-black font-bold uppercase transition-all duration-150 ${
                    selectedRoleFilter === tag
                      ? "bg-black text-white shadow-[2px_2px_0px_#000]"
                      : "bg-white text-black hover:bg-neutral-100"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>

            <div className="pt-3 border-t-2 border-black space-y-2">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black uppercase tracking-wider text-black flex items-center gap-1.5 mr-1">
                    <Globe className="w-3.5 h-3.5" /> Scraper Channels:
                  </span>
                  {AVAILABLE_SOURCES.map((src) => {
                    const isSelected = selectedSources.includes(src.id);
                    return (
                      <button
                        key={src.id}
                        type="button"
                        onClick={() => toggleSource(src.id)}
                        className={`text-xs px-2.5 py-1 rounded-[5px] border-2 border-black font-black uppercase transition-all flex items-center gap-1.5 ${
                          isSelected
                            ? "bg-black text-white shadow-[2px_2px_0px_#000]"
                            : "bg-white text-neutral-500 hover:text-black hover:border-black"
                        }`}
                      >
                        <span>{isSelected ? "✓ " : ""}{src.label}</span>
                        <span
                          className={`text-[9px] px-1 py-0.5 rounded-[3px] font-bold ${
                            isSelected ? "bg-white text-black" : "bg-neutral-100 text-neutral-600"
                          }`}
                        >
                          {src.status}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black uppercase text-neutral-600">Region:</span>
                    <select
                      value={selectedCountry}
                      onChange={(e) => setSelectedCountry(e.target.value)}
                      className="px-2.5 py-1 border-2 border-black rounded-[5px] text-xs font-bold bg-white shadow-[2px_2px_0px_#000]"
                    >
                      {COUNTRY_OPTIONS.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-black uppercase tracking-wider select-none">
                    <input
                      type="checkbox"
                      checked={isRemoteOnly}
                      onChange={(e) => setIsRemoteOnly(e.target.checked)}
                      className="w-3.5 h-3.5 accent-black rounded"
                    />
                    <span>Remote Only</span>
                  </label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-black pb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-4 py-1.5 text-xs font-black uppercase tracking-wider rounded-[5px] border-2 border-black transition-all ${
                activeTab === "all"
                  ? "bg-black text-white shadow-[3px_3px_0px_#000]"
                  : "bg-white text-black hover:bg-neutral-100"
              }`}
            >
              All Openings ({jobs.length})
            </button>
            <button
              onClick={() => setActiveTab("saved")}
              className={`px-4 py-1.5 text-xs font-black uppercase tracking-wider rounded-[5px] border-2 border-black transition-all flex items-center gap-1.5 ${
                activeTab === "saved"
                  ? "bg-black text-white shadow-[3px_3px_0px_#000]"
                  : "bg-white text-black hover:bg-neutral-100"
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>Saved Bookmarks ({savedJobs.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pr-1">
            <span className="text-[10px] font-black uppercase text-neutral-500 mr-1 whitespace-nowrap">
              Channel Filter:
            </span>
            {["All", "LinkedIn", "Indeed", "Campus Direct", "Google", "Glassdoor", "ZipRecruiter"].map((srcFilter) => (
              <button
                key={srcFilter}
                onClick={() => setSelectedSourceFilter(srcFilter)}
                className={`px-2.5 py-1 text-[11px] font-black uppercase rounded-[4px] border-2 border-black transition-all whitespace-nowrap ${
                  selectedSourceFilter === srcFilter
                    ? "bg-black text-white shadow-[1px_1px_0px_#000]"
                    : "bg-white text-neutral-600 hover:text-black"
                }`}
              >
                {srcFilter}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center space-y-3 border-2 border-black rounded-[5px] bg-white shadow-[4px_4px_0px_#000]">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-black" />
            <p className="text-xs font-black uppercase tracking-wider text-neutral-600">
              Querying Job Placement Registry...
            </p>
          </div>
        ) : displayedJobs.length === 0 ? (
          <div className="py-16 text-center space-y-4 border-2 border-black rounded-[5px] bg-white shadow-[4px_4px_0px_#000] p-6">
            <Briefcase className="w-10 h-10 mx-auto text-neutral-400" />
            <div className="space-y-1">
              <h3 className="text-base font-black uppercase">
                {activeTab === "saved" ? "No Saved Jobs Yet" : "No Placements Found"}
              </h3>
              <p className="text-xs text-neutral-600 max-w-sm mx-auto font-medium">
                {activeTab === "saved"
                  ? "Click the bookmark icon on any job card to save it for quick reference and tailored application workflows."
                  : "Try loosening your search filters or click 'Fetch Live Placements' to ingest postings directly from job boards."}
              </p>
            </div>
            {activeTab === "all" && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleLiveScrape}
                disabled={isScraping}
                className="shadow-[3px_3px_0px_#000]"
              >
                <span>Trigger Live Job Ingestion</span>
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayedJobs.map((job) => (
              <Card
                key={job.id}
                className="border-2 border-black shadow-[4px_4px_0px_#000] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2 border-b-2 border-black pb-2.5">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-600">
                        <Building2 className="w-3.5 h-3.5" />
                        <span>{job.company}</span>
                      </div>
                      <h2 className="text-base font-black tracking-tight text-black line-clamp-1">
                        {job.title}
                      </h2>
                    </div>

                    <button
                      onClick={() => handleToggleSave(job)}
                      className={`p-1.5 rounded-[5px] border-2 border-black transition-all ${
                        job.is_saved
                          ? "bg-black text-white shadow-[2px_2px_0px_#000]"
                          : "bg-white text-black hover:bg-neutral-100"
                      }`}
                      title={job.is_saved ? "Remove from saved" : "Save job"}
                    >
                      {job.is_saved ? (
                        <BookmarkCheck className="w-4 h-4" />
                      ) : (
                        <Bookmark className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {job.location && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[5px] bg-neutral-100 border border-black font-semibold">
                        <MapPin className="w-3 h-3 text-neutral-600" />
                        <span>{job.location}</span>
                      </span>
                    )}

                    <span className="px-2 py-0.5 rounded-[4px] bg-black text-white text-[10px] font-black uppercase tracking-wider border border-black shadow-[1px_1px_0px_#000]">
                      {formatSourceLabel(job.source)}
                    </span>

                    {job.experience_level && (
                      <span className="px-2 py-0.5 rounded-[5px] bg-neutral-100 border border-black text-[10px] font-bold uppercase">
                        {job.experience_level}
                      </span>
                    )}

                    {job.posted_at && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-neutral-500 font-medium">
                        <Calendar className="w-3 h-3" />
                        <span>{job.posted_at}</span>
                      </span>
                    )}
                  </div>

                  {job.skills && job.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {job.skills.slice(0, 5).map((skill, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 text-[11px] font-bold bg-neutral-100 border border-black rounded-[4px]"
                        >
                          {skill}
                        </span>
                      ))}
                      {job.skills.length > 5 && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold text-neutral-500">
                          +{job.skills.length - 5} more
                        </span>
                      )}
                    </div>
                  )}

                  {job.description && (
                    <p className="text-xs text-neutral-700 line-clamp-2 leading-relaxed">
                      {job.description.replace(/<[^>]*>?/gm, "")}
                    </p>
                  )}
                </div>

                <div className="pt-4 border-t-2 border-black flex items-center justify-between gap-2 mt-3">
                  {job.url ? (
                    <a
                      href={job.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-black uppercase text-neutral-700 hover:text-black flex items-center gap-1 underline underline-offset-2"
                    >
                      <span>Original Listing</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-[11px] text-neutral-400 font-medium">Internal Listing</span>
                  )}

                  <Link href={`/jobs/${job.id}`}>
                    <Button
                      variant="primary"
                      size="sm"
                      className="flex items-center gap-1 text-xs shadow-[2px_2px_0px_#000]"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Requirements & AI</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={isCustomModalOpen}
        onClose={() => setIsCustomModalOpen(false)}
        title="Custom Job Description Analyzer"
        maxWidth="xl"
      >
        <div className="space-y-4">
          <p className="text-xs text-neutral-600 font-medium">
            Paste any unformatted job posting, email invitation, or JD text to extract deterministic skills, tools, responsibilities, and anticipated interview questions.
          </p>

          <Textarea
            placeholder="Paste raw JD content here..."
            value={customJdText}
            onChange={(e) => setCustomJdText(e.target.value)}
            rows={8}
            className="border-2 border-black font-mono text-xs"
          />

          {customError && (
            <div className="bg-red-50 border-2 border-black p-2.5 rounded-[5px] text-xs font-bold text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span>{customError}</span>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsCustomModalOpen(false)}
              className="border-2 border-black"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCustomJdAnalyze}
              disabled={isAnalyzingCustom || !customJdText.trim()}
              className="flex items-center gap-1.5 shadow-[3px_3px_0px_#000]"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isAnalyzingCustom ? "Extracting Requirements..." : "Analyze JD"}</span>
            </Button>
          </div>

          {customAnalysis && (
            <div className="border-t-2 border-black pt-4 mt-4 space-y-4 max-h-[350px] overflow-y-auto pr-1">
              <div className="flex items-center justify-between border-b-2 border-black pb-2">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-neutral-500">Identified Role</span>
                  <h3 className="text-base font-black text-black">{customAnalysis.role}</h3>
                </div>
                <Badge variant="dark">{customAnalysis.model_used}</Badge>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-black" />
                  <span>Required Skills</span>
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {customAnalysis.required_skills.map((s, i) => (
                    <span key={i} className="px-2 py-0.5 text-xs font-bold bg-black text-white rounded-[4px]">
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              {customAnalysis.preferred_skills.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5 text-neutral-700">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Preferred Qualifications</span>
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {customAnalysis.preferred_skills.map((s, i) => (
                      <span key={i} className="px-2 py-0.5 text-xs font-bold bg-neutral-100 border border-black rounded-[4px]">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {customAnalysis.interview_topics.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5 text-black">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Predicted Interview Topics</span>
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {customAnalysis.interview_topics.map((topic, i) => (
                      <span key={i} className="px-2.5 py-1 text-xs font-bold bg-neutral-100 border-2 border-black rounded-[5px] shadow-[2px_2px_0px_#000]">
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>
    </AppShell>
  );
}
