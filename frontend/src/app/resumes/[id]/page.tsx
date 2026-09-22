"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import {
  resumeService,
  GeneratedResumeOut,
  ResumeDiffItem,
  ResumeAnalysisOut,
  PdfCompilerStatusOut,
} from "@/services/resumes";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  Calendar,
  Sparkles,
  Copy,
  Check,
  Download,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileCode,
  FileText,
  Layers,
  ArrowRight,
  TrendingUp,
  Tag,
  Kanban,
  Brain,
  Target,
  Lightbulb,
  MessageSquare,
  Eye,
  Printer,
  FileDown,
  RefreshCw,
} from "lucide-react";


export default function ResumeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const resumeId =
    typeof params?.id === "string"
      ? params.id
      : Array.isArray(params?.id)
      ? params.id[0]
      : "";

  const [resume, setResume] = useState<GeneratedResumeOut | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  const [activeTab, setActiveTab] = useState<"diffs" | "markdown" | "latex" | "pdf">("diffs");

  const [copiedMd, setCopiedMd] = useState<boolean>(false);
  const [copiedLatex, setCopiedLatex] = useState<boolean>(false);

  const [isApplyModalOpen, setIsApplyModalOpen] = useState<boolean>(false);
  const [applyCompanyName, setApplyCompanyName] = useState<string>("");
  const [isApplying, setIsApplying] = useState<boolean>(false);

  const [isReadinessOpen, setIsReadinessOpen] = useState<boolean>(false);
  const [isAnalysing, setIsAnalysing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<ResumeAnalysisOut | null>(null);
  const [analyserError, setAnalyserError] = useState<string>("");

  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pdfStatus, setPdfStatus] = useState<PdfCompilerStatusOut | null>(null);
  const [pdfLoading, setPdfLoading] = useState<boolean>(false);
  const [pdfError, setPdfError] = useState<string>("");
  const [pdfViewMode, setPdfViewMode] = useState<"native" | "paper">("paper");



  const loadResumeData = useCallback(async () => {
    if (!resumeId) return;
    setLoading(true);
    setError("");
    try {
      const data = await resumeService.getResumeById(resumeId);
      setResume(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load resume details.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [resumeId]);

  useEffect(() => {
    loadResumeData();
  }, [loadResumeData]);

  const handleCopyMarkdown = () => {
    if (!resume?.markdown) return;
    navigator.clipboard.writeText(resume.markdown);
    setCopiedMd(true);
    setTimeout(() => setCopiedMd(false), 2000);
  };

  const handleCopyLatex = () => {
    if (!resume?.latex) return;
    navigator.clipboard.writeText(resume.latex);
    setCopiedLatex(true);
    setTimeout(() => setCopiedLatex(false), 2000);
  };

  const handleDownloadLatex = () => {
    if (!resume?.latex) return;
    const blob = new Blob([resume.latex], { type: "text/x-tex" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${resume.position.toLowerCase().replace(/\s+/g, "_")}_resume.tex`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to permanently delete this resume version?")) return;
    try {
      await resumeService.deleteResume(resumeId);
      router.push("/resumes");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete resume.";
      setError(msg);
    }
  };

  const handleRecordApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyCompanyName.trim()) return;

    setIsApplying(true);
    try {
      const updated = await resumeService.recordApplication(resumeId, {
        company_name: applyCompanyName.trim(),
      });
      setResume(updated);
      setIsApplyModalOpen(false);
      setApplyCompanyName("");
    } catch (err) {
      console.error(err);
    } finally {
      setIsApplying(false);
    }
  };

  const handleReadinessCheck = async () => {
    setAnalyserError("");
    setAnalysisResult(null);
    setIsAnalysing(true);
    try {
      const result = await resumeService.analyzeExistingResume(resumeId);
      setAnalysisResult(result);
    } catch (err: unknown) {
      setAnalyserError(err instanceof Error ? err.message : "Analysis failed. Check your LLM provider in Settings.");
    } finally {
      setIsAnalysing(false);
    }
  };

  const fetchPdf = useCallback(async () => {
    if (!resumeId) return;
    setPdfLoading(true);
    setPdfError("");
    try {
      const [status, blob] = await Promise.all([
        resumeService.getPdfStatus().catch(() => ({ available: false, engine: "pdflatex" })),
        resumeService.downloadResumePdfBlob(resumeId).catch((err: Error) => {
          throw err;
        }),
      ]);
      setPdfStatus(status);
      const url = URL.createObjectURL(blob);
      setPdfBlobUrl(url);
      setPdfViewMode("native");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to compile LaTeX to PDF.";
      setPdfError(msg);
      setPdfViewMode("paper");
      resumeService.getPdfStatus().then(setPdfStatus).catch(() => null);
    } finally {
      setPdfLoading(false);
    }
  }, [resumeId]);

  const handleDownloadPdf = async () => {
    if (pdfBlobUrl) {
      const link = document.createElement("a");
      link.href = pdfBlobUrl;
      link.download = `${resume?.position.toLowerCase().replace(/\s+/g, "_") || "resume"}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      try {
        setPdfLoading(true);
        const blob = await resumeService.downloadResumePdfBlob(resumeId);
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${resume?.position.toLowerCase().replace(/\s+/g, "_") || "resume"}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch (err: unknown) {
        setPdfError(err instanceof Error ? err.message : "Failed to download PDF.");
      } finally {
        setPdfLoading(false);
      }
    }
  };

  const handlePrintPaper = () => {
    window.print();
  };




  if (loading) {
    return (
      <AppShell>
        <div className="py-24 text-center space-y-3">
          <div className="w-8 h-8 border-4 border-black border-t-transparent animate-spin mx-auto rounded-full" />
          <p className="text-xs font-black uppercase tracking-wider text-neutral-600">
            Loading Tailored Resume Studio & Diff Inspector...
          </p>
        </div>
      </AppShell>
    );
  }

  if (error || !resume) {
    return (
      <AppShell>
        <div className="py-16 text-center space-y-4 max-w-md mx-auto border-2 border-black rounded-[5px] bg-white shadow-[4px_4px_0px_#000] p-8">
          <AlertCircle className="w-10 h-10 text-red-600 mx-auto" />
          <h2 className="text-lg font-black uppercase">Resume Version Not Found</h2>
          <p className="text-xs text-neutral-600 font-medium">
            {error || "The requested resume version does not exist or has been removed."}
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={() => router.push("/resumes")}
            className="shadow-[2px_2px_0px_#000]"
          >
            Return to Resume Hub
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
            href="/resumes"
            className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-neutral-700 hover:text-black transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Resumes Hub</span>
          </Link>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setActiveTab("pdf");
                if (!pdfBlobUrl && !pdfLoading) {
                  fetchPdf();
                }
              }}
              className="text-xs border-2 border-black shadow-[2px_2px_0px_#000] flex items-center gap-1.5"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>View PDF</span>
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setAnalysisResult(null);
                setAnalyserError("");
                setIsReadinessOpen(true);
              }}
              className="text-xs border-2 border-black shadow-[2px_2px_0px_#000] flex items-center gap-1.5"
            >
              <Brain className="w-3.5 h-3.5" />
              <span>Interview Readiness</span>
            </Button>


            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setApplyCompanyName("");
                setIsApplyModalOpen(true);
              }}
              className="text-xs border-2 border-black shadow-[2px_2px_0px_#000] flex items-center gap-1.5"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Record Application</span>
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={handleCopyMarkdown}
              className="text-xs border-2 border-black shadow-[2px_2px_0px_#000] flex items-center gap-1.5"
            >
              {copiedMd ? <Check className="w-3.5 h-3.5 text-black" /> : <Copy className="w-3.5 h-3.5 text-black" />}
              <span>{copiedMd ? "Copied" : "Copy Markdown"}</span>
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={handleDownloadLatex}
              className="text-xs shadow-[2px_2px_0px_#000] flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .tex</span>
            </Button>

            <button
              onClick={handleDelete}
              className="p-2 rounded-[4px] border-2 border-black bg-white hover:bg-red-50 text-neutral-700 hover:text-red-600 shadow-[2px_2px_0px_#000]"
              title="Delete Resume"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="border-2 border-black bg-white rounded-[5px] p-5 shadow-[4px_4px_0px_#000] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-neutral-600">
              <Briefcase className="w-3.5 h-3.5" />
              <span className="text-[10px] font-black uppercase tracking-wider text-neutral-500">Target Role:</span>
              <span className="text-black font-black uppercase">{resume.position}</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-black uppercase">
              {resume.position}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="dark" className="text-xs">
              {resume.status}
            </Badge>
            <span className="text-xs font-mono font-bold px-3 py-1 bg-neutral-100 border-2 border-black rounded-[5px] shadow-[2px_2px_0px_#000]">
              {resume.diffs.length} Tailored XYZ Bullets
            </span>
          </div>
        </div>

        {resume.applied_companies && resume.applied_companies.length > 0 && (
          <div className="border-2 border-black bg-neutral-50 p-4 rounded-[5px] shadow-[3px_3px_0px_#000] space-y-2">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-neutral-700">
              <Building2 className="w-4 h-4 text-black" />
              <span>Companies Applied with this Tailored Version ({resume.applied_companies.length})</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {resume.applied_companies.map((co, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 text-xs font-black uppercase bg-white border-2 border-black rounded-[5px] shadow-[2px_2px_0px_#000] flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-black" />
                  <span>{co}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 border-b-2 border-black pb-2">
          <button
            onClick={() => setActiveTab("diffs")}
            className={`px-4 py-1.5 text-xs font-black uppercase tracking-wider rounded-[5px] border-2 border-black transition-all flex items-center gap-1.5 ${
              activeTab === "diffs"
                ? "bg-black text-white shadow-[3px_3px_0px_#000]"
                : "bg-white text-black hover:bg-neutral-100"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Diff Inspector ({resume.diffs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("markdown")}
            className={`px-4 py-1.5 text-xs font-black uppercase tracking-wider rounded-[5px] border-2 border-black transition-all flex items-center gap-1.5 ${
              activeTab === "markdown"
                ? "bg-black text-white shadow-[3px_3px_0px_#000]"
                : "bg-white text-black hover:bg-neutral-100"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>ATS Markdown View</span>
          </button>

          <button
            onClick={() => setActiveTab("latex")}
            className={`px-4 py-1.5 text-xs font-black uppercase tracking-wider rounded-[5px] border-2 border-black transition-all flex items-center gap-1.5 ${
              activeTab === "latex"
                ? "bg-black text-white shadow-[3px_3px_0px_#000]"
                : "bg-white text-black hover:bg-neutral-100"
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>LaTeX Source (.tex)</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("pdf");
              if (!pdfBlobUrl && !pdfLoading) {
                fetchPdf();
              }
            }}
            className={`px-4 py-1.5 text-xs font-black uppercase tracking-wider rounded-[5px] border-2 border-black transition-all flex items-center gap-1.5 ${
              activeTab === "pdf"
                ? "bg-black text-white shadow-[3px_3px_0px_#000]"
                : "bg-white text-black hover:bg-neutral-100"
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>PDF Document Preview</span>
          </button>
        </div>


        {activeTab === "diffs" && (
          <div className="space-y-4">
            <div className="p-3 bg-neutral-100 border-2 border-black rounded-[5px] text-xs font-medium flex items-center justify-between shadow-[2px_2px_0px_#000]">
              <span>
                Inspecting <strong>Google XYZ Formula</strong> transformations: <em>Accomplished [X] as measured by [Y], by doing [Z]</em>.
              </span>
              <Badge variant="dark" className="text-[10px]">
                High-Impact ATS Tuning
              </Badge>
            </div>

            {resume.diffs.length === 0 ? (
              <div className="py-16 text-center space-y-2 border-2 border-black rounded-[5px] bg-white shadow-[4px_4px_0px_#000] p-6">
                <CheckCircle2 className="w-8 h-8 mx-auto text-black" />
                <h3 className="text-sm font-black uppercase">No Bullet Modifications Required</h3>
                <p className="text-xs text-neutral-600 font-medium">
                  The original profile bullets already matched the placement requirements with optimal keyword alignment.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {resume.diffs.map((diff, idx) => (
                  <Card
                    key={idx}
                    className="border-2 border-black shadow-[4px_4px_0px_#000] bg-white"
                  >
                    <div className="p-3.5 border-b-2 border-black bg-neutral-50 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase text-neutral-500">Section:</span>
                        <span className="text-xs font-black text-black uppercase">{diff.section}</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-neutral-600">
                        Bullet #{idx + 1}
                      </span>
                    </div>

                    <CardContent className="p-5 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                        <div className="p-3.5 border-2 border-neutral-300 rounded-[5px] bg-neutral-50 space-y-1.5">
                          <div className="text-[10px] font-black uppercase tracking-wider text-neutral-500 flex items-center gap-1">
                            <span>Original Profile Bullet</span>
                          </div>
                          <p className="text-xs text-neutral-600 leading-relaxed font-medium">
                            {diff.original}
                          </p>
                        </div>

                        <div className="p-3.5 border-2 border-black rounded-[5px] bg-white shadow-[2px_2px_0px_#000] space-y-1.5">
                          <div className="text-[10px] font-black uppercase tracking-wider text-black flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-black" />
                            <span>Tailored XYZ Bullet</span>
                          </div>
                          <p className="text-xs text-black leading-relaxed font-bold">
                            {diff.tailored}
                          </p>
                        </div>
                      </div>

                      {diff.keywords_added && diff.keywords_added.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="text-[10px] font-black uppercase text-neutral-500 mr-1 flex items-center gap-1">
                            <Tag className="w-3 h-3" /> Injected JD Keywords:
                          </span>
                          {diff.keywords_added.map((kw, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 text-xs font-bold bg-black text-white rounded-[4px] shadow-[1px_1px_0px_#000]"
                            >
                              +{kw}
                            </span>
                          ))}
                        </div>
                      )}

                      {diff.explanation && (
                        <div className="bg-neutral-50 border border-neutral-300 p-2.5 rounded-[4px] text-xs">
                          <span className="font-black uppercase text-[10px] text-neutral-700 block mb-0.5">
                            Tailoring Rationale:
                          </span>
                          <p className="text-neutral-700 font-medium text-[11px] leading-relaxed">
                            {diff.explanation}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "markdown" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-neutral-600">
                Formatted ATS Markdown Document
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCopyMarkdown}
                className="text-xs border-2 border-black shadow-[2px_2px_0px_#000] flex items-center gap-1.5"
              >
                {copiedMd ? <Check className="w-3.5 h-3.5 text-black" /> : <Copy className="w-3.5 h-3.5 text-black" />}
                <span>{copiedMd ? "Copied" : "Copy Document"}</span>
              </Button>
            </div>

            <Card className="border-2 border-black shadow-[4px_4px_0px_#000] bg-white p-6">
              <pre className="font-mono text-xs text-neutral-900 whitespace-pre-wrap leading-relaxed overflow-x-auto">
                {resume.markdown}
              </pre>
            </Card>
          </div>
        )}

        {activeTab === "latex" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-neutral-600">
                LaTeX Source (.tex) for Overleaf / Local Compilers
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleCopyLatex}
                  className="text-xs border-2 border-black shadow-[2px_2px_0px_#000] flex items-center gap-1.5"
                >
                  {copiedLatex ? <Check className="w-3.5 h-3.5 text-black" /> : <Copy className="w-3.5 h-3.5 text-black" />}
                  <span>{copiedLatex ? "Copied" : "Copy LaTeX"}</span>
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleDownloadLatex}
                  className="text-xs shadow-[2px_2px_0px_#000] flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .tex</span>
                </Button>
              </div>
            </div>

            <Card className="border-2 border-black shadow-[4px_4px_0px_#000] bg-black text-lime-400 p-6">
              <pre className="font-mono text-xs whitespace-pre-wrap leading-relaxed overflow-x-auto">
                {resume.latex}
              </pre>
            </Card>
          </div>
        )}

        {activeTab === "pdf" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-2 border-black rounded-[5px] p-3 bg-neutral-100 shadow-[2px_2px_0px_#000]">
              <div className="flex items-center gap-1 bg-white border-2 border-black rounded-[4px] p-0.5">
                <button
                  onClick={() => setPdfViewMode("native")}
                  className={`px-3 py-1 text-xs font-black uppercase rounded-[3px] transition-all flex items-center gap-1.5 ${
                    pdfViewMode === "native"
                      ? "bg-black text-white shadow-[1px_1px_0px_#000]"
                      : "text-neutral-700 hover:bg-neutral-100"
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>Compiled PDF (pdflatex)</span>
                </button>
                <button
                  onClick={() => setPdfViewMode("paper")}
                  className={`px-3 py-1 text-xs font-black uppercase rounded-[3px] transition-all flex items-center gap-1.5 ${
                    pdfViewMode === "paper"
                      ? "bg-black text-white shadow-[1px_1px_0px_#000]"
                      : "text-neutral-700 hover:bg-neutral-100"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Typeset Paper View</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handlePrintPaper}
                  className="text-xs border-2 border-black shadow-[2px_2px_0px_#000] flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print / Save as PDF</span>
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={fetchPdf}
                  disabled={pdfLoading}
                  className="text-xs border-2 border-black shadow-[2px_2px_0px_#000] flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${pdfLoading ? "animate-spin" : ""}`} />
                  <span>{pdfLoading ? "Compiling..." : "Recompile"}</span>
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleDownloadPdf}
                  disabled={pdfLoading}
                  className="text-xs shadow-[2px_2px_0px_#000] flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </Button>
              </div>
            </div>

            {pdfViewMode === "native" ? (
              <div className="space-y-3">
                {pdfLoading && (
                  <div className="py-24 text-center space-y-3 border-2 border-black rounded-[5px] bg-white shadow-[4px_4px_0px_#000] p-8">
                    <div className="w-8 h-8 border-4 border-black border-t-transparent animate-spin mx-auto rounded-full" />
                    <p className="text-xs font-black uppercase tracking-wider text-neutral-600">
                      Executing pdflatex compiler on host system...
                    </p>
                  </div>
                )}

                {!pdfLoading && pdfBlobUrl && (
                  <div className="border-2 border-black rounded-[5px] shadow-[4px_4px_0px_#000] overflow-hidden bg-white">
                    <iframe
                      src={pdfBlobUrl}
                      className="w-full h-[850px] border-none"
                      title="pdflatex Compiled PDF"
                    />
                  </div>
                )}

                {!pdfLoading && !pdfBlobUrl && pdfError && (
                  <div className="border-2 border-black rounded-[5px] bg-white shadow-[4px_4px_0px_#000] p-6 space-y-4">
                    <div className="flex items-start gap-3 bg-neutral-50 border-2 border-black p-4 rounded-[5px]">
                      <AlertCircle className="w-6 h-6 text-black shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-black uppercase">pdflatex Engine Notice</h3>
                          <Badge variant="outline" className="text-[10px]">
                            Host Diagnostic
                          </Badge>
                        </div>
                        <p className="text-xs text-neutral-700 font-medium leading-relaxed">
                          {pdfError}
                        </p>
                        <p className="text-[11px] text-neutral-500 font-medium">
                          To enable local binary compilation via pdflatex, install MiKTeX (e.g. <code className="bg-neutral-200 px-1 py-0.5 rounded text-black font-mono">winget install MiKTeX.MiKTeX</code>) or TeX Live.
                        </p>
                      </div>
                    </div>

                    <div className="p-4 bg-neutral-100 border-2 border-black rounded-[5px] flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="text-xs font-bold text-neutral-700">
                        You can immediately view, customize, and print your resume using the <strong>Typeset Paper View</strong>.
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setPdfViewMode("paper")}
                        className="text-xs shadow-[2px_2px_0px_#000] shrink-0 flex items-center gap-1.5"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Switch to Typeset View</span>
                      </Button>
                    </div>
                  </div>
                )}

                {!pdfLoading && !pdfBlobUrl && !pdfError && (
                  <div className="py-20 text-center space-y-4 border-2 border-black rounded-[5px] bg-white shadow-[4px_4px_0px_#000] p-8">
                    <FileCode className="w-10 h-10 mx-auto text-neutral-600" />
                    <div className="space-y-1">
                      <h3 className="text-sm font-black uppercase">Ready to Compile</h3>
                      <p className="text-xs text-neutral-600 font-medium">
                        Click below to compile this resume's LaTeX source code into a high-resolution PDF.
                      </p>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={fetchPdf}
                      className="shadow-[2px_2px_0px_#000] mx-auto flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Compile LaTeX with pdflatex</span>
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-neutral-600 bg-white border-2 border-black rounded-[5px] p-3 shadow-[2px_2px_0px_#000]">
                  <span className="font-bold">
                    Showing high-fidelity LaTeX Article document representation (Letter / 10pt article format).
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handlePrintPaper}
                    className="text-xs border-2 border-black shadow-[1px_1px_0px_#000] flex items-center gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Document</span>
                  </Button>
                </div>

                <div
                  id="resume-printable-paper"
                  className="max-w-3xl mx-auto bg-white border-2 border-black rounded-[5px] shadow-[6px_6px_0px_#000] p-8 sm:p-12 space-y-6 text-neutral-900 font-serif leading-normal print:border-none print:shadow-none print:p-0 print:m-0"
                >
                  <div className="text-center space-y-1 pb-3 border-b-2 border-black">
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight uppercase text-black font-sans">
                      {String((resume.content as Record<string, any>)?.contact?.name || resume.position || "Candidate")}
                    </h1>
                    <div className="text-xs text-neutral-700 font-sans font-medium flex flex-wrap items-center justify-center gap-2">
                      {String((resume.content as Record<string, any>)?.contact?.email || "") && (
                        <span>{String((resume.content as Record<string, any>)?.contact?.email)}</span>
                      )}
                      {String((resume.content as Record<string, any>)?.contact?.phone || "") && (
                        <>
                          <span>|</span>
                          <span>{String((resume.content as Record<string, any>)?.contact?.phone)}</span>
                        </>
                      )}
                      {String((resume.content as Record<string, any>)?.contact?.location || "") && (
                        <>
                          <span>|</span>
                          <span>{String((resume.content as Record<string, any>)?.contact?.location)}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {Array.isArray((resume.content as Record<string, any>)?.skills) && ((resume.content as Record<string, any>).skills.length > 0) && (
                    <div className="space-y-1">
                      <h2 className="text-xs font-bold uppercase tracking-wider font-sans border-b border-black pb-0.5">
                        Technical Skills
                      </h2>
                      <p className="text-xs leading-relaxed">
                        <strong>Core Skills:</strong> {((resume.content as Record<string, any>).skills as string[]).join(", ")}
                      </p>
                    </div>
                  )}

                  {Array.isArray((resume.content as Record<string, any>)?.projects) && ((resume.content as Record<string, any>).projects.length > 0) && (
                    <div className="space-y-2">
                      <h2 className="text-xs font-bold uppercase tracking-wider font-sans border-b border-black pb-0.5">
                        Projects
                      </h2>
                      <div className="space-y-2.5">
                        {((resume.content as Record<string, any>).projects as Array<any>).map((p, idx) => (
                          <div key={idx} className="space-y-1 text-xs">
                            <div className="font-bold flex items-center justify-between">
                              <span>{p.title}</span>
                              {p.technologies && (
                                <span className="font-normal italic text-neutral-600">
                                  {Array.isArray(p.technologies) ? p.technologies.join(", ") : p.technologies}
                                </span>
                              )}
                            </div>
                            {Array.isArray(p.bullets) && (
                              <ul className="list-disc list-inside space-y-0.5 text-neutral-800">
                                {p.bullets.map((b: string, bi: number) => (
                                  <li key={bi} className="leading-relaxed">
                                    {b}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {Array.isArray((resume.content as Record<string, any>)?.experiences) && ((resume.content as Record<string, any>).experiences.length > 0) && (
                    <div className="space-y-2">
                      <h2 className="text-xs font-bold uppercase tracking-wider font-sans border-b border-black pb-0.5">
                        Experience
                      </h2>
                      <div className="space-y-2.5">
                        {((resume.content as Record<string, any>).experiences as Array<any>).map((e, idx) => (
                          <div key={idx} className="space-y-1 text-xs">
                            <div className="font-bold flex items-center justify-between">
                              <span>{e.role} -- {e.company}</span>
                            </div>
                            {Array.isArray(e.bullets) && (
                              <ul className="list-disc list-inside space-y-0.5 text-neutral-800">
                                {e.bullets.map((b: string, bi: number) => (
                                  <li key={bi} className="leading-relaxed">
                                    {b}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {Array.isArray((resume.content as Record<string, any>)?.educations) && ((resume.content as Record<string, any>).educations.length > 0) && (
                    <div className="space-y-1">
                      <h2 className="text-xs font-bold uppercase tracking-wider font-sans border-b border-black pb-0.5">
                        Education
                      </h2>
                      <div className="space-y-1">
                        {((resume.content as Record<string, any>).educations as Array<any>).map((edu, idx) => (
                          <div key={idx} className="text-xs flex items-center justify-between">
                            <span>
                              <strong>{edu.institution}</strong> | {edu.degree} {edu.branch ? `in ${edu.branch}` : ""}
                            </span>
                            {edu.end_year && (
                              <span className="text-neutral-600 font-sans">
                                {edu.start_year ? `${edu.start_year} - ` : ""}{edu.end_year}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}


        <Card className="border-2 border-black shadow-[4px_4px_0px_#000] bg-neutral-50 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-black uppercase text-black">Ready to Apply?</div>
              <p className="text-xs text-neutral-600 font-medium">
                Save your application in the Placement Workspace Kanban to track interview rounds and deadlines.
              </p>
            </div>
            <Link href="/workspace">
              <Button
                variant="primary"
                size="sm"
                className="shadow-[2px_2px_0px_#000] flex items-center gap-1.5 text-xs uppercase font-black"
              >
                <Kanban className="w-3.5 h-3.5" />
                <span>Go to Placement Workspace</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </Card>
      </div>

      <Modal
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
        title="Record Company Application"
        maxWidth="sm"
      >
        <form onSubmit={handleRecordApply} className="space-y-4">
          <p className="text-xs text-neutral-600 font-medium">
            Log the company that received this tailored resume version.
          </p>

          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              <span>Company Name</span>
            </label>
            <Input
              type="text"
              placeholder="e.g. Coinbase, Atlassian, Microsoft"
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
              <span>Log Application</span>
            </Button>
          </div>
        </form>
      </Modal>
      <Modal
        isOpen={isReadinessOpen}
        onClose={() => { setIsReadinessOpen(false); setAnalysisResult(null); setAnalyserError(""); }}
        title="Interview Readiness Check"
        maxWidth="lg"
      >
        <div className="space-y-4">
          {!analysisResult && !isAnalysing && !analyserError && (
            <div className="text-center py-6 space-y-3">
              <div className="p-3 bg-black text-white w-fit mx-auto rounded-[5px] shadow-[2px_2px_0px_#555]">
                <Brain className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-black uppercase">Analyse This Resume</p>
                <p className="text-xs text-neutral-600 font-medium">
                  Docling will parse this tailored resume and your BYOK LLM will evaluate it for interview readiness, technical depth, and ATS compliance.
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={handleReadinessCheck}
                className="shadow-[3px_3px_0px_#000] flex items-center gap-1.5 mx-auto"
              >
                <Brain className="w-3.5 h-3.5" />
                <span>Run Interview Readiness Check</span>
              </Button>
            </div>
          )}

          {isAnalysing && (
            <div className="text-center py-10 space-y-3">
              <div className="w-8 h-8 border-4 border-black border-t-transparent animate-spin mx-auto rounded-full" />
              <p className="text-xs font-black uppercase tracking-wider text-neutral-600">Analysing resume via BYOK LLM...</p>
            </div>
          )}

          {analyserError && (
            <div className="bg-red-50 border-2 border-black p-3 rounded-[5px] text-xs font-bold text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{analyserError}</span>
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
            </div>
          )}
        </div>
      </Modal>

    </AppShell>
  );
}
