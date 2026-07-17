export { METRICS, METRIC_KEYS } from "./runtime.mjs";
export type MetricKey =
  | "contextPackaging"
  | "aiDelegation"
  | "verificationDiscipline"
  | "iterationQuality"
  | "outcomeYield"
  | "toolFluency"
  | "domainClarity"
  | "communicationQuality"
  | "creativity"
  | "tokenEfficiency";
export type RawScores = Record<MetricKey, number>;
