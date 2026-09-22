"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  settingsService,
  ProviderType,
  LLMConfigOut,
  LLMConfigUpdate,
  LLMTestRequest,
  LLMTestResponse,
} from "@/services/settings";
import {
  googleService,
  GoogleConnectionStatusOut,
} from "@/services/google";
import { healthService } from "@/services/health";
import {
  Settings,
  Cpu,
  Zap,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  Server,
  Key,
  Globe,
  Database,
  Terminal,
  ExternalLink,
  Lock,
} from "lucide-react";

const PROVIDER_PRESETS: Record<ProviderType, { label: string; models: string[]; defaultBaseUrl?: string }> = {
  nvidia_nim: {
    label: "NVIDIA NIM (Official Engine)",
    models: [
      "meta/llama-3.1-8b-instruct",
      "meta/llama-3.3-70b-instruct",
      "nvidia/llama-3.1-nemotron-70b-instruct",
      "mistralai/mistral-large-2-instruct",
    ],
  },
  openrouter: {
    label: "OpenRouter (Multi-Model)",
    models: [
      "meta-llama/llama-3.3-70b-instruct",
      "google/gemini-2.5-flash",
      "anthropic/claude-3.5-sonnet",
      "mistralai/mistral-large-2407",
      "qwen/qwen-2.5-72b-instruct",
    ],
  },
  gemini: {
    label: "Google Gemini Native",
    models: [
      "gemini-2.5-flash",
      "gemini-1.5-pro",
      "gemini-1.5-flash",
    ],
  },
  groq: {
    label: "Groq LPU (Ultra-Low Latency)",
    models: [
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant",
      "llama-3.1-70b-versatile",
    ],
  },
  ollama: {
    label: "Ollama (Self-Hosted / Local)",
    models: [
      "llama3.2:latest",
      "deepseek-r1:8b",
      "qwen2.5-coder:7b",
      "mistral:latest",
    ],
    defaultBaseUrl: "http://localhost:11434/v1",
  },
};

