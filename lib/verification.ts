export type VerificationStatus = "verified" | "unverified" | "checking" | "none";

export function evaluateVerificationStatus(text: string): VerificationStatus {
  if (!text || text.trim().length === 0) return "none";
  return text.trim().length > 50 ? "verified" : "unverified";
}
