/// <reference types="self" />
interface ServiceWorkerGlobalScope {
  skipWaiting(): Promise<void>;
  clients: { claim(): Promise<void> };
}
interface ExtendableEvent extends Event {
  waitUntil(fn: Promise<unknown>): void;
}
interface FetchEvent extends Event {
  request: Request;
  respondWith(fn: Promise<Response> | Response): void;
}
declare const self: ServiceWorkerGlobalScope & Window & typeof globalThis;
declare const caches: CacheStorage;
