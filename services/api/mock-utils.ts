import type { ApiResponse } from "@/types";

const DEFAULT_LATENCY_MS = 300;

export const withLatency = async <T>(
  payload: T,
  latencyMs = DEFAULT_LATENCY_MS
): Promise<ApiResponse<T>> => {
  await new Promise((resolve) => setTimeout(resolve, latencyMs));

  return {
    data: payload,
    meta: {
      generatedAt: new Date().toISOString()
    }
  };
};