export default function SettingsPage() {
  const [config, setConfig] = useState<LLMConfigOut | null>(null);
  const [googleStatus, setGoogleStatus] = useState<GoogleConnectionStatusOut | null>(null);
  const [healthStatus, setHealthStatus] = useState<{ status: string; database: string } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusMsg, setStatusMsg] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");

  const [primaryProvider, setPrimaryProvider] = useState<ProviderType>("nvidia_nim");
  const [primaryModel, setPrimaryModel] = useState<string>("meta/llama-3.1-8b-instruct");
  const [primaryApiKey, setPrimaryApiKey] = useState<string>("");
  const [primaryBaseUrl, setPrimaryBaseUrl] = useState<string>("");

  const [backupProvider, setBackupProvider] = useState<ProviderType | "">("");
  const [backupModel, setBackupModel] = useState<string>("");
  const [backupApiKey, setBackupApiKey] = useState<string>("");
  const [backupBaseUrl, setBackupBaseUrl] = useState<string>("");

  const [isSaving, setIsSaving] = useState<boolean>(false);

  const [testResult, setTestResult] = useState<LLMTestResponse | null>(null);
  const [isTesting, setIsTesting] = useState<boolean>(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [llmData, gData, hData] = await Promise.all([
        settingsService.getLLMConfig().catch(() => null),
        googleService.getConnectionStatus().catch(() => null),
        healthService.checkReady().catch(() => null),
      ]);

      if (llmData) {
        setConfig(llmData);
        setPrimaryProvider(llmData.primary_provider || "nvidia_nim");
        setPrimaryModel(llmData.primary_model || "meta/llama-3.1-8b-instruct");
        setPrimaryBaseUrl(llmData.primary_base_url || "");
        setBackupProvider(llmData.backup_provider || "");
        setBackupModel(llmData.backup_model || "");
        setBackupBaseUrl(llmData.backup_base_url || "");
      }

      setGoogleStatus(gData);
      setHealthStatus(hData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load system settings";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleProviderChange = (provider: ProviderType) => {
    setPrimaryProvider(provider);
    const preset = PROVIDER_PRESETS[provider];
    if (preset.models.length > 0) {
      setPrimaryModel(preset.models[0]);
    }
    if (preset.defaultBaseUrl) {
      setPrimaryBaseUrl(preset.defaultBaseUrl);
    } else {
      setPrimaryBaseUrl("");
    }
    setPrimaryApiKey("");
    setTestResult(null);
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg("");
    setStatusMsg("");
    try {
      const payload: LLMConfigUpdate = {
        primary_provider: primaryProvider,
        primary_model: primaryModel.trim(),
        primary_api_key: primaryApiKey.trim() ? primaryApiKey.trim() : undefined,
        primary_base_url: primaryBaseUrl.trim() ? primaryBaseUrl.trim() : "",
        backup_provider: backupProvider ? (backupProvider as ProviderType) : undefined,
        backup_model: backupModel.trim() ? backupModel.trim() : undefined,
        backup_api_key: backupApiKey.trim() ? backupApiKey.trim() : undefined,
        backup_base_url: backupBaseUrl.trim() ? backupBaseUrl.trim() : "",
      };

      const updated = await settingsService.updateLLMConfig(payload);
      setConfig(updated);
      setPrimaryApiKey("");
      setBackupApiKey("");
      setStatusMsg("BYOK Gateway settings saved successfully");
      setTimeout(() => setStatusMsg(""), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error saving LLM configuration";
      setErrorMsg(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestLatency = async () => {
    const isSavedProvider = config?.primary_provider === primaryProvider;
    const hasActiveKey = !!primaryApiKey.trim() || (isSavedProvider && !!config?.primary_api_key_masked);

    if (primaryProvider !== "ollama" && !hasActiveKey) {
      setTestResult({
        success: false,
        provider: primaryProvider,
        model: primaryModel,
        latency_ms: 0,
        error: `Please enter an API key for ${primaryProvider.toUpperCase()} in the Primary API Key field before testing.`,
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    try {
      const payload: LLMTestRequest = {
        provider: primaryProvider,
        model: primaryModel.trim(),
        api_key: primaryApiKey.trim() ? primaryApiKey.trim() : undefined,
        base_url: primaryBaseUrl.trim() ? primaryBaseUrl.trim() : undefined,
      };

      const res = await settingsService.testLLMConnection(payload);
      setTestResult(res);
    } catch (err: unknown) {
      setTestResult({
        success: false,
        provider: primaryProvider,
        model: primaryModel,
        latency_ms: 0,
        error: err instanceof Error ? err.message : "Network error testing provider connection",
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <AppShell>
      <div className="space-y-6 pb-20 animate-pop-in">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-black pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-black text-white rounded-[5px]">
                <Settings className="w-5 h-5" />
              </span>
              <h1 className="text-2xl font-black uppercase tracking-tight">
                System Settings & BYOK Gateway
              </h1>
            </div>
            <p className="text-xs text-neutral-600 font-medium">
              Configure your local or cloud LLM providers, test model latency, manage Google Workspace OAuth, and inspect system telemetry.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={loadAll}
              className="flex items-center gap-1.5 text-xs border-2 border-black shadow-[3px_3px_0px_#000]"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Status</span>
            </Button>
          </div>
        </div>

        {statusMsg && (
          <div className="bg-lime-50 border-2 border-black p-3 rounded-[5px] text-xs font-bold text-black flex items-center gap-2 shadow-[2px_2px_0px_#000] animate-pop-in">
            <CheckCircle2 className="w-4 h-4 text-black" />
            <span>{statusMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="bg-red-50 border-2 border-black p-3 rounded-[5px] text-xs font-bold text-black flex items-center gap-2 shadow-[2px_2px_0px_#000] animate-pop-in">
            <AlertCircle className="w-4 h-4 text-black" />
            <span>{errorMsg}</span>
          </div>
        )}

        {loading ? (
          <div className="py-24 text-center space-y-3">
            <div className="w-8 h-8 border-4 border-black border-t-transparent animate-spin mx-auto rounded-full" />
            <p className="text-xs font-black uppercase tracking-wider text-neutral-600">
              Loading System Configurations...
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2 space-y-6">
              <Card className="border-2 border-black shadow-[5px_5px_0px_#000] bg-white">
                <CardHeader className="border-b-2 border-black bg-neutral-50 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-black" />
                      <CardTitle className="text-sm font-black uppercase tracking-wider">
                        NVIDIA NIM AI Gateway (Bring Your Own Key)
                      </CardTitle>
                    </div>
                    <Badge variant="dark" className="text-[10px]">
                      NVIDIA INFERENCE MICROSERVICES
                    </Badge>
                  </div>
                  <CardDescription className="text-xs text-neutral-600">
                    Connect your NVIDIA NIM API key (nvapi-...) for accelerated inference across resume tailoring, JD intelligence, and interview readiness evaluation.
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-5">
                  <form onSubmit={handleSaveConfig} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-black uppercase tracking-wider text-black block">
                        Primary AI Provider
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                        {(Object.keys(PROVIDER_PRESETS) as ProviderType[]).map((pKey) => {
                          const pInfo = PROVIDER_PRESETS[pKey];
                          const isSelected = primaryProvider === pKey;
                          return (
                            <button
                              key={pKey}
                              type="button"
                              onClick={() => handleProviderChange(pKey)}
                              className={`p-2.5 border-2 border-black rounded-[5px] text-left transition-all ${
                                isSelected
                                  ? "bg-black text-white shadow-[2px_2px_0px_#000]"
                                  : "bg-white text-black hover:bg-neutral-50"
                              }`}
                            >
                              <div className="text-[11px] font-black uppercase truncate">{pInfo.label}</div>
                              <div className="text-[9px] opacity-70 font-medium">{pKey}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <div className="space-y-1">
                        <label className="text-xs font-black uppercase tracking-wider text-black block">
                          Primary Model Identifier *
                        </label>
                        <Input
                          required
                          value={primaryModel}
                          onChange={(e) => setPrimaryModel(e.target.value)}
                          placeholder="e.g. meta-llama/llama-3.3-70b-instruct"
                          className="text-xs"
                        />
                        <div className="flex flex-wrap gap-1 pt-1">
                          <span className="text-[10px] text-neutral-500 font-bold">Presets:</span>
                          {PROVIDER_PRESETS[primaryProvider]?.models.slice(0, 3).map((m) => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => setPrimaryModel(m)}
                              className="text-[10px] font-bold underline hover:text-black text-neutral-600"
                            >
                              {m.split("/").pop()}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-black uppercase tracking-wider text-black block">
                          Primary API Key
                        </label>
                        <div className="relative">
                          <Input
                            type="password"
                            value={primaryApiKey}
                            onChange={(e) => setPrimaryApiKey(e.target.value)}
                            placeholder={
                              config?.primary_provider === primaryProvider && config?.primary_api_key_masked
                                ? `Current Key: ${config.primary_api_key_masked}`
                                : `Enter ${primaryProvider.toUpperCase()} API Key (${
                                    primaryProvider === "groq"
                                      ? "gsk_..."
                                      : primaryProvider === "nvidia_nim"
                                      ? "nvapi-..."
                                      : primaryProvider === "openrouter"
                                      ? "sk-or-v1-..."
                                      : primaryProvider === "gemini"
                                      ? "AIzaSy..."
                                      : "API Key"
                                  })`
                            }
                            className="text-xs font-mono"
                          />
                        </div>
                        <span className="text-[10px] text-neutral-500 font-medium">
                          {config?.primary_provider === primaryProvider && config?.primary_api_key_masked
                            ? "Active key saved. Leave blank to retain current key."
                            : `No key configured for ${primaryProvider.toUpperCase()} yet. Enter key to test or activate.`}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-black uppercase tracking-wider text-black block">
                        Custom Base URL (Optional)
                      </label>
                      <Input
                        value={primaryBaseUrl}
                        onChange={(e) => setPrimaryBaseUrl(e.target.value)}
                        placeholder="https://openrouter.ai/api/v1 or http://localhost:11434/v1"
                        className="text-xs font-mono"
                      />
                      <span className="text-[10px] text-neutral-500 font-medium">
                        Useful for routing requests to self-hosted Ollama instances, local LM Studio, or private LLM proxies.
                      </span>
                    </div>

                    <div className="pt-4 border-t-2 border-black space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-black" />
                          <h4 className="text-xs font-black uppercase tracking-wider text-black">
                            Automated Failover / Backup Configuration
                          </h4>
                        </div>
                        <Badge variant="outline" className="text-[9px]">
                          OPTIONAL FALLBACK
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-black uppercase text-neutral-500 block mb-1">
                            Backup Provider
                          </label>
                          <select
                            value={backupProvider}
                            onChange={(e) => setBackupProvider(e.target.value as ProviderType | "")}
                            className="w-full px-3 py-2 border-2 border-black rounded-[5px] text-xs font-bold bg-white shadow-[2px_2px_0px_#000]"
                          >
                            <option value="">None (Disabled)</option>
                            <option value="groq">Groq</option>
                            <option value="openrouter">OpenRouter</option>
                            <option value="gemini">Gemini</option>
                            <option value="ollama">Ollama</option>
                            <option value="nvidia_nim">Nvidia NIM</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-black uppercase text-neutral-500 block mb-1">
                            Backup Model
                          </label>
                          <Input
                            value={backupModel}
                            onChange={(e) => setBackupModel(e.target.value)}
                            placeholder="e.g. llama-3.3-70b-versatile"
                            className="text-xs"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-black uppercase text-neutral-500 block mb-1">
                            Backup API Key
                          </label>
                          <Input
                            type="password"
                            value={backupApiKey}
                            onChange={(e) => setBackupApiKey(e.target.value)}
                            placeholder={
                              config?.backup_api_key_masked
                                ? `Current: ${config.backup_api_key_masked}`
                                : "Backup key..."
                            }
                            className="text-xs font-mono"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-black uppercase text-neutral-500 block mb-1">
                            Backup Base URL
                          </label>
                          <Input
                            value={backupBaseUrl}
                            onChange={(e) => setBackupBaseUrl(e.target.value)}
                            placeholder="https://..."
                            className="text-xs font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t-2 border-black flex flex-wrap items-center justify-between gap-3">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={handleTestLatency}
                        disabled={isTesting}
                        className="flex items-center gap-1.5 text-xs border-2 border-black shadow-[3px_3px_0px_#000]"
                      >
                        <Zap className={`w-3.5 h-3.5 ${isTesting ? "animate-spin" : ""}`} />
                        <span>{isTesting ? "Testing Connection..." : "Test Connection & Ping"}</span>
                      </Button>

                      <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        disabled={isSaving}
                        className="flex items-center gap-1.5 text-xs shadow-[3px_3px_0px_#000]"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>{isSaving ? "Saving..." : "Save AI Gateway Settings"}</span>
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              {testResult && (
                <Card className="border-2 border-black shadow-[4px_4px_0px_#000] bg-white animate-pop-in">
                  <div className="p-3 border-b-2 border-black bg-neutral-50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-black" />
                      <span className="text-xs font-black uppercase tracking-wider">
                        LLM Connection Diagnostics
                      </span>
                    </div>
                    <Badge
                      variant={testResult.success ? "dark" : "outline"}
                      className={testResult.success ? "" : "border-red-600 text-red-600"}
                    >
                      {testResult.success ? "SUCCESS" : "CONNECTION FAILED"}
                    </Badge>
                  </div>

                  <CardContent className="p-4 space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="p-2 border border-black rounded-[4px] bg-neutral-50 text-center">
                        <div className="text-[10px] font-black uppercase text-neutral-500">Provider</div>
                        <div className="text-xs font-black uppercase text-black">{testResult.provider}</div>
                      </div>
                      <div className="p-2 border border-black rounded-[4px] bg-neutral-50 text-center">
                        <div className="text-[10px] font-black uppercase text-neutral-500">Model</div>
                        <div className="text-xs font-black text-black truncate">{testResult.model}</div>
                      </div>
                      <div className="p-2 border border-black rounded-[4px] bg-neutral-50 text-center">
                        <div className="text-[10px] font-black uppercase text-neutral-500">Latency</div>
                        <div className="text-xs font-black text-black">{testResult.latency_ms} ms</div>
                      </div>
                      <div className="p-2 border border-black rounded-[4px] bg-neutral-50 text-center">
                        <div className="text-[10px] font-black uppercase text-neutral-500">Status</div>
                        <div className={`text-xs font-black ${testResult.success ? "text-lime-600" : "text-red-600"}`}>
                          {testResult.success ? "Online" : "Offline"}
                        </div>
                      </div>
                    </div>

                    {testResult.response && (
                      <div className="p-3 border-2 border-black rounded-[5px] bg-lime-50 text-xs font-mono text-black space-y-1">
                        <div className="text-[10px] font-black uppercase text-neutral-700">Sample Model Response:</div>
                        <div>{testResult.response}</div>
                      </div>
                    )}

                    {testResult.error && (
                      <div className="p-3 border-2 border-black rounded-[5px] bg-red-50 text-xs font-mono text-black space-y-1">
                        <div className="text-[10px] font-black uppercase text-red-700">Diagnostic Error Detail:</div>
                        <div className="whitespace-pre-wrap">{testResult.error}</div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="space-y-6">
              <Card className="border-2 border-black shadow-[4px_4px_0px_#000] bg-white">
                <CardHeader className="border-b-2 border-black bg-neutral-50 p-4">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-black" />
                    <CardTitle className="text-sm font-black uppercase tracking-wider">
                      Google Workspace Sync
                    </CardTitle>
                  </div>
                </CardHeader>

                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center justify-between p-3 border-2 border-black rounded-[5px] bg-neutral-50 shadow-[2px_2px_0px_#000]">
                    <div className="space-y-0.5">
                      <div className="text-xs font-black text-black">
                        {googleStatus?.connected ? "Account Connected" : "Local Mock Mode"}
                      </div>
                      <div className="text-[10px] text-neutral-600 font-medium">
                        {googleStatus?.email || "Offline development fallback active"}
                      </div>
                    </div>
                    <span
                      className={`w-3 h-3 rounded-full border-2 border-black ${
                        googleStatus?.connected ? "bg-lime-500" : "bg-neutral-300"
                      }`}
                    />
                  </div>

                  <div className="space-y-2 text-xs text-neutral-700">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-black" />
                      <span>Google Calendar deadline sync enabled</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-black" />
                      <span>Gmail recruiter status scanner enabled</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-neutral-200">
                    <Link href="/workspace">
                      <Button variant="secondary" size="sm" className="w-full text-xs border border-black">
                        Go to Workspace & Calendar Sync
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-black shadow-[4px_4px_0px_#000] bg-white">
                <CardHeader className="border-b-2 border-black bg-neutral-50 p-4">
                  <div className="flex items-center gap-2">
                    <Server className="w-4 h-4 text-black" />
                    <CardTitle className="text-sm font-black uppercase tracking-wider">
                      System Telemetry
                    </CardTitle>
                  </div>
                </CardHeader>

                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs py-1 border-b border-neutral-200">
                    <span className="font-bold text-neutral-600">FastAPI Backend:</span>
                    <span className="font-black text-black">{healthStatus?.status || "ready"}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs py-1 border-b border-neutral-200">
                    <span className="font-bold text-neutral-600">SQLite Database:</span>
                    <span className="font-black text-black">{healthStatus?.database || "connected"}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs py-1 border-b border-neutral-200">
                    <span className="font-bold text-neutral-600">Local Cache:</span>
                    <span className="font-black text-black">In-Memory Active</span>
                  </div>
                  <div className="flex items-center justify-between text-xs py-1">
                    <span className="font-bold text-neutral-600">Platform Version:</span>
                    <span className="font-black text-black">v1.0.0 (On-2-Apex)</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-black shadow-[4px_4px_0px_#000] bg-white">
                <CardHeader className="border-b-2 border-black bg-neutral-50 p-4">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-black" />
                    <CardTitle className="text-sm font-black uppercase tracking-wider">
                      Keyboard Shortcuts
                    </CardTitle>
                  </div>
                </CardHeader>

                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-neutral-600">Find Jobs:</span>
                    <kbd className="px-2 py-0.5 bg-neutral-100 border border-black rounded-[3px] font-mono text-[10px] font-bold">
                      G then J
                    </kbd>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-neutral-600">Workspace Kanban:</span>
                    <kbd className="px-2 py-0.5 bg-neutral-100 border border-black rounded-[3px] font-mono text-[10px] font-bold">
                      G then W
                    </kbd>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-neutral-600">Resume Studio:</span>
                    <kbd className="px-2 py-0.5 bg-neutral-100 border border-black rounded-[3px] font-mono text-[10px] font-bold">
                      G then R
                    </kbd>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-neutral-600">Candidate Profile:</span>
                    <kbd className="px-2 py-0.5 bg-neutral-100 border border-black rounded-[3px] font-mono text-[10px] font-bold">
                      G then P
                    </kbd>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
