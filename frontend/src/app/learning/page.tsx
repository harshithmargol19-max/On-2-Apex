"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Modal } from "@/components/ui/modal";
import {
  learningService,
  LearningPlanOut,
  LearningTaskOut,
  TaskStatusType,
} from "@/services/learning";
import { jobService, JobOut } from "@/services/jobs";
import {
  GraduationCap,
  Sparkles,
  Calendar,
  CheckCircle2,
  Clock,
  Layers,
  Code2,
  AlertCircle,
  Plus,
  ArrowRight,
  ExternalLink,
  ChevronDown,
  Building2,
  BookOpen,
  Award,
  Link2,
  RefreshCw,
} from "lucide-react";

export default function LearningPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlJobId = searchParams.get("job_id");

  const [activePlan, setActivePlan] = useState<LearningPlanOut | null>(null);
  const [allPlans, setAllPlans] = useState<LearningPlanOut[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  const [selectedWeek, setSelectedWeek] = useState<number | "all">("all");

  const [isGeneratorOpen, setIsGeneratorOpen] = useState<boolean>(false);
  const [availableJobs, setAvailableJobs] = useState<JobOut[]>([]);
  const [targetJobId, setTargetJobId] = useState<string>(urlJobId || "");
  const [hoursPerWeek, setHoursPerWeek] = useState<number>(10);
  const [targetWeeks, setTargetWeeks] = useState<number>(4);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatorError, setGeneratorError] = useState<string>("");

  const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState<boolean>(false);
  const [selectedTaskForEvidence, setSelectedTaskForEvidence] = useState<LearningTaskOut | null>(null);
  const [evidenceText, setEvidenceText] = useState<string>("");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);

  const loadLearningData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const plans = await learningService.getUserPlans().catch(() => []);
      setAllPlans(plans);

      let current: LearningPlanOut | null = null;
      try {
        current = await learningService.getActivePlan();
      } catch {
        if (plans.length > 0) current = plans[0];
      }
      setActivePlan(current);

      const jobsRes = await jobService.listJobs({ limit: 50 }).catch(() => ({ total: 0, items: [] }));
      setAvailableJobs(jobsRes.items);

      if (urlJobId) {
        setTargetJobId(urlJobId);
        if (!current) {
          setIsGeneratorOpen(true);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load learning roadmap.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [urlJobId]);

  useEffect(() => {
    loadLearningData();
  }, [loadLearningData]);

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetJobId) {
      setGeneratorError("Please select a target placement job.");
      return;
    }

    setIsGenerating(true);
    setGeneratorError("");
    try {
      const newPlan = await learningService.createPlan({
        job_id: targetJobId,
        hours_per_week: Number(hoursPerWeek),
        target_weeks: Number(targetWeeks),
      });
      setActivePlan(newPlan);
      setAllPlans((prev) => [newPlan, ...prev]);
      setIsGeneratorOpen(false);
      router.replace("/learning");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to generate roadmap.";
      setGeneratorError(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStatusChange = async (task: LearningTaskOut, newStatus: TaskStatusType) => {
    if (newStatus === "VERIFIED" && !task.evidence) {
      setSelectedTaskForEvidence(task);
      setEvidenceText("");
      setIsEvidenceModalOpen(true);
      return;
    }

    setIsUpdatingStatus(true);
    try {
      const updated = await learningService.updateTaskStatus(task.id, {
        status: newStatus,
        evidence: task.evidence || undefined,
      });

      if (activePlan) {
        const updatedTasks = activePlan.tasks.map((t) => (t.id === task.id ? updated : t));
        const completedHrs = updatedTasks
          .filter((t) => t.status === "COMPLETED" || t.status === "VERIFIED")
          .reduce((acc, curr) => acc + curr.estimated_hours, 0);
        const progress = activePlan.total_estimated_hours > 0
          ? Math.round((completedHrs / activePlan.total_estimated_hours) * 100)
          : 0;

        setActivePlan({
          ...activePlan,
          tasks: updatedTasks,
          completed_hours: completedHrs,
          progress_pct: progress,
        });
      }
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleSubmitEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskForEvidence) return;

    setIsUpdatingStatus(true);
    try {
      const updated = await learningService.updateTaskStatus(selectedTaskForEvidence.id, {
        status: "VERIFIED",
        evidence: evidenceText.trim() || undefined,
      });

      if (activePlan) {
        const updatedTasks = activePlan.tasks.map((t) =>
          t.id === selectedTaskForEvidence.id ? updated : t
        );
        const completedHrs = updatedTasks
          .filter((t) => t.status === "COMPLETED" || t.status === "VERIFIED")
          .reduce((acc, curr) => acc + curr.estimated_hours, 0);
        const progress = activePlan.total_estimated_hours > 0
          ? Math.round((completedHrs / activePlan.total_estimated_hours) * 100)
          : 0;

        setActivePlan({
          ...activePlan,
          tasks: updatedTasks,
          completed_hours: completedHrs,
          progress_pct: progress,
        });
      }
      setIsEvidenceModalOpen(false);
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const distinctWeeks = activePlan
    ? Array.from(new Set(activePlan.tasks.map((t) => t.week_number))).sort((a, b) => a - b)
    : [];

  const displayedTasks = activePlan
    ? selectedWeek === "all"
      ? activePlan.tasks
      : activePlan.tasks.filter((t) => t.week_number === selectedWeek)
    : [];

  const verifiedCount = activePlan
    ? activePlan.tasks.filter((t) => t.status === "VERIFIED").length
    : 0;
  const completedCount = activePlan
    ? activePlan.tasks.filter((t) => t.status === "COMPLETED").length
    : 0;

  return (
    <AppShell>
      <div className="space-y-6 pb-16">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-black pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-black text-white rounded-[5px]">
                <GraduationCap className="w-5 h-5" />
              </span>
              <h1 className="text-2xl font-black uppercase tracking-tight">
                Personalized Learning Engine
              </h1>
            </div>
            <p className="text-xs text-neutral-600 font-medium">
              Turn identified skill deficits into an execution-focused curriculum with mini-projects, interview preparation, and verified proof-of-work.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {allPlans.length > 1 && (
              <select
                value={activePlan?.id || ""}
                onChange={(e) => {
                  const target = allPlans.find((p) => p.id === e.target.value);
                  if (target) setActivePlan(target);
                }}
                className="text-xs font-black uppercase border-2 border-black rounded-[5px] px-3 py-1.5 bg-white shadow-[2px_2px_0px_#000]"
              >
                {allPlans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.target_role} ({p.target_company || "General"})
                  </option>
                ))}
              </select>
            )}

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
              <span>New AI Roadmap</span>
            </Button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border-2 border-black p-3 rounded-[5px] text-xs font-bold text-red-700 flex items-center gap-2 shadow-[2px_2px_0px_#000]">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="py-24 text-center space-y-3">
            <div className="w-8 h-8 border-4 border-black border-t-transparent animate-spin mx-auto rounded-full" />
            <p className="text-xs font-black uppercase tracking-wider text-neutral-600">
              Loading Personalized Learning Modules...
            </p>
          </div>
        ) : !activePlan ? (
          <div className="py-20 text-center space-y-4 max-w-lg mx-auto border-2 border-black rounded-[5px] bg-white shadow-[6px_6px_0px_#000] p-8">
            <div className="p-3 bg-black text-white w-fit mx-auto rounded-[5px] shadow-[2px_2px_0px_#000]">
              <BookOpen className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-black uppercase tracking-tight">
                No Active Learning Roadmap
              </h2>
              <p className="text-xs text-neutral-600 font-medium">
                Generate an execution curriculum based on skill gaps from any placement job or target role.
              </p>
            </div>
            <Button
              variant="primary"
              size="md"
              onClick={() => setIsGeneratorOpen(true)}
              className="shadow-[3px_3px_0px_#000] flex items-center justify-center gap-2 mx-auto"
            >
              <Sparkles className="w-4 h-4" />
              <span>Create First Learning Roadmap</span>
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <Card className="border-2 border-black shadow-[4px_4px_0px_#000] bg-white">
              <div className="p-5 border-b-2 border-black bg-neutral-50 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-neutral-600">
                    <Building2 className="w-3.5 h-3.5 text-black" />
                    <span className="font-black text-black uppercase">
                      {activePlan.target_company || "Enterprise Placement Track"}
                    </span>
                    <span>•</span>
                    <Badge variant="dark" className="text-[10px]">
                      {activePlan.status}
                    </Badge>
                  </div>
                  <h2 className="text-2xl font-black uppercase tracking-tight text-black">
                    {activePlan.target_role}
                  </h2>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-mono font-bold px-3 py-1 bg-white border-2 border-black rounded-[5px] shadow-[2px_2px_0px_#000]">
                    {activePlan.hours_per_week} Hrs / Week
                  </span>
                  <span className="text-xs font-mono font-bold px-3 py-1 bg-white border-2 border-black rounded-[5px] shadow-[2px_2px_0px_#000]">
                    {activePlan.total_weeks} Weeks Horizon
                  </span>
                </div>
              </div>

              <CardContent className="p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="p-3 border-2 border-black rounded-[5px] bg-white shadow-[2px_2px_0px_#000]">
                    <div className="text-[10px] font-black uppercase text-neutral-500">Curriculum Progress</div>
                    <div className="text-2xl font-black tracking-tight text-black">
                      {activePlan.progress_pct}%
                    </div>
                    <Progress value={activePlan.progress_pct} className="mt-2" />
                  </div>

                  <div className="p-3 border-2 border-black rounded-[5px] bg-white shadow-[2px_2px_0px_#000]">
                    <div className="text-[10px] font-black uppercase text-neutral-500">Hours Invested</div>
                    <div className="text-2xl font-black tracking-tight text-black">
                      {activePlan.completed_hours} / {activePlan.total_estimated_hours} <span className="text-xs font-normal text-neutral-500">hrs</span>
                    </div>
                    <div className="text-[10px] text-neutral-600 font-bold mt-2">
                      Target: {activePlan.hours_per_week} hrs/week
                    </div>
                  </div>

                  <div className="p-3 border-2 border-black rounded-[5px] bg-white shadow-[2px_2px_0px_#000]">
                    <div className="text-[10px] font-black uppercase text-neutral-500">Verified Proof of Work</div>
                    <div className="text-2xl font-black tracking-tight text-black">
                      {verifiedCount} <span className="text-xs font-normal text-neutral-500">tasks</span>
                    </div>
                    <div className="text-[10px] text-neutral-600 font-bold mt-2">
                      {completedCount} awaiting verification
                    </div>
                  </div>

                  <div className="p-3 border-2 border-black rounded-[5px] bg-black text-white shadow-[2px_2px_0px_#000] flex flex-col justify-between">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-wider text-lime-400">Google Calendar</div>
                      <div className="text-xs font-bold mt-1">Study Blocks Ready</div>
                    </div>
                    <Link
                      href="/workspace"
                      className="text-[11px] font-black uppercase tracking-wider underline text-white hover:text-neutral-300 flex items-center gap-1 pt-2"
                    >
                      <span>Sync Calendar</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center gap-2 border-b-2 border-black pb-2 overflow-x-auto">
              <button
                onClick={() => setSelectedWeek("all")}
                className={`px-3.5 py-1.5 text-xs font-black uppercase tracking-wider rounded-[5px] border-2 border-black transition-all ${
                  selectedWeek === "all"
                    ? "bg-black text-white shadow-[3px_3px_0px_#000]"
                    : "bg-white text-black hover:bg-neutral-100"
                }`}
              >
                All Modules ({activePlan.tasks.length})
              </button>

              {distinctWeeks.map((wk) => {
                const count = activePlan.tasks.filter((t) => t.week_number === wk).length;
                return (
                  <button
                    key={wk}
                    onClick={() => setSelectedWeek(wk)}
                    className={`px-3.5 py-1.5 text-xs font-black uppercase tracking-wider rounded-[5px] border-2 border-black transition-all ${
                      selectedWeek === wk
                        ? "bg-black text-white shadow-[3px_3px_0px_#000]"
                        : "bg-white text-black hover:bg-neutral-100"
                    }`}
                  >
                    Week {wk} ({count})
                  </button>
                );
              })}
            </div>

            <div className="space-y-4">
              {displayedTasks.map((task) => (
                <Card
                  key={task.id}
                  className="border-2 border-black shadow-[4px_4px_0px_#000] bg-white hover:translate-x-[-1px] transition-all"
                >
                  <div className="p-4 border-b-2 border-black flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-neutral-50">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 text-[10px] font-black uppercase bg-black text-white rounded-[4px]">
                        Week {task.week_number}
                      </span>
                      <span className="px-2 py-0.5 text-[10px] font-black uppercase bg-neutral-200 border border-black rounded-[4px]">
                        {task.skill}
                      </span>
                      <span className="text-xs font-mono font-bold text-neutral-600 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{task.estimated_hours} hrs</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          task.priority === "HIGH"
                            ? "dark"
                            : task.priority === "MEDIUM"
                            ? "outline"
                            : "default"
                        }
                        className="text-[10px]"
                      >
                        {task.priority} Priority
                      </Badge>
                      <Badge
                        variant={
                          task.status === "VERIFIED"
                            ? "dark"
                            : task.status === "COMPLETED"
                            ? "outline"
                            : "default"
                        }
                        className="text-[10px]"
                      >
                        {task.status}
                      </Badge>
                    </div>
                  </div>

                  <CardContent className="p-5 space-y-4">
                    <div className="space-y-1">
                      <h3 className="text-base font-black text-black tracking-tight uppercase">
                        {task.title}
                      </h3>
                      <p className="text-xs text-neutral-700 leading-relaxed font-medium">
                        {task.description}
                      </p>
                    </div>

                    <div className="bg-neutral-50 border border-black p-3 rounded-[5px] space-y-2">
                      <div className="text-[10px] font-black uppercase tracking-wider text-neutral-500">
                        Learning Objective
                      </div>
                      <p className="text-xs font-bold text-black">{task.learning_goal}</p>
                    </div>

                    {task.topics && task.topics.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="text-[10px] font-black uppercase tracking-wider text-neutral-500">
                          Core Concepts to Master
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {task.topics.map((topic, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 text-xs font-bold bg-white border-2 border-black rounded-[4px] shadow-[1px_1px_0px_#000]"
                            >
                              {topic}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                      {task.practice_project && (
                        <div className="p-3 border-2 border-black rounded-[5px] bg-neutral-50 space-y-1">
                          <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-black">
                            <Code2 className="w-3.5 h-3.5" />
                            <span>Mini-Project Application</span>
                          </div>
                          <p className="text-xs text-neutral-800 leading-relaxed font-medium">
                            {task.practice_project}
                          </p>
                        </div>
                      )}

                      {task.interview_question_prep && (
                        <div className="p-3 border-2 border-black rounded-[5px] bg-neutral-50 space-y-1">
                          <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-black">
                            <BookOpen className="w-3.5 h-3.5" />
                            <span>Interview Question Prep</span>
                          </div>
                          <p className="text-xs text-neutral-800 leading-relaxed font-medium">
                            {task.interview_question_prep}
                          </p>
                        </div>
                      )}
                    </div>

                    {task.evidence && (
                      <div className="p-2.5 bg-lime-50 border-2 border-black rounded-[5px] text-xs font-bold flex items-start gap-2 shadow-[2px_2px_0px_#000]">
                        <CheckCircle2 className="w-4 h-4 text-black flex-shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                          <span className="font-black uppercase text-[10px] text-black">Verified Proof of Work:</span>
                          <p className="text-xs font-mono break-all">{task.evidence}</p>
                        </div>
                      </div>
                    )}

                    <div className="pt-3 border-t-2 border-black flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-1 text-xs">
                        <span className="text-[10px] font-black uppercase text-neutral-500 mr-1">Status:</span>
                        {(["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "VERIFIED"] as TaskStatusType[]).map((st) => (
                          <button
                            key={st}
                            disabled={isUpdatingStatus}
                            onClick={() => handleStatusChange(task, st)}
                            className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-[4px] border-2 border-black transition-all ${
                              task.status === st
                                ? "bg-black text-white shadow-[2px_2px_0px_#000]"
                                : "bg-white text-black hover:bg-neutral-100"
                            }`}
                          >
                            {st.replace("_", " ")}
                          </button>
                        ))}
                      </div>

                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setSelectedTaskForEvidence(task);
                          setEvidenceText(task.evidence || "");
                          setIsEvidenceModalOpen(true);
                        }}
                        className="text-xs border-2 border-black shadow-[2px_2px_0px_#000] flex items-center gap-1.5"
                      >
                        <Link2 className="w-3.5 h-3.5" />
                        <span>{task.evidence ? "Edit Evidence" : "Attach Proof of Work"}</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      <Modal
        isOpen={isGeneratorOpen}
        onClose={() => setIsGeneratorOpen(false)}
        title="Generate AI Placement Roadmap"
        maxWidth="lg"
      >
        <form onSubmit={handleCreatePlan} className="space-y-4">
          <p className="text-xs text-neutral-600 font-medium">
            Select a target placement posting. Our engine cross-references your skill gaps and crafts an execution-driven study roadmap.
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
              <span>Target Placement Role</span>
            </label>
            <select
              value={targetJobId}
              onChange={(e) => setTargetJobId(e.target.value)}
              required
              className="w-full text-xs font-bold border-2 border-black rounded-[5px] p-2.5 bg-white shadow-[2px_2px_0px_#000]"
            >
              <option value="">-- Choose a Placement Posting --</option>
              {availableJobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.company}: {j.title} ({j.location || "Remote"})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>Weekly Time Budget ({hoursPerWeek} hrs/wk)</span>
              </label>
              <input
                type="range"
                min="4"
                max="30"
                step="2"
                value={hoursPerWeek}
                onChange={(e) => setHoursPerWeek(Number(e.target.value))}
                className="w-full accent-black cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-neutral-500 font-bold">
                <span>4 hrs (Light)</span>
                <span>30 hrs (Sprint)</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>Target Horizon ({targetWeeks} weeks)</span>
              </label>
              <input
                type="range"
                min="2"
                max="12"
                step="1"
                value={targetWeeks}
                onChange={(e) => setTargetWeeks(Number(e.target.value))}
                className="w-full accent-black cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-neutral-500 font-bold">
                <span>2 wks (Cram)</span>
                <span>12 wks (Comprehensive)</span>
              </div>
            </div>
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
              <span>{isGenerating ? "Architecting Curriculum..." : "Generate Roadmap"}</span>
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isEvidenceModalOpen}
        onClose={() => setIsEvidenceModalOpen(false)}
        title="Submit Verification Evidence"
        maxWidth="md"
      >
        <form onSubmit={handleSubmitEvidence} className="space-y-4">
          <p className="text-xs text-neutral-600 font-medium">
            Attach a link to your GitHub repository, pull request, pull commit, or a summary note showing successful implementation of:
          </p>

          {selectedTaskForEvidence && (
            <div className="p-2.5 border-2 border-black rounded-[5px] bg-neutral-50">
              <div className="text-xs font-black uppercase text-black">{selectedTaskForEvidence.title}</div>
              <div className="text-[11px] text-neutral-600 font-medium">{selectedTaskForEvidence.practice_project}</div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5" />
              <span>GitHub URL or Proof Notes</span>
            </label>
            <Textarea
              placeholder="e.g. https://github.com/alexrivera/distributed-task-worker or summary of completed practice problems"
              value={evidenceText}
              onChange={(e) => setEvidenceText(e.target.value)}
              rows={3}
              required
              className="border-2 border-black font-mono text-xs"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t-2 border-black">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsEvidenceModalOpen(false)}
              className="border-2 border-black"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isUpdatingStatus}
              className="shadow-[3px_3px_0px_#000] flex items-center gap-1.5"
            >
              <Award className="w-3.5 h-3.5" />
              <span>Verify & Complete Task</span>
            </Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
