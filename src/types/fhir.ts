export interface FHIROperationOutcome {
  resourceType: "OperationOutcome";
  issue: Array<{
    severity: "error" | "warning" | "information";
    code: string;
    diagnostics?: string;
  }>;
}

export interface APIError {
  status?: number;
  message?: string;
  details?: FHIROperationOutcome;
}