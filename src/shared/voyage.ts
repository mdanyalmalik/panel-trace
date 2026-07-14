export interface VoyageKeyStatus {
  configured: boolean;
  secureStorageAvailable: boolean;
}

export type VoyageConnectionTestCode =
  | "success"
  | "missing-key"
  | "invalid-key"
  | "rate-limited"
  | "network-error"
  | "provider-error"
  | "secure-storage-unavailable";

export interface VoyageConnectionTestResult {
  ok: boolean;
  code: VoyageConnectionTestCode;
  message: string;
}
