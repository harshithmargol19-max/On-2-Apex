"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/ui/modal";
import {
  resumeService,
  GeneratedResumeBrief,
  ResumeAnalysisOut,
} from "@/services/resumes";
import { jobService, JobOut } from "@/services/jobs";
import {
  FileText,
  Plus,
  Search,
  Building2,
  Calendar,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Layers,
  Copy,
  Check,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  SlidersHorizontal,
  Brain,
  Upload,
  TrendingUp,
  Target,
  Lightbulb,
  MessageSquare,
  Eye,
} from "lucide-react";



export default function ResumesPage() {
  const searchParams = useSearchParams();
  const urlJobId = searchParams.get("job_id");

  const [resumes, setResumes] = useState<GeneratedResumeBrief[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedTag, setSelectedTag] = useState<string>("All");

  const [isGeneratorOpen, setIsGeneratorOpen] = useState<boolean>(false);
  const [availableJobs, setAvailableJobs] = useState<JobOut[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>(urlJobId || "");
  const [customPosition, setCustomPosition] = useState<string>("");
  const [customInstructions, setCustomInstructions] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatorError, setGeneratorError] = useState<string>("");

  const [isApplyModalOpen, setIsApplyModalOpen] = useState<boolean>(false);
  const [selectedResumeForApply, setSelectedResumeForApply] = useState<GeneratedResumeBrief | null>(null);
  const [applyCompanyName, setApplyCompanyName] = useState<string>("");
  const [isApplying, setIsApplying] = useState<boolean>(false);

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [isAnalyserOpen, setIsAnalyserOpen] = useState<boolean>(false);
  const [analyserTab, setAnalyserTab] = useState<"upload" | "existing">("upload");
  const [analyserFile, setAnalyserFile] = useState<File | null>(null);
  const [analyserPosition, setAnalyserPosition] = useState<string>("");
  const [analyserExistingId, setAnalyserExistingId] = useState<string>("");
  const [isAnalysing, setIsAnalysing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<ResumeAnalysisOut | null>(null);
  const [analyserError, setAnalyserError] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);


  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await resumeService.listResumes();
      setResumes(res);

      const jobsRes = await jobService.listJobs({ limit: 50 }).catch(() => ({ total: 0, items: [] }));
      setAvailableJobs(jobsRes.items);

      if (urlJobId) {
        setSelectedJobId(urlJobId);
        const matchJob = jobsRes.items.find((j) => j.id === urlJobId);
        if (matchJob) {
          setCustomPosition(matchJob.title);
        }
        setIsGeneratorOpen(true);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load resumes.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [urlJobId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJobId) {
      setGeneratorError("Please select a target placement listing.");
      return;
    }

    setIsGenerating(true);
    setGeneratorError("");
    try {
      const newResume = await resumeService.generateResume({
        job_id: selectedJobId,
        custom_position: customPosition.trim() || undefined,
        custom_instructions: customInstructions.trim() || undefined,
      });

      setIsGeneratorOpen(false);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to generate tailored resume.";
      setGeneratorError(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyMarkdown = async (resumeId: string) => {
    try {
      const full = await resumeService.getResumeById(resumeId);
      navigator.clipboard.writeText(full.markdown);
      setCopiedId(resumeId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (resumeId: string) => {
    if (!confirm("Are you sure you want to delete this tailored resume version?")) return;
    try {
      await resumeService.deleteResume(resumeId);
      setResumes((prev) => prev.filter((r) => r.id !== resumeId));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete resume.";
      setError(msg);
    }
  };

  const handleRecordApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResumeForApply || !applyCompanyName.trim()) return;

    setIsApplying(true);
    try {
      const updated = await resumeService.recordApplication(selectedResumeForApply.id, {
        company_name: applyCompanyName.trim(),
      });
      setResumes((prev) =>
        prev.map((r) =>
          r.id === selectedResumeForApply.id
            ? { ...r, applied_companies: updated.applied_companies }
            : r
        )
      );
      setIsApplyModalOpen(false);
      setApplyCompanyName("");
    } catch (err) {
      console.error(err);
    } finally {
      setIsApplying(false);
    }
  };

  const handleRunAnalysis = async () => {
    setAnalyserError("");
    setAnalysisResult(null);

    if (analyserTab === "upload") {
      if (!analyserFile) {
        setAnalyserError("Please select a PDF or DOCX resume file to upload.");
        return;
      }
      setIsAnalysing(true);
      try {
        const result = await resumeService.analyzeResumeFile(analyserFile, analyserPosition.trim() || undefined);
        setAnalysisResult(result);
      } catch (err: unknown) {
        setAnalyserError(err instanceof Error ? err.message : "Analysis failed. Check your LLM provider in Settings.");
      } finally {
        setIsAnalysing(false);
      }
    } else {
      if (!analyserExistingId) {
        setAnalyserError("Please select an existing resume from the list.");
        return;
      }
      setIsAnalysing(true);
      try {
        const result = await resumeService.analyzeExistingResume(analyserExistingId);
        setAnalysisResult(result);
      } catch (err: unknown) {
        setAnalyserError(err instanceof Error ? err.message : "Analysis failed. Check your LLM provider in Settings.");
      } finally {
        setIsAnalysing(false);
      }
    }
  };



  const allTags = Array.from(
    new Set(resumes.flatMap((r) => r.tags || []))
  );

  const filteredResumes = resumes.filter((r) => {
    const matchesSearch =
      r.position.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.applied_companies.some((c) => c.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesTag =
      selectedTag === "All" || (r.tags && r.tags.includes(selectedTag));
    return matchesSearch && matchesTag;
  });

  return (
    <AppShell>
      <div className="space-y-6 pb-16">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-black pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-black text-white rounded-[5px]">
                <FileText className="w-5 h-5" />
              </span>
              <h1 className="text-2xl font-black uppercase tracking-tight">
                Job-Specific Resume Studio
              </h1>
            </div>
            <p className="text-xs text-neutral-600 font-medium">
              Generate role-tailored resumes using Google's XYZ formula. Inspect bullet-by-bullet diffs, export clean ATS Markdown & LaTeX, and audit applied companies.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setAnalyserError("");
                setAnalysisResult(null);
                setAnalyserFile(null);
                setAnalyserPosition("");
                setAnalyserExistingId("");
                setIsAnalyserOpen(true);
              }}
              className="flex items-center gap-1.5 border-2 border-black shadow-[3px_3px_0px_#000]"
            >
              <Brain className="w-4 h-4" />
              <span>Analyse Resume</span>
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setGeneratorError("");
                setIsGeneratorOpen(true);
              }}
              className="flex items-center gap-1.5 shadow-[3px_3px_0px_#000]"
            >
              <Plus className="w-4 h-4" />
              <span>Tailor New Resume</span>
            </Button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border-2 border-black p-3 rounded-[5px] text-xs font-bold text-red-700 flex items-center gap-2 shadow-[2px_2px_0px_#000]">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <Card className="border-2 border-black shadow-[4px_4px_0px_#000]">
          <CardContent className="space-y-3">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  type="text"
                  placeholder="Filter by target position or company applied..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 border-2 border-black text-sm"
                />
              </div>

              {allTags.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
                  <span className="text-[10px] font-black uppercase text-neutral-500 mr-1">
                    Tag:
                  </span>
                  <button
                    onClick={() => setSelectedTag("All")}
                    className={`px-2.5 py-1 text-xs font-bold rounded-[4px] border-2 border-black transition-all ${
                      selectedTag === "All"
                        ? "bg-black text-white shadow-[2px_2px_0px_#000]"
                        : "bg-white text-black hover:bg-neutral-100"
                    }`}
                  >
                    All
                  </button>
                  {allTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => setSelectedTag(tag)}
                      className={`px-2.5 py-1 text-xs font-bold rounded-[4px] border-2 border-black transition-all ${
                        selectedTag === tag
                          ? "bg-black text-white shadow-[2px_2px_0px_#000]"
                          : "bg-white text-black hover:bg-neutral-100"
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="py-24 text-center space-y-3">
            <div className="w-8 h-8 border-4 border-black border-t-transparent animate-spin mx-auto rounded-full" />
            <p className="text-xs font-black uppercase tracking-wider text-neutral-600">
              Querying Tailored Resume Collection...
            </p>
          </div>
        ) : filteredResumes.length === 0 ? (
          <div className="py-20 text-center space-y-4 max-w-lg mx-auto border-2 border-black rounded-[5px] bg-white shadow-[6px_6px_0px_#000] p-8">
            <div className="p-3 bg-black text-white w-fit mx-auto rounded-[5px] shadow-[2px_2px_0px_#000]">
              <FileText className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-black uppercase tracking-tight">
                No Tailored Resumes Found
              </h2>
              <p className="text-xs text-neutral-600 font-medium">
                Generate an ATS-optimized, XYZ-tailored resume specifically targeted to a placement listing.
              </p>
            </div>
            <Button
              variant="primary"
              size="md"
              onClick={() => setIsGeneratorOpen(true)}
              className="shadow-[3px_3px_0px_#000] flex items-center justify-center gap-2 mx-auto"
            >
              <Sparkles className="w-4 h-4" />
              <span>Tailor First Resume</span>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredResumes.map((resume) => (
              <Card
                key={resume.id}
                className="border-2 border-black shadow-[4px_4px_0px_#000] bg-white hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all flex flex-col justify-between"
              >
                <div className="space-y-3 p-5">
                  <div className="flex items-start justify-between gap-2 border-b-2 border-black pb-2.5">
                    <div className="space-y-0.5">
                      <div className="text-[10px] font-black uppercase text-neutral-500 flex items-center gap-1">
                        <Briefcase className="w-3 h-3" />
                        <span>Target Position</span>
                      </div>
                      <h2 className="text-base font-black text-black uppercase tracking-tight line-clamp-1">
                        {resume.position}
                      </h2>
                    </div>

                    <Badge variant={resume.status === "ACTIVE" ? "dark" : "outline"} className="text-[10px]">
                      {resume.status}
                    </Badge>
                  </div>

                  {resume.tags && resume.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {resume.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 text-[10px] font-bold bg-neutral-100 border border-black rounded-[4px]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="space-y-1.5 pt-1">
                    <div className="text-[10px] font-black uppercase tracking-wider text-neutral-500">
                      Applied Companies ({resume.applied_companies.length})
                    </div>
                    {resume.applied_companies.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {resume.applied_companies.map((co, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 text-[11px] font-black bg-white border border-black rounded-[4px] shadow-[1px_1px_0px_#000]"
                          >
                            {co}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-neutral-400 italic">No applications recorded yet.</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-neutral-500 pt-2 border-t border-neutral-200">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-black" />
                      <span className="font-bold text-black">{resume.diffs_count} Tailored Bullets</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(resume.created_at).toLocaleDateString()}</span>
                    </span>
                  </div>
                </div>

                <div className="p-3 border-t-2 border-black bg-neutral-50 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleCopyMarkdown(resume.id)}
                      className="p-1.5 rounded-[4px] border-2 border-black bg-white hover:bg-neutral-100 text-black shadow-[1px_1px_0px_#000]"
                      title="Copy Markdown"
                    >
                      {copiedId === resume.id ? (
                        <Check className="w-3.5 h-3.5 text-black" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-black" />
                      )}
                    </button>

                    <button
                      onClick={() => {
                        setSelectedResumeForApply(resume);
                        setApplyCompanyName("");
                        setIsApplyModalOpen(true);
                      }}
                      className="px-2 py-1 rounded-[4px] border-2 border-black bg-white hover:bg-neutral-100 text-[10px] font-black uppercase text-black shadow-[1px_1px_0px_#000]"
                      title="Record Company Applied"
                    >
                      + Apply
                    </button>

                    <Link
                      href={`/resumes/${resume.id}`}
                      className="px-2 py-1 rounded-[4px] border-2 border-black bg-white hover:bg-neutral-100 text-[10px] font-black uppercase text-black shadow-[1px_1px_0px_#000] flex items-center gap-1"
                      title="View PDF"
                    >
                      <Eye className="w-3 h-3" />
                      <span>PDF</span>
                    </Link>

                    <button
                      onClick={() => handleDelete(resume.id)}
                      className="p-1.5 rounded-[4px] border-2 border-black bg-white hover:bg-red-50 text-neutral-700 hover:text-red-600 shadow-[1px_1px_0px_#000]"
                      title="Delete Resume"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>


                  <Link href={`/resumes/${resume.id}`}>
                    <Button
                      variant="primary"
                      size="sm"
                      className="text-xs flex items-center gap-1 shadow-[2px_2px_0px_#000]"
                    >
                      <span>Studio</span>
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
        isOpen={isGeneratorOpen}
        onClose={() => setIsGeneratorOpen(false)}
        title="Tailor New Placement Resume"
        maxWidth="lg"
      >
        <form onSubmit={handleGenerate} className="space-y-4">
          <p className="text-xs text-neutral-600 font-medium">
            Select a target placement listing. The studio will analyze the JD's core skills and transform your experience bullets into quantifiable XYZ-formula bullet points.
          </p>

          {generatorError && (
            <div className="bg-red-50 border-2 border-black p-2.5 rounded-[5px] text-xs font-bold text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span>{generatorError}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              <span>Target Placement Listing</span>
            </label>
            <select
              value={selectedJobId}
              onChange={(e) => {
                setSelectedJobId(e.target.value);
                const selected = availableJobs.find((j) => j.id === e.target.value);
                if (selected && !customPosition) {
                  setCustomPosition(selected.title);
                }
              }}
              required
              className="w-full text-xs font-bold border-2 border-black rounded-[5px] p-2.5 bg-white shadow-[2px_2px_0px_#000]"
            >
              <option value="">-- Select a Job from Placements Feed --</option>
              {availableJobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.company}: {j.title} ({j.location || "Remote"})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5" />
              <span>Target Position Title (Optional Override)</span>
            </label>
            <Input
              type="text"
              placeholder="e.g. Senior Backend Engineer"
              value={customPosition}
              onChange={(e) => setCustomPosition(e.target.value)}
              className="border-2 border-black text-xs font-bold"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Custom Tailoring Directives</span>
            </label>
            <Textarea
              placeholder="e.g. Focus strongly on concurrency, PostgreSQL indexing, and distributed messaging pipelines..."
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              rows={3}
              className="border-2 border-black text-xs font-medium"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t-2 border-black">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsGeneratorOpen(false)}
              className="border-2 border-black"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isGenerating}
              className="shadow-[3px_3px_0px_#000] flex items-center gap-1.5"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isGenerating ? "animate-spin" : ""}`} />
              <span>{isGenerating ? "Tailoring Bullets..." : "Generate Tailored Resume"}</span>
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
        title="Record Company Application"
        maxWidth="sm"
      >
        <form onSubmit={handleRecordApply} className="space-y-4">
          <p className="text-xs text-neutral-600 font-medium">
            Track which company received this resume version. This enables you to reuse proven resumes for multiple applications.
          </p>

          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              <span>Company Applied To</span>
            </label>
            <Input
              type="text"
              placeholder="e.g. Stripe, Palantir, Razorpay"
              value={applyCompanyName}
              onChange={(e) => setApplyCompanyName(e.target.value)}
              required
              className="border-2 border-black text-xs font-bold"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t-2 border-black">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsApplyModalOpen(false)}
              className="border-2 border-black"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isApplying || !applyCompanyName.trim()}
              className="shadow-[3px_3px_0px_#000] flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Record Application</span>
            </Button>
          </div>
        </form>
      </Modal>
      <Modal
        isOpen={isAnalyserOpen}
        onClose={() => {
          setIsAnalyserOpen(false);
          setAnalysisResult(null);
          setAnalyserError("");
        }}
        title="Resume Analyser — Interview Readiness"
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-1 border-2 border-black rounded-[5px] p-1 bg-neutral-100">
            <button
              onClick={() => { setAnalyserTab("upload"); setAnalysisResult(null); setAnalyserError(""); }}
              className={`flex-1 px-3 py-1.5 text-xs font-black uppercase rounded-[4px] transition-all flex items-center justify-center gap-1.5 ${analyserTab === "upload" ? "bg-black text-white shadow-[2px_2px_0px_#555]" : "text-neutral-600 hover:bg-neutral-200"}`}
            >
              <Upload className="w-3.5 h-3.5" />
              Upload PDF / DOCX
            </button>
            <button
              onClick={() => { setAnalyserTab("existing"); setAnalysisResult(null); setAnalyserError(""); }}
              className={`flex-1 px-3 py-1.5 text-xs font-black uppercase rounded-[4px] transition-all flex items-center justify-center gap-1.5 ${analyserTab === "existing" ? "bg-black text-white shadow-[2px_2px_0px_#555]" : "text-neutral-600 hover:bg-neutral-200"}`}
            >
              <FileText className="w-3.5 h-3.5" />
              Existing Resume
            </button>
          </div>

          {analyserTab === "upload" && !analysisResult && (
            <div className="space-y-3">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-black rounded-[5px] p-8 text-center cursor-pointer hover:bg-neutral-50 transition-colors"
              >
                <Upload className="w-8 h-8 mx-auto mb-2 text-neutral-500" />
                <p className="text-xs font-black uppercase text-neutral-700">
                  {analyserFile ? analyserFile.name : "Click to upload PDF or DOCX"}
                </p>
                <p className="text-[10px] text-neutral-400 font-medium mt-1">
                  Powered by Docling document intelligence engine
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.doc"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setAnalyserFile(f);
                  }}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-neutral-600">
                  Target Position (Optional)
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Senior Backend Engineer, ML Researcher..."
                  value={analyserPosition}
                  onChange={(e) => setAnalyserPosition(e.target.value)}
                  className="border-2 border-black text-xs font-bold"
                />
              </div>
            </div>
          )}

          {analyserTab === "existing" && !analysisResult && (
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-neutral-600">
                Select Tailored Resume
              </label>
              <select
                value={analyserExistingId}
                onChange={(e) => setAnalyserExistingId(e.target.value)}
                className="w-full text-xs font-bold border-2 border-black rounded-[5px] p-2.5 bg-white shadow-[2px_2px_0px_#000]"
              >
                <option value="">-- Select a resume from your portfolio --</option>
                {resumes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.position} — {new Date(r.created_at).toLocaleDateString()}
                  </option>
                ))}
              </select>
              {resumes.length === 0 && (
                <p className="text-xs text-neutral-500 font-medium pt-1">
                  No tailored resumes yet. Generate one first, or use the Upload tab.
                </p>
              )}
            </div>
          )}

          {analyserError && (
            <div className="bg-red-50 border-2 border-black p-2.5 rounded-[5px] text-xs font-bold text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{analyserError}</span>
            </div>
          )}

          {!analysisResult && (
            <div className="pt-1 flex justify-end gap-2 border-t-2 border-black">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => { setIsAnalyserOpen(false); setAnalysisResult(null); }}
                className="border-2 border-black"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={isAnalysing}
                onClick={handleRunAnalysis}
                className="shadow-[3px_3px_0px_#000] flex items-center gap-1.5"
              >
                <Brain className={`w-3.5 h-3.5 ${isAnalysing ? "animate-pulse" : ""}`} />
                <span>{isAnalysing ? "Analysing with Docling..." : "Run Interview Analysis"}</span>
              </Button>
            </div>
          )}

          {analysisResult && (
            <div className="space-y-4">
              <div className="border-2 border-black rounded-[5px] p-5 bg-white shadow-[4px_4px_0px_#000] flex flex-col sm:flex-row items-center gap-4">
                <div className="relative w-28 h-28 shrink-0">
                  <svg viewBox="0 0 36 36" className="w-28 h-28 -rotate-90">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e5e5" strokeWidth="3" />
                    <circle
                      cx="18" cy="18" r="15.9" fill="none"
                      stroke={analysisResult.interview_readiness_score >= 75 ? "#000" : analysisResult.interview_readiness_score >= 50 ? "#525252" : "#a3a3a3"}
                      strokeWidth="3"
                      strokeDasharray={`${analysisResult.interview_readiness_score} 100`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-black text-black">{analysisResult.interview_readiness_score}</span>
                    <span className="text-[9px] font-black uppercase text-neutral-500">/100</span>
                  </div>
                </div>

                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-neutral-500">Interview Readiness</span>
                    <span className={`px-2 py-0.5 text-[10px] font-black uppercase border-2 border-black rounded-[4px] shadow-[1px_1px_0px_#000] ${
                      analysisResult.interview_readiness_score >= 75 ? "bg-black text-white" :
                      analysisResult.interview_readiness_score >= 50 ? "bg-neutral-200 text-black" :
                      "bg-white text-neutral-600"
                    }`}>
                      {analysisResult.interview_readiness_score >= 75 ? "Interview Ready" :
                       analysisResult.interview_readiness_score >= 50 ? "Developing" : "Needs Work"}
                    </span>
                  </div>
                  {analysisResult.candidate_name && (
                    <p className="text-xs font-black text-black uppercase">{analysisResult.candidate_name}</p>
                  )}
                  <p className="text-xs text-neutral-700 font-medium leading-relaxed">{analysisResult.short_description}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Technical Depth", value: analysisResult.technical_depth_score, icon: <TrendingUp className="w-3.5 h-3.5" /> },
                  { label: "Impact Score", value: analysisResult.impact_score, icon: <Target className="w-3.5 h-3.5" /> },
                  { label: "ATS Hygiene", value: analysisResult.ats_score, icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
                ].map(({ label, value, icon }) => (
                  <div key={label} className="border-2 border-black rounded-[5px] p-3 bg-white shadow-[2px_2px_0px_#000] text-center space-y-1">
                    <div className="flex items-center justify-center gap-1 text-neutral-500">{icon}<span className="text-[9px] font-black uppercase">{label}</span></div>
                    <div className="text-xl font-black text-black">{value}<span className="text-[10px] text-neutral-400 font-bold">/100</span></div>
                    <div className="w-full bg-neutral-200 rounded-full h-1.5 border border-black">
                      <div className="bg-black h-1.5 rounded-full" style={{ width: `${value}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              {analysisResult.interview_topics.length > 0 && (
                <div className="border-2 border-black rounded-[5px] p-3.5 space-y-2 shadow-[2px_2px_0px_#000]">
                  <div className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5" />
                    Anticipated Interview Topics
                  </div>
                  <div className="space-y-1">
                    {analysisResult.interview_topics.map((topic, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs font-medium">
                        <span className="w-4 h-4 flex items-center justify-center bg-black text-white text-[9px] font-black rounded-[3px] shrink-0">{i + 1}</span>
                        <span>{topic}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {analysisResult.strengths.length > 0 && (
                  <div className="border-2 border-black rounded-[5px] p-3.5 space-y-2 shadow-[2px_2px_0px_#000] bg-neutral-50">
                    <div className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Strengths
                    </div>
                    <ul className="space-y-1">
                      {analysisResult.strengths.map((s, i) => (
                        <li key={i} className="text-xs font-medium flex items-start gap-1.5">
                          <span className="text-black font-black shrink-0">+</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {analysisResult.improvements.length > 0 && (
                  <div className="border-2 border-black rounded-[5px] p-3.5 space-y-2 shadow-[2px_2px_0px_#000] bg-neutral-50">
                    <div className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                      <Lightbulb className="w-3.5 h-3.5" />
                      Improvements
                    </div>
                    <ul className="space-y-1">
                      {analysisResult.improvements.map((imp, i) => (
                        <li key={i} className="text-xs font-medium flex items-start gap-1.5">
                          <span className="text-neutral-500 font-black shrink-0">→</span>
                          <span>{imp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="pt-1 flex justify-end border-t-2 border-black">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => { setAnalysisResult(null); setAnalyserFile(null); setAnalyserError(""); }}
                  className="border-2 border-black flex items-center gap-1.5"
                >
                  <Brain className="w-3.5 h-3.5" />
                  Analyse Another
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

    </AppShell>
  );
}
