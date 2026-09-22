"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { jobService, JobOut } from "@/services/jobs";
import {
  jobMatchService,
  JobMatchOut,
  SmartSuggestion,
} from "@/services/jobMatch";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  MapPin,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  TrendingUp,
  Cpu,
  Layers,
  Code2,
  BookOpen,
  FileText,
  Clock,
  ArrowRight,
  ShieldCheck,
  Zap,
} from "lucide-react";

export default function JobMatchPage() {
  const params = useParams();
  const router = useRouter();
  const jobId =
    typeof params?.id === "string"
      ? params.id
      : Array.isArray(params?.id)
      ? params.id[0]
      : "";

  const [job, setJob] = useState<JobOut | null>(null);
  const [matchData, setMatchData] = useState<JobMatchOut | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [recomputing, setRecomputing] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const loadData = useCallback(async () => {
    if (!jobId) return;
    setLoading(true);
    setError("");
    try {
      const jobRes = await jobService.getJobById(jobId);
      setJob(jobRes);

      try {
        const matchRes = await jobMatchService.getJobMatch(jobId);
        setMatchData(matchRes);
      } catch {
        const computed = await jobMatchService.compareStudentToJob(jobId, {
          force_recompute: false,
        });
        setMatchData(computed);
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to load skill gap evaluation.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRecompute = async () => {
    if (!jobId) return;
    setRecomputing(true);
    setError("");
    try {
      const fresh = await jobMatchService.compareStudentToJob(jobId, {
        force_recompute: true,
      });
      setMatchData(fresh);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to re-evaluate skill alignment.";
      setError(msg);
    } finally {
      setRecomputing(false);
    }
  };

  const getTierDetails = (score: number) => {
    if (score >= 80) {
      return {
        label: "TIER 1: HIGH ALIGNMENT",
        subtext: "Strong competitive profile. Minor interview prep required.",
        badgeVariant: "dark" as const,
        textColor: "text-black",
      };
    }
    if (score >= 60) {
      return {
        label: "TIER 2: VIABLE WITH PREPARATION",
        subtext: "Solid foundation. Targeted project upgrades recommended.",
        badgeVariant: "outline" as const,
        textColor: "text-black",
      };
    }
    return {
      label: "TIER 3: DEVELOPING CANDIDATE",
      subtext: "Significant skill deficits identified against requirements.",
      badgeVariant: "default" as const,
      textColor: "text-neutral-700",
    };
  };

  const getSuggestionIcon = (type: SmartSuggestion["type"]) => {
    switch (type) {
      case "PROJECT_ENHANCEMENT":
        return <Code2 className="w-4 h-4 text-black" />;
      case "DSA_PRACTICE":
        return <Cpu className="w-4 h-4 text-black" />;
      case "STACK_EXPANSION":
        return <Layers className="w-4 h-4 text-black" />;
      case "RESUME_OPTIMIZATION":
        return <FileText className="w-4 h-4 text-black" />;
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="py-24 text-center space-y-3">
          <div className="w-8 h-8 border-4 border-black border-t-transparent animate-spin mx-auto rounded-full" />
          <p className="text-xs font-black uppercase tracking-wider text-neutral-600">
            Running Skill Gap Engine & Cross-Referencing Evidence...
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
          <h2 className="text-lg font-black uppercase">Evaluation Error</h2>
          <p className="text-xs text-neutral-600 font-medium">
            {error || "Unable to evaluate student alignment against target placement."}
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={() => router.push(`/jobs/${jobId}`)}
            className="shadow-[2px_2px_0px_#000]"
          >
            Return to Job Details
          </Button>
        </div>
      </AppShell>
    );
  }

  const tier = matchData ? getTierDetails(matchData.match_score) : null;
  const breakdown = matchData?.score_breakdown || {};

  return (
    <AppShell>
      <div className="space-y-6 pb-16">
        <div className="flex items-center justify-between border-b-2 border-black pb-3">
          <Link
            href={`/jobs/${job.id}`}
            className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-neutral-700 hover:text-black transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Job Specifications</span>
          </Link>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleRecompute}
            disabled={recomputing}
            className="flex items-center gap-1.5 text-xs border-2 border-black shadow-[3px_3px_0px_#000]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${recomputing ? "animate-spin" : ""}`} />
            <span>{recomputing ? "Re-Evaluating..." : "Re-Run Match Engine"}</span>
          </Button>
        </div>

        <div className="border-2 border-black bg-white rounded-[5px] p-5 shadow-[4px_4px_0px_#000] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-neutral-600">
              <Building2 className="w-3.5 h-3.5" />
              <span className="text-black font-black uppercase">{job.company}</span>
              {job.location && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {job.location}
                  </span>
                </>
              )}
            </div>
            <h1 className="text-2xl font-black tracking-tight text-black uppercase">
              {job.title}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="dark" className="text-xs">
              Deterministic Assessment
            </Badge>
          </div>
        </div>

        {matchData && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 space-y-4">
              <Card className="border-2 border-black shadow-[4px_4px_0px_#000] bg-white">
                <div className="p-4 border-b-2 border-black bg-neutral-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-black" />
                    <h2 className="text-xs font-black uppercase tracking-wider text-black">
                      Placement Readiness Score
                    </h2>
                  </div>
                  {tier && <Badge variant={tier.badgeVariant}>{tier.label}</Badge>}
                </div>

                <CardContent className="p-5 space-y-5">
                  <div className="flex items-baseline justify-between border-b-2 border-black pb-4">
                    <div>
                      <div className="text-4xl font-black tracking-tighter text-black">
                        {matchData.match_score.toFixed(1)}%
                      </div>
                      <p className="text-xs text-neutral-600 font-bold mt-1">
                        {tier?.subtext}
                      </p>
                    </div>

                    <div className="text-right text-[11px] font-mono text-neutral-500">
                      <div>5-Factor Model</div>
                      <div className="font-bold text-black">100 Pts Max</div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-xs font-black uppercase tracking-wider text-black flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Weighted Compatibility Factors</span>
                    </h3>

                    <div className="space-y-2.5 text-xs">
                      <div>
                        <div className="flex justify-between font-bold pb-1">
                          <span>Required Technical Skills (50% Weight)</span>
                          <span>{Number(breakdown.required_skills_pct || 0).toFixed(0)}%</span>
                        </div>
                        <Progress value={Number(breakdown.required_skills_pct || 0)} />
                      </div>

                      <div>
                        <div className="flex justify-between font-bold pb-1">
                          <span>Preferred & Bonus Skills (20% Weight)</span>
                          <span>{Number(breakdown.preferred_skills_pct || 0).toFixed(0)}%</span>
                        </div>
                        <Progress value={Number(breakdown.preferred_skills_pct || 0)} />
                      </div>

                      <div>
                        <div className="flex justify-between font-bold pb-1">
                          <span>Project Evidence & Stack Fit (15% Weight)</span>
                          <span>{Number(breakdown.project_evidence_score || 0).toFixed(0)}%</span>
                        </div>
                        <Progress value={Number(breakdown.project_evidence_score || 0)} />
                      </div>

                      <div>
                        <div className="flex justify-between font-bold pb-1">
                          <span>Experience Level (10% Weight)</span>
                          <span>{Number(breakdown.experience_score || 0).toFixed(0)}%</span>
                        </div>
                        <Progress value={Number(breakdown.experience_score || 0)} />
                      </div>

                      <div>
                        <div className="flex justify-between font-bold pb-1">
                          <span>Education & Prerequisites (5% Weight)</span>
                          <span>{Number(breakdown.education_score || 0).toFixed(0)}%</span>
                        </div>
                        <Progress value={Number(breakdown.education_score || 0)} />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {matchData.improvement_explanation && (
                <div className="border-2 border-black rounded-[5px] bg-black text-white p-4 shadow-[4px_4px_0px_#000] space-y-2">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-lime-400">
                    <Zap className="w-4 h-4" />
                    <span>Coach Strategic Diagnosis</span>
                  </div>
                  <p className="text-xs text-neutral-200 leading-relaxed font-medium">
                    {matchData.improvement_explanation}
                  </p>
                </div>
              )}

              <Card className="border-2 border-black shadow-[4px_4px_0px_#000] bg-neutral-50 p-4">
                <div className="space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-black flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Bridge to Execution</span>
                  </h3>
                  <p className="text-xs text-neutral-600 font-medium">
                    Convert these diagnosed deficits into a personalized study plan or tailor your resume directly for {job.company}.
                  </p>

                  <div className="space-y-2 pt-1">
                    <Link href={`/learning?job_id=${job.id}`}>
                      <Button
                        variant="primary"
                        size="sm"
                        className="w-full text-xs font-black uppercase tracking-wider flex items-center justify-between shadow-[2px_2px_0px_#000]"
                      >
                        <span className="flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>Generate Learning Plan</span>
                        </span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </Link>

                    <Link href={`/resumes/new?job_id=${job.id}`}>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full text-xs font-black uppercase tracking-wider border-2 border-black flex items-center justify-between shadow-[2px_2px_0px_#000]"
                      >
                        <span className="flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5" />
                          <span>Tailor Resume for Role</span>
                        </span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            </div>

            <div className="lg:col-span-7 space-y-4">
              <Card className="border-2 border-black shadow-[4px_4px_0px_#000] bg-white">
                <div className="p-4 border-b-2 border-black bg-neutral-50 flex items-center justify-between">
                  <h2 className="text-xs font-black uppercase tracking-wider text-black flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-black" />
                    <span>Skill Verification Matrix</span>
                  </h2>
                  <div className="flex items-center gap-2 text-[11px] font-bold">
                    <span className="text-black">
                      {matchData.matched_skills.length} Verified
                    </span>
                    <span>•</span>
                    <span className="text-neutral-500">
                      {matchData.missing_skills.length} Deficits
                    </span>
                  </div>
                </div>

                <CardContent className="p-5 space-y-5">
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-black">
                      <CheckCircle2 className="w-4 h-4 text-black" />
                      <span>Verified Skills & Candidate Evidence</span>
                    </div>

                    {matchData.matched_skills.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {matchData.matched_skills.map((item, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 border-2 border-black rounded-[5px] bg-white shadow-[2px_2px_0px_#000] space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black text-black uppercase">
                                {item.skill}
                              </span>
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-[3px] bg-black text-white uppercase">
                                {item.source_type}
                              </span>
                            </div>
                            <div className="text-[11px] text-neutral-600 font-medium truncate">
                              Source: {item.evidence_source}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-neutral-500 italic">
                        No overlapping skills verified against current profile.
                      </p>
                    )}
                  </div>

                  <div className="space-y-2.5 border-t-2 border-black pt-4">
                    <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-neutral-800">
                      <XCircle className="w-4 h-4 text-neutral-600" />
                      <span>Missing Skills & Technical Deficits</span>
                    </div>

                    {matchData.missing_skills.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {matchData.missing_skills.map((skill, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 text-xs font-bold bg-neutral-100 border-2 border-black rounded-[5px] shadow-[2px_2px_0px_#000]"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-neutral-500 italic">
                        All mandatory requirements satisfied!
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {matchData.smart_suggestions && matchData.smart_suggestions.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-black" />
                    <h2 className="text-xs font-black uppercase tracking-wider text-black">
                      AI Coach Smart Recommendations
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {matchData.smart_suggestions.map((sug, idx) => (
                      <Card
                        key={idx}
                        className="border-2 border-black shadow-[4px_4px_0px_#000] bg-white p-4 space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2 border-b-2 border-black pb-2">
                          <div className="flex items-center gap-2">
                            <span className="p-1 bg-neutral-100 border border-black rounded-[4px]">
                              {getSuggestionIcon(sug.type)}
                            </span>
                            <span className="text-xs font-black uppercase tracking-tight text-black">
                              {sug.title}
                            </span>
                          </div>
                          <Badge variant="outline" className="text-[10px]">
                            {sug.type.replace("_", " ")}
                          </Badge>
                        </div>

                        <div className="space-y-1.5 text-xs">
                          <div>
                            <span className="font-black uppercase tracking-wider text-[10px] text-neutral-500 block">
                              Action to Take:
                            </span>
                            <p className="text-neutral-800 leading-relaxed font-medium">
                              {sug.action}
                            </p>
                          </div>

                          <div className="bg-neutral-50 p-2 rounded-[4px] border border-neutral-200">
                            <span className="font-black uppercase tracking-wider text-[10px] text-black block">
                              Why This Matters (Placement Impact):
                            </span>
                            <p className="text-neutral-700 leading-relaxed font-medium text-[11px]">
                              {sug.impact}
                            </p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {matchData.interview_topics && matchData.interview_topics.length > 0 && (
                <Card className="border-2 border-black shadow-[4px_4px_0px_#000] bg-white">
                  <div className="p-4 border-b-2 border-black bg-neutral-50 flex items-center justify-between">
                    <h2 className="text-xs font-black uppercase tracking-wider text-black flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-black" />
                      <span>Anticipated Technical Interview Focus</span>
                    </h2>
                  </div>

                  <CardContent className="p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {matchData.interview_topics.map((topic, idx) => (
                        <div
                          key={idx}
                          className="p-2 bg-neutral-50 border-2 border-black rounded-[5px] text-xs font-bold text-black shadow-[2px_2px_0px_#000]"
                        >
                          {topic}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
