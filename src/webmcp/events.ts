import type { WebMCPEvent, WebMCPEventType } from "./types";

type Listener<T extends WebMCPEvent = WebMCPEvent> = (event: T) => void;

class WebMCPEventEmitter {
  private listeners: Map<WebMCPEventType, Set<Listener>> = new Map();
  private history: WebMCPEvent[] = [];

  public on<T extends WebMCPEvent>(type: T["type"], listener: (event: T) => void): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    const set = this.listeners.get(type)!;
    set.add(listener as Listener);

    return () => {
      set.delete(listener as Listener);
    };
  }

  public emit<T extends WebMCPEvent>(event: T): void {
    this.history.push(event);
    if (this.history.length > 100) {
      this.history.shift();
    }

    const set = this.listeners.get(event.type);
    if (set) {
      set.forEach((listener) => {
        try {
          listener(event);
        } catch (err) {
          console.error(`[WebMCP Event Error] on ${event.type}:`, err);
        }
      });
    }
  }

  public getHistory(): WebMCPEvent[] {
    return [...this.history];
  }

  public clear(): void {
    this.listeners.clear();
    this.history = [];
  }
}

export const webmcpEvents = new WebMCPEventEmitter();
