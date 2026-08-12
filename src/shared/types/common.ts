export interface ApiEnvelope<T> {
  statusCode: string;
  message: string;
  data: T;
  timestamp: string;
  paging?: PageMetadata | null;
}

interface PageMetadata {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface PageResult<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface ApiErrorBody {
  errorCode?: string;
  domain?: string;
  fieldErrors?: Record<string, string>;
  [key: string]: unknown;
}
