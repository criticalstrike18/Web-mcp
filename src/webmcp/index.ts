import type { MediaItem } from "../infinite-canvas/types";
import { WebMCPServer } from "./server";

let defaultServerInstance: WebMCPServer | null = null;

export function initWebMCP(products: MediaItem[]): WebMCPServer {
  if (!defaultServerInstance) {
    defaultServerInstance = new WebMCPServer(products);
    defaultServerInstance.mountBrowserGlobals();
  } else {
    defaultServerInstance.updateProducts(products);
  }
  return defaultServerInstance;
}

export function getWebMCPServer(): WebMCPServer | null {
  return defaultServerInstance;
}

export * from "./events";
export * from "./server";
export * from "./tools";
export * from "./types";
