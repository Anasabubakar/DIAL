import type { ProfileEntry } from "@dial/contracts";

export interface Me {
  userId: string;
  profile: { fullName: string; email: string; headline: string; summary: string; entries: ProfileEntry[]; verifiedAt: string | null } | null;
  cv: { id: string; filename: string; sizeBytes: number; createdAt: string } | null;
  roles: Role[];
  voice: { mode: "disabled" | "demo"; isDemoUser: boolean; phoneNumber: string | null };
  email: { provider: string; simulated: boolean; from: string; controlledRecipient: string | null };
}
export interface Role { id: string; title: string; company: string; description: string; applyEmail: string; createdAt: string }
export interface TaskRow { id: string; status: string; roleTitle: string | null; company: string | null; createdAt: string; callSessionId: string | null; attachmentChoice: string }
export interface TaskDetail {
  task: { id: string; status: string; currentVersion: number; attachmentChoice: string; executionMode: ExecutionMode; lastError: string | null; callSessionId: string | null; createdAt: string };
  role: Role | null;
  draft: { version: number; subject: string; body: string; recipient: string; attachmentChoice: string; attachmentFilename: string; attachmentSha256: string; changeSummary: string[]; supportingEntryIds: string[] } | null;
  versions: { version: number; attachmentChoice: string; createdAt: string }[];
  events: { id: string; type: string; message: string; createdAt: string; data: Record<string, unknown> | null }[];
  attempt: { status: string; deliveryStatus: string; providerMessageId: string | null; provider: string; error: string | null; updatedAt: string } | null;
  approval: { draftVersion: number; createdAt: string; evidence: { kind?: string } } | null;
  simulated: boolean;
  spoken: string;
}

export type ExecutionMode = "cloud" | "laptop";
export interface PlanNeed { label: string; met: boolean; fixHref?: string }
export interface Plan {
  requested: ExecutionMode; mode: ExecutionMode | null; status: "ready" | "needs_setup" | "blocked";
  headline: string; uses: string[]; needs: PlanNeed[]; confirmations: string[]; notes: string[];
  alternative: { mode: "cloud"; reason: string } | null;
}
export interface IntegrationCard {
  id: string; name: string; kind: "dial" | "your_account" | "device"; state: "connected" | "test" | "waiting" | "off" | "planned";
  can: string[]; cannot: string[]; scopes: string[]; disconnect: { supported: boolean; note: string }; error: string | null; detail?: string;
}
