export type ErrorCode = "not_found" | "invalid_state" | "validation" | "forbidden" | "conflict" | "unavailable";
const STATUS: Record<ErrorCode, number> = { not_found: 404, invalid_state: 409, validation: 422, forbidden: 403, conflict: 409, unavailable: 503 };
export class DialError extends Error {
  readonly status: number;
  constructor(readonly code: ErrorCode, message: string) { super(message); this.status = STATUS[code]; }
}
