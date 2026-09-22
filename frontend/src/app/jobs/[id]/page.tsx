"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  jobService,
  JobOut,
  StructuredRequirementsOut,
} from "@/services/jobs";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  MapPin,
  Calendar,
  Bookmark,
  BookmarkCheck,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Clock,
  GraduationCap,
  Wrench,
  CheckSquare,
  Copy,
  Check,
  Cpu,
  Layers,
  FileText,
  TrendingUp,
} from "lucide-react";

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = typeof params?.id === "string" ? params.id : Array.isArray(params?.id) ? params.id[0] : "";

  const [job, setJob] = useState<JobOut | null>(null);
  const [analysis, setAnalysis] = useState<StructuredRequirementsOut | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [analysisError, setAnalysisError] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    if (!jobId) return;
    setLoading(true);
    setError("");
    try {
      const jobData = await jobService.getJobById(jobId);
      setJob(jobData);

      try {
        const analysisData = await jobService.getJobAnalysis(jobId);
        setAnalysis(analysisData);
      } catch {
        setAnalysis(null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load job details.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleSave = async () => {
    if (!job) return;
    const nextSaved = !job.is_saved;
    setJob({ ...job, is_saved: nextSaved });

    try {
      if (nextSaved) {
        await jobService.saveJob(job.id);
      } else {
        await jobService.unsaveJob(job.id);
      }
    } catch {
      setJob(job);
    }
  };

  const handleTriggerAnalysis = async (forceRefresh: boolean = false) => {
    if (!job) return;
    setAnalyzing(true);
    setAnalysisError("");
    try {
      const result = await jobService.analyzeJobDescription({
        job_id: job.id,
        raw_jd: job.description || undefined,
        force_refresh: forceRefresh,
      });
      setAnalysis(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to trigger AI JD analysis.";
      setAnalysisError(msg);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCopyJd = () => {
    if (!job?.description) return;
    navigator.clipboard.writeText(job.description.replace(/<[^>]*>?/gm, ""));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <AppShell>
        <div className="py-24 text-center space-y-3">
          <div className="w-8 h-8 border-4 border-black border-t-transparent animate-spin mx-auto rounded-full" />
          <p className="text-xs font-black uppercase tracking-wider text-neutral-600">
            Fetching Job Specifications & Intelligence...
          </p>
        </div>
      </AppShell>
    );
  }

  if (error || !job) {
    return (
      <AppShell>
        <div className="py-16 text-center space-y-4 max-w-md mx-auto border-2 border-black rounded-[5px] bg-white shadow-[4px_4px_0px_#000] p-8">
          <AlertCircle className="w-10 h-10 text-red-600 mx-auto" />
          <h2 className="text-lg font-black uppercase">Job Posting Not Found</h2>
          <p className="text-xs text-neutral-600 font-medium">
            {error || "The requested placement listing could not be found or has expired."}
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={() => router.push("/jobs")}
            className="shadow-[2px_2px_0px_#000]"
          >
            Return to Job Registry
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6 pb-16">
        <div className="flex items-center justify-between border-b-2 border-black pb-3">
          <Link
            href="/jobs"
            className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-neutral-700 hover:text-black transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Placements Feed</span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleSave}
              className={`px-3 py-1.5 rounded-[5px] border-2 border-black text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                job.is_saved
                  ? "bg-black text-white shadow-[2px_2px_0px_#000]"
                  : "bg-white text-black hover:bg-neutral-100 shadow-[2px_2px_0px_#000]"
              }`}
            >
              {job.is_saved ? (
                <>
                  <BookmarkCheck className="w-3.5 h-3.5" />
                  <span>Saved</span>
                </>
              ) : (
                <>
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>Save Job</span>
                </>
              )}
            </button>

            {job.url && (
              <a
                href={job.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-[5px] border-2 border-black bg-white text-black hover:bg-neutral-100 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-[2px_2px_0px_#000]"
              >
                <span>External Link</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>

        <Card className="border-2 border-black shadow-[4px_4px_0px_#000]">
          <CardContent className="space-y-3">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold text-neutral-600">
                  <Building2 className="w-4 h-4 text-black" />
                  <span className="text-sm font-black text-black uppercase">{job.company}</span>
                </div>
                <h1 className="text-2xl font-black tracking-tight text-black uppercase">
                  {job.title}
                </h1>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="dark" className="text-xs">
                  {job.source}
                </Badge>
                {job.experience_level && (
                  <Badge variant="outline" className="text-xs">
                    {job.experience_level}
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-neutral-600 pt-1 border-t-2 border-neutral-100">
              {job.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-black" />
                  <span>{job.location}</span>
                </span>
              )}
              {job.posted_at && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-black" />
                  <span>Posted: {job.posted_at}</span>
                </span>
              )}
              {(job.salary_min !== null || job.salary_max !== null) && (
                <span className="flex items-center gap-1 font-bold text-black">
                  <span>
                    Salary: {job.currency || "$"}
                    {job.salary_min?.toLocaleString()} - {job.currency || "$"}
                    {job.salary_max?.toLocaleString()}
                  </span>
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {analysisError && (
          <div className="bg-red-50 border-2 border-black p-3 rounded-[5px] text-xs font-bold text-red-700 flex items-center gap-2 shadow-[2px_2px_0px_#000]">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span>{analysisError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-black" />
                <h2 className="text-xs font-black uppercase tracking-wider">
                  Full Job Description
                </h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyJd}
                className="text-xs border-2 border-black py-1 px-2.5 flex items-center gap-1 bg-white hover:bg-neutral-100 shadow-[2px_2px_0px_#000]"
              >
                {copied ? <Check className="w-3 h-3 text-black" /> : <Copy className="w-3 h-3 text-black" />}
                <span>{copied ? "Copied" : "Copy JD"}</span>
              </Button>
            </div>

            <Card className="border-2 border-black shadow-[4px_4px_0px_#000] bg-white">
              <CardContent>
                <div className="prose prose-sm max-w-none text-xs leading-relaxed font-normal space-y-3 whitespace-pre-line text-neutral-800">
                  {job.description ? (
                    job.description.replace(/<[^>]*>?/gm, "")
                  ) : (
                    <p className="text-neutral-500 italic">No detailed description provided for this placement posting.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-black" />
                <h2 className="text-xs font-black uppercase tracking-wider">
                  Deterministic & AI Requirements
                </h2>
              </div>

              {analysis && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleTriggerAnalysis(true)}
                  disabled={analyzing}
                  className="text-xs border-2 border-black py-1 px-2 flex items-center gap-1 shadow-[2px_2px_0px_#000]"
                >
                  <Sparkles className={`w-3 h-3 ${analyzing ? "animate-spin" : ""}`} />
                  <span>{analyzing ? "Re-Extracting..." : "Re-Analyze"}</span>
                </Button>
              )}
            </div>

            {!analysis ? (
              <Card className="border-2 border-black shadow-[4px_4px_0px_#000] bg-neutral-50 p-6 text-center space-y-4">
                <div className="p-3 bg-black text-white w-fit mx-auto rounded-[5px] shadow-[2px_2px_0px_#000]">
                  <Cpu className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-black uppercase">Structured Extraction Unprocessed</h3>
                  <p className="text-xs text-neutral-600 max-w-sm mx-auto font-medium">
                    Run the JD intelligence engine to extract categorized technical skills, preferred qualifications, frameworks, and anticipated interview questions.
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => handleTriggerAnalysis(false)}
                  disabled={analyzing}
                  className="shadow-[3px_3px_0px_#000] flex items-center justify-center gap-2 mx-auto"
                >
                  <Sparkles className={`w-4 h-4 ${analyzing ? "animate-spin" : ""}`} />
                  <span>{analyzing ? "Extracting Requirements..." : "Analyze Job Description"}</span>
                </Button>
              </Card>
            ) : (
              <div className="space-y-4">
                <Card className="border-2 border-black shadow-[4px_4px_0px_#000] bg-white">
                  <div className="p-3 bg-neutral-100 border-b-2 border-black flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-neutral-500">Target Role:</span>
                      <span className="text-xs font-black text-black uppercase">{analysis.role}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={analysis.cached ? "outline" : "dark"} className="text-[10px]">
                        {analysis.cached ? "Cached" : "Fresh Extraction"}
                      </Badge>
                      <span className="text-[10px] font-mono text-neutral-500">{analysis.model_used}</span>
                    </div>
                  </div>

                  <CardContent className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5 text-black">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Required Technical Skills</span>
                      </h3>
                      <div className="flex flex-wrap gap-1.5">
                        {analysis.required_skills && analysis.required_skills.length > 0 ? (
                          analysis.required_skills.map((skill, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 text-xs font-black bg-black text-white rounded-[4px] shadow-[2px_2px_0px_#000]"
                            >
                              {skill}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-neutral-500 italic">None explicitly identified.</span>
                        )}
                      </div>
                    </div>

                    {analysis.preferred_skills && analysis.preferred_skills.length > 0 && (
                      <div className="space-y-2 border-t border-neutral-200 pt-3">
                        <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5 text-neutral-700">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Preferred & Bonus Skills</span>
                        </h3>
                        <div className="flex flex-wrap gap-1.5">
                          {analysis.preferred_skills.map((skill, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 text-xs font-bold bg-neutral-100 border-2 border-black rounded-[4px]"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {analysis.tools && analysis.tools.length > 0 && (
                      <div className="space-y-2 border-t border-neutral-200 pt-3">
                        <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5 text-black">
                          <Wrench className="w-3.5 h-3.5" />
                          <span>Tools & Infrastructure</span>
                        </h3>
                        <div className="flex flex-wrap gap-1.5">
                          {analysis.tools.map((tool, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 text-xs font-mono font-bold bg-white border-2 border-black rounded-[4px] shadow-[1px_1px_0px_#000]"
                            >
                              {tool}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {analysis.responsibilities && analysis.responsibilities.length > 0 && (
                      <div className="space-y-2 border-t border-neutral-200 pt-3">
                        <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5 text-black">
                          <CheckSquare className="w-3.5 h-3.5" />
                          <span>Core Responsibilities</span>
                        </h3>
                        <ul className="space-y-1.5 pl-1">
                          {analysis.responsibilities.map((resp, i) => (
                            <li key={i} className="text-xs text-neutral-800 flex items-start gap-2 leading-relaxed">
                              <span className="w-1.5 h-1.5 bg-black rounded-full mt-1.5 flex-shrink-0" />
                              <span>{resp}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {(analysis.education_requirements.length > 0 || analysis.experience_requirements.length > 0) && (
                      <div className="space-y-2 border-t border-neutral-200 pt-3">
                        <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5 text-black">
                          <GraduationCap className="w-3.5 h-3.5" />
                          <span>Prerequisites</span>
                        </h3>
                        <div className="space-y-1 text-xs text-neutral-700">
                          {analysis.education_requirements.map((ed, i) => (
                            <div key={i} className="font-medium">• {ed}</div>
                          ))}
                          {analysis.experience_requirements.map((exp, i) => (
                            <div key={i} className="font-medium">• {exp}</div>
                          ))}
                        </div>
                      </div>
                    )}

                    {analysis.interview_topics && analysis.interview_topics.length > 0 && (
                      <div className="space-y-2 border-t-2 border-black pt-3">
                        <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5 text-black">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Predicted Technical Interview Topics</span>
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {analysis.interview_topics.map((topic, i) => (
                            <div
                              key={i}
                              className="p-2 bg-neutral-50 border-2 border-black rounded-[5px] text-xs font-bold text-black shadow-[2px_2px_0px_#000]"
                            >
                              {topic}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-2 border-black shadow-[4px_4px_0px_#000] bg-black text-white p-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-lime-400" />
                      <h3 className="text-xs font-black uppercase tracking-wider text-lime-400">
                        Downstream Placement Workflows
                      </h3>
                    </div>
                    <p className="text-xs text-neutral-300 font-medium">
                      Leverage extracted requirements directly in the Skill Gap Engine or generate an ATS-optimized XYZ resume tailored for {job.company}.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <Link href={`/jobs/${job.id}/match`}>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="w-full text-xs font-black uppercase tracking-wider border-2 border-white shadow-[2px_2px_0px_#FFF] flex items-center justify-center gap-1.5 text-black"
                        >
                          <Layers className="w-3.5 h-3.5" />
                          <span>Run Skill Gap</span>
                        </Button>
                      </Link>

                      <Link href={`/resumes/new?job_id=${job.id}`}>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="w-full text-xs font-black uppercase tracking-wider border-2 border-white shadow-[2px_2px_0px_#FFF] flex items-center justify-center gap-1.5 text-black"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Tailor Resume</span>
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
