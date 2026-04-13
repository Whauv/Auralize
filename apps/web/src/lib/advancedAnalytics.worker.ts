import {
  buildAdvancedAnalytics,
  type AdvancedAnalyticsInput,
  type AdvancedAnalyticsResult,
} from "./advancedAnalytics";

export type AdvancedAnalyticsWorkerRequest = {
  id: number;
  input: AdvancedAnalyticsInput;
};

export type AdvancedAnalyticsWorkerResponse =
  | {
      id: number;
      result: AdvancedAnalyticsResult;
      type: "complete";
    }
  | {
      error: string;
      id: number;
      type: "error";
    };

globalThis.onmessage = (event: MessageEvent<AdvancedAnalyticsWorkerRequest>) => {
  try {
    globalThis.postMessage({
      id: event.data.id,
      result: buildAdvancedAnalytics(event.data.input),
      type: "complete",
    } satisfies AdvancedAnalyticsWorkerResponse);
  } catch (error) {
    globalThis.postMessage({
      error: error instanceof Error ? error.message : "Advanced analytics failed.",
      id: event.data.id,
      type: "error",
    } satisfies AdvancedAnalyticsWorkerResponse);
  }
};
