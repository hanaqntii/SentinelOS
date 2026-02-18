export interface ApiResponse<T> {
  data: T;
  meta?: {
    generatedAt: string;
  };
}
