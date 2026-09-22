import { api } from "@/library/api";

export interface GoogleConnectionStatusOut {
  connected: boolean;
  email?: string | null;
  scopes: string[];
  expires_at?: string | null;
  is_mock: boolean;
}

export interface GoogleAuthUrlOut {
  auth_url: string;
  is_mock: boolean;
}

export interface GoogleCalendarSyncResultOut {
  synced_events_count: number;
  event_ids: string[];
  calendar_summary: string;
}

export interface GmailEmailMatch {
  company: string;
  sender: string;
  subject: string;
  date: string;
  snippet: string;
  detected_stage: string;
  confidence: number;
  suggested_action: string;
}

export interface GmailScanResultOut {
  scanned_count: number;
  matches: GmailEmailMatch[];
  sync_timestamp: string;
}

export const googleService = {
  async getConnectionStatus(): Promise<GoogleConnectionStatusOut> {
    return await api.get<GoogleConnectionStatusOut>("/google/status");
  },

  async getAuthUrl(): Promise<GoogleAuthUrlOut> {
    return await api.get<GoogleAuthUrlOut>("/google/auth-url");
  },

  async disconnect(): Promise<void> {
    await api.delete<void>("/google/disconnect");
  },

  async syncApplicationToCalendar(
    applicationId: string
  ): Promise<GoogleCalendarSyncResultOut> {
    return await api.post<GoogleCalendarSyncResultOut>(
      `/google/calendar/sync-application/${applicationId}`
    );
  },

  async scanGmail(): Promise<GmailScanResultOut> {
    return await api.post<GmailScanResultOut>("/google/gmail/scan");
  },
};
