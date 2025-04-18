declare module 'newrelic' {
  export function addCustomAttribute(key: string, value: string | number | boolean): void;
  export function addCustomAttributes(attributes: Record<string, string | number | boolean>): void;
  export function setTransactionName(name: string): void;
  export function noticeError(error: Error, customAttributes?: Record<string, string | number | boolean>): void;
  export function startWebTransaction(url: string, callback: () => any): void;
  export function startBackgroundTransaction(name: string, group: string, callback: () => any): void;
  export function endTransaction(): void;
  export function getBrowserTimingHeader(): string;
  export function recordMetric(name: string, value: number): void;
  export function recordCustomEvent(eventType: string, attributes: Record<string, any>): void;
  export function getTraceMetadata(): { trace_id: string; span_id: string };
  export function setIgnoreTransaction(ignored: boolean): void;
  export default {
    addCustomAttribute,
    addCustomAttributes,
    setTransactionName,
    noticeError,
    startWebTransaction,
    startBackgroundTransaction,
    endTransaction,
    getBrowserTimingHeader,
    recordMetric,
    recordCustomEvent,
    getTraceMetadata,
    setIgnoreTransaction
  };
}