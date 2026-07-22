import {
  API_BASE,
  type DashboardPayload,
  type ScenarioId,
  type UnifiedDashboardPayload,
} from "@/lib/types";

export type SimulateOptions = {
  mock?: boolean;
  signal?: AbortSignal;
};

export class ApiError extends Error {
  status: number;
  body: string;

  constructor(status: number, body: string) {
    super(`API ${status}: ${body}`);
    this.status = status;
    this.body = body;
  }
}

export async function simulate(
  scenarioId: ScenarioId | string,
  options: SimulateOptions = {},
): Promise<UnifiedDashboardPayload> {
  const url = new URL(`${API_BASE}/api/simulate/${scenarioId}`);
  if (options.mock === true) url.searchParams.set("mock", "true");
  if (options.mock === false) url.searchParams.set("mock", "false");

  const res = await fetch(url.toString(), {
    cache: "no-store",
    signal: options.signal,
  });

  if (!res.ok) {
    throw new ApiError(res.status, await res.text());
  }

  return (await res.json()) as UnifiedDashboardPayload;
}

export type StreamProgress = {
  stage: string;
  message?: string;
};

export type StreamHandlers = {
  onProgress?: (p: StreamProgress) => void;
  onDone?: (payload: UnifiedDashboardPayload) => void;
  onError?: (message: string) => void;
  mock?: boolean;
  signal?: AbortSignal;
};

/** Consume SSE from /api/simulate/{id}/stream */
export async function simulateStream(
  scenarioId: ScenarioId | string,
  handlers: StreamHandlers = {},
): Promise<UnifiedDashboardPayload> {
  const url = new URL(`${API_BASE}/api/simulate/${scenarioId}/stream`);
  if (handlers.mock === true) url.searchParams.set("mock", "true");
  if (handlers.mock === false) url.searchParams.set("mock", "false");

  const res = await fetch(url.toString(), {
    cache: "no-store",
    signal: handlers.signal,
    headers: { Accept: "text/event-stream" },
  });

  if (!res.ok || !res.body) {
    // Fallback to non-streaming simulate
    return simulate(scenarioId, { mock: handlers.mock, signal: handlers.signal });
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalPayload: UnifiedDashboardPayload | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";

    for (const chunk of chunks) {
      const lines = chunk.split("\n");
      let eventName = "message";
      let dataLine = "";
      for (const line of lines) {
        if (line.startsWith("event:")) eventName = line.slice(6).trim();
        if (line.startsWith("data:")) dataLine += line.slice(5).trim();
      }
      if (!dataLine) continue;
      try {
        const data = JSON.parse(dataLine) as {
          stage: string;
          message?: string;
          payload?: UnifiedDashboardPayload;
        };
        if (eventName === "progress" || data.stage !== "done") {
          handlers.onProgress?.({ stage: data.stage, message: data.message });
        }
        if (eventName === "done" && data.payload) {
          finalPayload = data.payload;
          handlers.onDone?.(data.payload);
        }
        if (eventName === "error") {
          handlers.onError?.(data.message || "Stream error");
          throw new Error(data.message || "Stream error");
        }
      } catch (e) {
        if (e instanceof SyntaxError) continue;
        throw e;
      }
    }
  }

  if (!finalPayload) {
    return simulate(scenarioId, { mock: handlers.mock, signal: handlers.signal });
  }
  return finalPayload;
}

/* ============================================================
   Live Telemetry + What-If Scenario Engine (DashboardPayload)
   ============================================================ */

/** GET /api/telemetry/live -> steady-state DashboardPayload. */
export async function getLiveTelemetry(
  options: SimulateOptions = {},
): Promise<DashboardPayload> {
  const url = new URL(`${API_BASE}/api/telemetry/live`);
  if (options.mock === true) url.searchParams.set("mock", "true");
  if (options.mock === false) url.searchParams.set("mock", "false");

  const res = await fetch(url.toString(), {
    cache: "no-store",
    signal: options.signal,
  });

  if (!res.ok) {
    throw new ApiError(res.status, await res.text());
  }

  return (await res.json()) as DashboardPayload;
}

/** POST /api/simulate/{id} -> deterministic what-if DashboardPayload. */
export async function simulateScenario(
  scenarioId: string,
  options: SimulateOptions = {},
): Promise<DashboardPayload> {
  const url = new URL(`${API_BASE}/api/simulate/${scenarioId}`);
  if (options.mock === true) url.searchParams.set("mock", "true");
  if (options.mock === false) url.searchParams.set("mock", "false");

  const res = await fetch(url.toString(), {
    method: "POST",
    cache: "no-store",
    signal: options.signal,
  });

  if (!res.ok) {
    throw new ApiError(res.status, await res.text());
  }

  return (await res.json()) as DashboardPayload;
}

export function formatApiError(e: unknown): string {
  if (e instanceof ApiError) {
    return `${e.message}. Ensure the FastAPI backend is running on ${API_BASE}.`;
  }
  if (e instanceof Error) {
    return `${e.message}. Ensure the FastAPI backend is running on ${API_BASE}.`;
  }
  return `Unknown fetch error. Ensure the FastAPI backend is running on ${API_BASE}.`;
}
