export interface ApiResponse<T> {
  data: T;
  status: number;
  headers: Record<string, string>;
}

export interface PatientData {
  id: string;
  resourceType: string;
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  gender?: string;
  // Add other specific patient properties
}

export interface SearchResults<T> {
  data: T[];
  meta?: {
    total?: number;
  };
}

export interface ErrorResponse {
  message?: string;
  code?: string;
  details?: unknown;
}