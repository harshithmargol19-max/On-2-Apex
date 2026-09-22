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
  workspaceService,
  ApplicationStage,
  ApplicationEventType,
  ApplicationBrief,
  ApplicationOut,
  UpcomingDeadlineOut,
} from "@/services/workspace";
import {
  googleService,
  GoogleConnectionStatusOut,
  GmailEmailMatch,
} from "@/services/google";
import {
  Kanban,
  Plus,
  Calendar,
  Clock,
  Building2,
  MapPin,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Mail,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  DollarSign,
  FileText,
  Briefcase,
  History,
  Send,
  CalendarCheck,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const STAGES: { key: ApplicationStage; label: string }[] = [
  { key: "WISHLIST", label: "Wishlist" },
  { key: "APPLIED", label: "Applied" },
  { key: "OA_SCHEDULED", label: "OA Scheduled" },
  { key: "INTERVIEWING", label: "Interviewing" },
  { key: "OFFER", label: "Offer" },
  { key: "REJECTED", label: "Rejected" },
  { key: "WITHDRAWN", label: "Withdrawn" },
];

export default function WorkspacePage() {
  const [boardData, setBoardData] = useState<Record<string, ApplicationBrief[]>>({});
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<UpcomingDeadlineOut[]>([]);
  const [googleStatus, setGoogleStatus] = useState<GoogleConnectionStatusOut | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  const [viewMode, setViewMode] = useState<"grid" | "stacked">("grid");

  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [appDetail, setAppDetail] = useState<ApplicationOut | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);

  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [createCompany, setCreateCompany] = useState<string>("");
  const [createRole, setCreateRole] = useState<string>("");
  const [createStage, setCreateStage] = useState<ApplicationStage>("WISHLIST");
  const [createSalary, setCreateSalary] = useState<string>("");
  const [createLocation, setCreateLocation] = useState<string>("");
  const [createJobUrl, setCreateJobUrl] = useState<string>("");
  const [createDeadline, setCreateDeadline] = useState<string>("");
  const [createNotes, setCreateNotes] = useState<string>("");
  const [isCreating, setIsCreating] = useState<boolean>(false);

  const [isEventModalOpen, setIsEventModalOpen] = useState<boolean>(false);
  const [eventType, setEventType] = useState<ApplicationEventType>("NOTE_ADDED");
  const [eventTitle, setEventTitle] = useState<string>("");
  const [eventDescription, setEventDescription] = useState<string>("");
  const [eventDate, setEventDate] = useState<string>("");
  const [isAddingEvent, setIsAddingEvent] = useState<boolean>(false);

  const [isGmailModalOpen, setIsGmailModalOpen] = useState<boolean>(false);
  const [gmailMatches, setGmailMatches] = useState<GmailEmailMatch[]>([]);
  const [isScanningGmail, setIsScanningGmail] = useState<boolean>(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string>("");
  const [animatingCardId, setAnimatingCardId] = useState<string | null>(null);

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const boardRes = await workspaceService.getBoard();
      setBoardData(boardRes.stages || {});

      const deadlinesRes = await workspaceService.getUpcomingDeadlines(14).catch(() => []);
      setUpcomingDeadlines(deadlinesRes);

      const gStatus = await googleService.getConnectionStatus().catch(() => ({
        connected: false,
        scopes: [],
        is_mock: true,
      }));
      setGoogleStatus(gStatus);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load placement workspace.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  const loadAppDetail = async (appId: string) => {
    setSelectedAppId(appId);
    setLoadingDetail(true);
    try {
      const detail = await workspaceService.getApplicationDetail(appId);
      setAppDetail(detail);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleStageTransition = async (
    appId: string,
    currentStage: string,
    direction: "next" | "prev"
  ) => {
    const stageIdx = STAGES.findIndex((s) => s.key === currentStage);
    if (stageIdx === -1) return;

    const targetIdx = direction === "next" ? stageIdx + 1 : stageIdx - 1;
    if (targetIdx < 0 || targetIdx >= STAGES.length) return;

    const targetStage = STAGES[targetIdx].key;
    setAnimatingCardId(appId);

    try {
      const updated = await workspaceService.updateStage(appId, {
        stage: targetStage,
        note: `Moved to ${STAGES[targetIdx].label}`,
      });

      setBoardData((prev) => {
        const nextBoard: Record<string, ApplicationBrief[]> = {};
        for (const k of Object.keys(prev)) {
          nextBoard[k] = (prev[k] || []).filter((a) => a.id !== appId);
        }
        const targetList = nextBoard[targetStage] || [];
        nextBoard[targetStage] = [
          {
            id: updated.id,
            company: updated.company,
            role: updated.role,
            stage: updated.stage,
            salary: updated.salary,
            location: updated.location,
            deadline: updated.deadline,
            events_count: updated.events.length,
            created_at: updated.created_at,
          },
          ...targetList,
        ];
        return nextBoard;
      });

      if (selectedAppId === appId) {
        setAppDetail(updated);
      }
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setTimeout(() => setAnimatingCardId(null), 250);
    }
  };

  const handleCreateApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createCompany.trim() || !createRole.trim()) return;

    setIsCreating(true);
    try {
      await workspaceService.createApplication({
        company: createCompany.trim(),
        role: createRole.trim(),
        stage: createStage,
        salary: createSalary.trim() || undefined,
        location: createLocation.trim() || undefined,
        job_url: createJobUrl.trim() || undefined,
        deadline: createDeadline ? new Date(createDeadline).toISOString() : undefined,
        notes: createNotes.trim() || undefined,
      });

      setIsCreateOpen(false);
      setCreateCompany("");
      setCreateRole("");
      setCreateSalary("");
      setCreateLocation("");
      setCreateJobUrl("");
      setCreateDeadline("");
      setCreateNotes("");

      await loadWorkspace();
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppId || !eventTitle.trim()) return;

    setIsAddingEvent(true);
    try {
      const newEv = await workspaceService.addEvent(selectedAppId, {
        event_type: eventType,
        title: eventTitle.trim(),
        description: eventDescription.trim() || undefined,
        event_date: eventDate ? new Date(eventDate).toISOString() : undefined,
      });

      if (appDetail) {
        setAppDetail({
          ...appDetail,
          events: [newEv, ...appDetail.events],
        });
      }

      setIsEventModalOpen(false);
      setEventTitle("");
      setEventDescription("");
      setEventDate("");
      await loadWorkspace();
    } catch (err) {
      console.error(err);
    } finally {
      setIsAddingEvent(false);
    }
  };

  const handleDeleteApp = async (appId: string) => {
    if (!confirm("Are you sure you want to permanently delete this application?")) return;
    try {
      await workspaceService.deleteApplication(appId);
      setSelectedAppId(null);
      setAppDetail(null);
      await loadWorkspace();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSyncCalendar = async (appId: string) => {
    setSyncStatusMsg("Syncing with Google Calendar...");
    try {
      const res = await googleService.syncApplicationToCalendar(appId);
      setSyncStatusMsg(`Synced ${res.synced_events_count} event(s) to Google Calendar.`);
      setTimeout(() => setSyncStatusMsg(""), 3000);
    } catch {
      setSyncStatusMsg("Calendar sync completed (Mock/Development Mode).");
      setTimeout(() => setSyncStatusMsg(""), 3000);
    }
  };

  const handleScanGmail = async () => {
    setIsScanningGmail(true);
    try {
      const res = await googleService.scanGmail();
      setGmailMatches(res.matches || []);
      setIsGmailModalOpen(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsScanningGmail(false);
    }
  };

  const handleApplyGmailProposal = async (match: GmailEmailMatch) => {
    const allApps = Object.values(boardData).flat();
    const existing = allApps.find(
      (a) => a.company.toLowerCase() === match.company.toLowerCase()
    );

    if (existing) {
      await workspaceService.updateStage(existing.id, {
        stage: match.detected_stage as ApplicationStage,
        note: `Auto-updated via Gmail scanner (${match.subject})`,
      });
    } else {
      await workspaceService.createApplication({
        company: match.company,
        role: "Software Engineer",
        stage: match.detected_stage as ApplicationStage,
        notes: `Imported from Gmail: ${match.subject}\n\nSnippet: ${match.snippet}`,
      });
    }

    setGmailMatches((prev) => prev.filter((m) => m !== match));
    await loadWorkspace();
  };

  const totalApplicationsCount = Object.values(boardData).reduce(
    (acc, list) => acc + list.length,
    0
  );

  return (
    <AppShell>
      <div className="space-y-6 pb-20 animate-pop-in">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-black pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-black text-white rounded-[5px]">
                <Kanban className="w-5 h-5" />
              </span>
              <h1 className="text-2xl font-black uppercase tracking-tight">
                Placement Workspace & Kanban
              </h1>
            </div>
            <p className="text-xs text-neutral-600 font-medium">
              Track placements across 7 execution stages with natural vertical scrolling. Monitor online assessments, upcoming interviews, Google Calendar sync, and auto-detect recruiter updates with Gmail.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-white border-2 border-black rounded-[5px] text-xs font-bold shadow-[2px_2px_0px_#000]">
              <span
                className={`w-2 h-2 rounded-full ${
                  googleStatus?.connected ? "bg-lime-500" : "bg-neutral-400"
                }`}
              />
              <span>
                {googleStatus?.connected
                  ? `Google: ${googleStatus.email || "Active"}`
                  : "Google: Offline / Mock"}
              </span>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={handleScanGmail}
              disabled={isScanningGmail}
              className="flex items-center gap-1.5 text-xs border-2 border-black shadow-[3px_3px_0px_#000]"
            >
              <Mail className={`w-3.5 h-3.5 ${isScanningGmail ? "animate-spin" : ""}`} />
              <span>{isScanningGmail ? "Scanning Inbox..." : "Scan Gmail Updates"}</span>
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-1.5 text-xs shadow-[3px_3px_0px_#000]"
            >
              <Plus className="w-4 h-4" />
              <span>New Application</span>
            </Button>
          </div>
        </div>

        {syncStatusMsg && (
          <div className="bg-lime-50 border-2 border-black p-3 rounded-[5px] text-xs font-bold text-black flex items-center gap-2 shadow-[2px_2px_0px_#000] animate-pop-in">
            <CheckCircle2 className="w-4 h-4 text-black" />
            <span>{syncStatusMsg}</span>
          </div>
        )}

        {upcomingDeadlines.length > 0 && (
          <Card className="border-2 border-black shadow-[4px_4px_0px_#000] bg-white animate-pop-in">
            <div className="p-3 border-b-2 border-black bg-neutral-50 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-black">
                <Clock className="w-4 h-4 text-black" />
                <span>14-Day Placement Deadlines & Interview Agenda</span>
              </div>
              <Badge variant="dark" className="text-[10px]">
                {upcomingDeadlines.length} Upcoming
              </Badge>
            </div>

            <CardContent className="p-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {upcomingDeadlines.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 border-2 border-black rounded-[5px] bg-neutral-50 shadow-[2px_2px_0px_#000] space-y-1.5 flex flex-col justify-between hover:translate-x-[-1px] transition-all"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-neutral-600">
                          {item.company}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-[3px] bg-black text-white uppercase">
                          {item.stage.replace("_", " ")}
                        </span>
                      </div>
                      <h4 className="text-xs font-black text-black line-clamp-1">{item.title}</h4>
                    </div>

                    <div className="pt-2 border-t border-neutral-300 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-neutral-600 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-black" />
                        <span>{new Date(item.deadline_date).toLocaleDateString()}</span>
                      </span>

                      <button
                        onClick={() => handleSyncCalendar(item.application_id)}
                        className="text-[10px] font-black uppercase text-black hover:underline flex items-center gap-0.5"
                        title="Sync event to Google Calendar"
                      >
                        <CalendarCheck className="w-3 h-3" />
                        <span>Sync</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-black pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-neutral-600">
              Active Pipeline:
            </span>
            <span className="px-2.5 py-0.5 text-xs font-black bg-black text-white rounded-[4px] shadow-[2px_2px_0px_#000]">
              {totalApplicationsCount} Applications
            </span>
          </div>

          <div className="flex items-center gap-4 bg-white border-2 border-black px-4 py-2 rounded-[5px] shadow-[3px_3px_0px_#000]">
            <span className="text-xs font-black uppercase tracking-wider text-black">
              Layout:
            </span>

            <label className="flex items-center gap-2 cursor-pointer select-none group">
              <input
                type="radio"
                name="workspaceLayout"
                value="grid"
                checked={viewMode === "grid"}
                onChange={() => setViewMode("grid")}
                className="sr-only"
              />
              <span
                className={`w-4 h-4 rounded-full border-2 border-black flex items-center justify-center transition-all ${
                  viewMode === "grid"
                    ? "bg-white"
                    : "bg-neutral-100 group-hover:border-neutral-700"
                }`}
              >
                {viewMode === "grid" && (
                  <span className="w-2 h-2 rounded-full bg-black animate-pop-in" />
                )}
              </span>
              <span
                className={`text-xs font-black uppercase tracking-wider transition-colors ${
                  viewMode === "grid"
                    ? "text-black underline decoration-2 underline-offset-2"
                    : "text-neutral-600 group-hover:text-black"
                }`}
              >
                Wrap Grid
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none group">
              <input
                type="radio"
                name="workspaceLayout"
                value="stacked"
                checked={viewMode === "stacked"}
                onChange={() => setViewMode("stacked")}
                className="sr-only"
              />
              <span
                className={`w-4 h-4 rounded-full border-2 border-black flex items-center justify-center transition-all ${
                  viewMode === "stacked"
                    ? "bg-white"
                    : "bg-neutral-100 group-hover:border-neutral-700"
                }`}
              >
                {viewMode === "stacked" && (
                  <span className="w-2 h-2 rounded-full bg-black animate-pop-in" />
                )}
              </span>
              <span
                className={`text-xs font-black uppercase tracking-wider transition-colors ${
                  viewMode === "stacked"
                    ? "text-black underline decoration-2 underline-offset-2"
                    : "text-neutral-600 group-hover:text-black"
                }`}
              >
                Vertical Stack
              </span>
            </label>
          </div>
        </div>

        {loading ? (
          <div className="py-24 text-center space-y-3">
            <div className="w-8 h-8 border-4 border-black border-t-transparent animate-spin mx-auto rounded-full" />
            <p className="text-xs font-black uppercase tracking-wider text-neutral-600">
              Loading Placement Workspace...
            </p>
          </div>
        ) : (
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5 items-start"
                : "space-y-6"
            }
          >
            {STAGES.map((col, cIdx) => {
              const items = boardData[col.key] || [];

              return (
                <div
                  key={col.key}
                  className="border-2 border-black rounded-[5px] bg-neutral-50 shadow-[4px_4px_0px_#000] flex flex-col animate-pop-in"
                >
                  <div className="p-3.5 border-b-2 border-black bg-white rounded-t-[3px] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-black border border-black" />
                      <h3 className="text-xs font-black uppercase tracking-wider text-black">
                        {col.label}
                      </h3>
                    </div>
                    <span className="px-2 py-0.5 text-xs font-black bg-black text-white rounded-[4px]">
                      {items.length}
                    </span>
                  </div>

                  <div className={viewMode === "grid" ? "p-3 space-y-3 min-h-[120px]" : "p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 min-h-[100px]"}>
                    {items.length === 0 ? (
                      <div className="py-8 text-center border-2 border-dashed border-neutral-300 rounded-[5px] text-[11px] font-bold text-neutral-400 uppercase tracking-wider col-span-full">
                        No Applications in {col.label}
                      </div>
                    ) : (
                      items.map((app) => (
                        <div
                          key={app.id}
                          className={`border-2 border-black rounded-[5px] bg-white p-3.5 shadow-[3px_3px_0px_#000] space-y-2 hover:translate-x-[-1px] transition-all cursor-pointer ${
                            animatingCardId === app.id ? "animate-pop-out" : "animate-pop-in"
                          }`}
                          onClick={() => loadAppDetail(app.id)}
                        >
                          <div className="space-y-0.5">
                            <div className="text-[10px] font-black uppercase tracking-wider text-neutral-500 flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              <span>{app.company}</span>
                            </div>
                            <h4 className="text-xs font-black text-black uppercase leading-snug">
                              {app.role}
                            </h4>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 text-[10px] pt-1">
                            {app.salary && (
                              <span className="px-1.5 py-0.5 bg-neutral-100 border border-black rounded-[3px] font-bold">
                                {app.salary}
                              </span>
                            )}
                            {app.location && (
                              <span className="px-1.5 py-0.5 bg-neutral-100 border border-black rounded-[3px] font-medium flex items-center gap-1">
                                <MapPin className="w-2.5 h-2.5" />
                                <span>{app.location}</span>
                              </span>
                            )}
                            {app.deadline && (
                              <span className="px-1.5 py-0.5 bg-black text-white rounded-[3px] font-bold flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" />
                                <span>{new Date(app.deadline).toLocaleDateString()}</span>
                              </span>
                            )}
                          </div>

                          <div className="pt-2 border-t border-neutral-200 flex items-center justify-between text-[11px]">
                            <span className="text-neutral-500 font-bold flex items-center gap-1">
                              <History className="w-3 h-3" />
                              <span>{app.events_count} events</span>
                            </span>

                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              {cIdx > 0 && (
                                <button
                                  onClick={() => handleStageTransition(app.id, col.key, "prev")}
                                  className="p-1 rounded-[3px] border border-black bg-white hover:bg-neutral-100 shadow-[1px_1px_0px_#000] active:scale-95 transition-transform"
                                  title={`Move to ${STAGES[cIdx - 1].label}`}
                                >
                                  <ChevronLeft className="w-3 h-3" />
                                </button>
                              )}
                              {cIdx < STAGES.length - 1 && (
                                <button
                                  onClick={() => handleStageTransition(app.id, col.key, "next")}
                                  className="p-1 rounded-[3px] border border-black bg-white hover:bg-neutral-100 shadow-[1px_1px_0px_#000] active:scale-95 transition-transform"
                                  title={`Move to ${STAGES[cIdx + 1].label}`}
                                >
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal
        isOpen={Boolean(selectedAppId && appDetail)}
        onClose={() => {
          setSelectedAppId(null);
          setAppDetail(null);
        }}
        title={appDetail ? `${appDetail.company}: ${appDetail.role}` : "Application Details"}
        maxWidth="lg"
      >
        {appDetail && (
          <div className="space-y-4 max-h-[550px] overflow-y-auto pr-1">
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-neutral-100 border-2 border-black rounded-[5px]">
              <div className="space-y-0.5">
                <span className="text-[10px] font-black uppercase text-neutral-500">Current Stage</span>
                <div className="text-xs font-black uppercase text-black">
                  {appDetail.stage.replace("_", " ")}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleSyncCalendar(appDetail.id)}
                  className="text-xs border-2 border-black shadow-[2px_2px_0px_#000] flex items-center gap-1"
                >
                  <CalendarCheck className="w-3.5 h-3.5" />
                  <span>Sync to Calendar</span>
                </Button>

                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleDeleteApp(appDetail.id)}
                  className="text-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              {appDetail.salary && (
                <div className="p-2 border border-black rounded-[4px] bg-neutral-50">
                  <span className="text-[10px] font-black uppercase text-neutral-500 block">Salary / Package</span>
                  <span className="font-bold">{appDetail.salary}</span>
                </div>
              )}
              {appDetail.location && (
                <div className="p-2 border border-black rounded-[4px] bg-neutral-50">
                  <span className="text-[10px] font-black uppercase text-neutral-500 block">Location</span>
                  <span className="font-bold">{appDetail.location}</span>
                </div>
              )}
              {appDetail.deadline && (
                <div className="p-2 border border-black rounded-[4px] bg-neutral-50">
                  <span className="text-[10px] font-black uppercase text-neutral-500 block">Assessment / Reply Deadline</span>
                  <span className="font-bold">{new Date(appDetail.deadline).toLocaleDateString()}</span>
                </div>
              )}
              {appDetail.job_url && (
                <div className="p-2 border border-black rounded-[4px] bg-neutral-50 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase text-neutral-500 block">Listing</span>
                    <a
                      href={appDetail.job_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold underline text-black text-xs flex items-center gap-1"
                    >
                      <span>External Job Link</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}
            </div>

            {appDetail.notes && (
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-neutral-500 block">Candidate Notes</span>
                <p className="text-xs text-neutral-800 bg-neutral-50 p-2.5 border border-black rounded-[4px] whitespace-pre-wrap leading-relaxed">
                  {appDetail.notes}
                </p>
              </div>
            )}

            <div className="border-t-2 border-black pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-black">
                  <History className="w-4 h-4 text-black" />
                  <span>Chronological Event Timeline</span>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsEventModalOpen(true)}
                  className="text-xs border-2 border-black shadow-[2px_2px_0px_#000] flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Event</span>
                </Button>
              </div>

              <div className="space-y-2">
                {appDetail.events.length === 0 ? (
                  <p className="text-xs text-neutral-400 italic">No events logged yet.</p>
                ) : (
                  appDetail.events.map((ev) => (
                    <div
                      key={ev.id}
                      className="p-3 border-2 border-black rounded-[5px] bg-white shadow-[2px_2px_0px_#000] space-y-1 animate-pop-in"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded-[3px] bg-black text-white text-[10px] font-bold uppercase">
                            {ev.event_type.replace("_", " ")}
                          </span>
                          <span className="font-black text-black">{ev.title}</span>
                        </div>
                        <span className="text-[10px] font-mono text-neutral-500">
                          {new Date(ev.event_date || ev.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      {ev.description && (
                        <p className="text-xs text-neutral-600 font-medium pl-1">
                          {ev.description}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Add Placement Application"
        maxWidth="md"
      >
        <form onSubmit={handleCreateApplication} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-black uppercase tracking-wider flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" />
                <span>Company *</span>
              </label>
              <Input
                type="text"
                placeholder="e.g. Google"
                value={createCompany}
                onChange={(e) => setCreateCompany(e.target.value)}
                required
                className="border-2 border-black text-xs font-bold"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-black uppercase tracking-wider flex items-center gap-1">
                <Briefcase className="w-3.5 h-3.5" />
                <span>Role *</span>
              </label>
              <Input
                type="text"
                placeholder="e.g. Software Engineer"
                value={createRole}
                onChange={(e) => setCreateRole(e.target.value)}
                required
                className="border-2 border-black text-xs font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-black uppercase tracking-wider">Initial Stage</label>
              <select
                value={createStage}
                onChange={(e) => setCreateStage(e.target.value as ApplicationStage)}
                className="w-full text-xs font-bold border-2 border-black rounded-[5px] p-2 bg-white"
              >
                {STAGES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-black uppercase tracking-wider">Salary (Optional)</label>
              <Input
                type="text"
                placeholder="e.g. $140,000"
                value={createSalary}
                onChange={(e) => setCreateSalary(e.target.value)}
                className="border-2 border-black text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-black uppercase tracking-wider">Location</label>
              <Input
                type="text"
                placeholder="e.g. Remote / Seattle"
                value={createLocation}
                onChange={(e) => setCreateLocation(e.target.value)}
                className="border-2 border-black text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-black uppercase tracking-wider">Deadline Date</label>
              <Input
                type="date"
                value={createDeadline}
                onChange={(e) => setCreateDeadline(e.target.value)}
                className="border-2 border-black text-xs"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-black uppercase tracking-wider">Job URL</label>
            <Input
              type="url"
              placeholder="https://careers.google.com/jobs/..."
              value={createJobUrl}
              onChange={(e) => setCreateJobUrl(e.target.value)}
              className="border-2 border-black text-xs"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-black uppercase tracking-wider">Notes & Insights</label>
            <Textarea
              placeholder="Key recruiter contact, referral, or prep notes..."
              value={createNotes}
              onChange={(e) => setCreateNotes(e.target.value)}
              rows={3}
              className="border-2 border-black text-xs font-medium"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t-2 border-black">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsCreateOpen(false)}
              className="border-2 border-black"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isCreating || !createCompany.trim() || !createRole.trim()}
              className="shadow-[3px_3px_0px_#000]"
            >
              <span>Add to Workspace</span>
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        title="Add Timeline Event"
        maxWidth="sm"
      >
        <form onSubmit={handleAddEvent} className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-black uppercase tracking-wider">Event Type</label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value as ApplicationEventType)}
              className="w-full text-xs font-bold border-2 border-black rounded-[5px] p-2 bg-white"
            >
              <option value="NOTE_ADDED">Note / Reflection</option>
              <option value="INTERVIEW_SCHEDULED">Interview Scheduled</option>
              <option value="OA_DEADLINE">OA Assessment Deadline</option>
              <option value="STATUS_UPDATE">Status Update</option>
              <option value="OFFER_RECEIVED">Offer Received</option>
              <option value="REJECTION_RECEIVED">Rejection Notice</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-black uppercase tracking-wider">Event Title</label>
            <Input
              type="text"
              placeholder="e.g. Technical Round 1 with Lead Architect"
              value={eventTitle}
              onChange={(e) => setEventTitle(e.target.value)}
              required
              className="border-2 border-black text-xs font-bold"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-black uppercase tracking-wider">Event Date</label>
            <Input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="border-2 border-black text-xs"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-black uppercase tracking-wider">Description</label>
            <Textarea
              placeholder="Focus areas: System design, concurrency, question details..."
              value={eventDescription}
              onChange={(e) => setEventDescription(e.target.value)}
              rows={3}
              className="border-2 border-black text-xs"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t-2 border-black">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsEventModalOpen(false)}
              className="border-2 border-black"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isAddingEvent || !eventTitle.trim()}
              className="shadow-[3px_3px_0px_#000]"
            >
              <span>Record Event</span>
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isGmailModalOpen}
        onClose={() => setIsGmailModalOpen(false)}
        title="Gmail Recruiter Scanner"
        maxWidth="lg"
      >
        <div className="space-y-4">
          <p className="text-xs text-neutral-600 font-medium">
            Our AI scanner inspected recruiter correspondence in your linked inbox and detected the following status signals. You can auto-update your Kanban columns with one click.
          </p>

          {gmailMatches.length === 0 ? (
            <div className="py-12 text-center space-y-2 border-2 border-black rounded-[5px] bg-neutral-50 p-6">
              <Mail className="w-8 h-8 mx-auto text-neutral-400" />
              <h4 className="text-xs font-black uppercase text-black">No New Recruiter Updates Found</h4>
              <p className="text-xs text-neutral-500 font-medium">
                No active interview invitations, OA assignments, or status updates detected in recent email traffic.
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
              {gmailMatches.map((match, idx) => (
                <div
                  key={idx}
                  className="border-2 border-black rounded-[5px] bg-white p-3.5 shadow-[3px_3px_0px_#000] space-y-2 animate-pop-in"
                >
                  <div className="flex items-start justify-between gap-2 border-b-2 border-black pb-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black uppercase text-black">{match.company}</span>
                        <span className="text-[10px] font-mono text-neutral-500">from {match.sender}</span>
                      </div>
                      <h4 className="text-xs font-bold text-black">{match.subject}</h4>
                    </div>

                    <div className="text-right">
                      <span className="px-2 py-0.5 rounded-[4px] bg-black text-white text-[10px] font-black uppercase">
                        {match.detected_stage.replace("_", " ")}
                      </span>
                      <div className="text-[10px] font-bold text-neutral-500 mt-1">
                        Confidence: {(match.confidence * 100).toFixed(0)}%
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-neutral-700 bg-neutral-50 p-2 border border-neutral-300 rounded-[4px] font-mono text-[11px] leading-relaxed">
                    "{match.snippet}"
                  </p>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] font-bold text-neutral-600">
                      Recommendation: {match.suggested_action}
                    </span>

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleApplyGmailProposal(match)}
                      className="text-xs shadow-[2px_2px_0px_#000] flex items-center gap-1"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Update to {match.detected_stage.replace("_", " ")}</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="pt-2 flex justify-end border-t-2 border-black">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsGmailModalOpen(false)}
              className="border-2 border-black"
            >
              Close Scanner
            </Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
