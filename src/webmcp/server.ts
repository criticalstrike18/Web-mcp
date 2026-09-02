import type { MediaItem } from "../infinite-canvas/types";
import { webmcpEvents } from "./events";
import { createWebMCPTools } from "./tools";
import type {
  JsonRpcRequest,
  JsonRpcResponse,
  ModelContext,
  ModelContextTool,
} from "./types";

export class WebMCPServer implements ModelContext {
  private tools: Map<string, ModelContextTool> = new Map();
  private products: MediaItem[] = [];
  private isInitialized = false;

  constructor(products: MediaItem[]) {
    this.products = products;
    this.initializeDefaultTools();
  }

  private initializeDefaultTools() {
    const defaultTools = createWebMCPTools(this.products);
    for (const tool of defaultTools) {
      this.registerTool(tool);
    }
  }

  public updateProducts(products: MediaItem[]) {
    this.products = products;
    this.tools.clear();
    this.initializeDefaultTools();
  }

  // ModelContext Interface Implementation
  public registerTool(tool: ModelContextTool): void {
    if (!tool || !tool.name) {
      throw new Error("Invalid tool: name is required");
    }
    this.tools.set(tool.name, tool);
  }

  public unregisterTool(name: string): boolean {
    return this.tools.delete(name);
  }

  public getTools(): ModelContextTool[] {
    return Array.from(this.tools.values());
  }

  public getTool(name: string): ModelContextTool | undefined {
    return this.tools.get(name);
  }

  public async executeTool(
    name: string,
    inputArguments?: Record<string, any> | string
  ): Promise<any> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`WebMCP Tool not found: "${name}"`);
    }

    let parsedArgs: Record<string, any> = {};
    if (typeof inputArguments === "string") {
      try {
        parsedArgs = JSON.parse(inputArguments);
      } catch {
        parsedArgs = { query: inputArguments };
      }
    } else if (inputArguments && typeof inputArguments === "object") {
      parsedArgs = inputArguments;
    }

    const result = await tool.execute(parsedArgs);

    webmcpEvents.emit({
      type: "TOOL_EXECUTED",
      toolName: name,
      args: parsedArgs,
      result,
    });

    return result;
  }

  // JSON-RPC 2.0 Handler (MCP Inspector, Chrome WebMCP, ChatGPT in-app browser)
  public async handleJsonRpc(request: JsonRpcRequest): Promise<JsonRpcResponse> {
    const id = request.id !== undefined ? request.id : null;

    try {
      if (!request || request.jsonrpc !== "2.0") {
        return {
          jsonrpc: "2.0",
          id,
          error: {
            code: -32600,
            message: "Invalid Request: jsonrpc must be '2.0'",
          },
        };
      }

      switch (request.method) {
        case "initialize":
          return {
            jsonrpc: "2.0",
            id,
            result: {
              protocolVersion: "2024-11-05",
              capabilities: {
                tools: {
                  listChanged: true,
                },
              },
              serverInfo: {
                name: "WebMCP-Shopping-Server",
                version: "1.0.0",
              },
            },
          };

        case "notifications/initialized":
        case "ping":
          return {
            jsonrpc: "2.0",
            id,
            result: {},
          };

        case "tools/list":
          return {
            jsonrpc: "2.0",
            id,
            result: {
              tools: this.getTools().map((t) => ({
                name: t.name,
                title: t.title,
                description: t.description,
                inputSchema: t.inputSchema,
                annotations: t.annotations,
              })),
            },
          };

        case "tools/call": {
          const { name, arguments: toolArgs } = request.params || {};
          if (!name) {
            return {
              jsonrpc: "2.0",
              id,
              error: {
                code: -32602,
                message: "Missing 'name' in tools/call params",
              },
            };
          }

          const output = await this.executeTool(name, toolArgs || {});
          return {
            jsonrpc: "2.0",
            id,
            result: {
              content: [
                {
                  type: "text",
                  text: typeof output === "string" ? output : JSON.stringify(output, null, 2),
                },
              ],
            },
          };
        }

        default:
          return {
            jsonrpc: "2.0",
            id,
            error: {
              code: -32601,
              message: `Method not found: ${request.method}`,
            },
          };
      }
    } catch (err: any) {
      return {
        jsonrpc: "2.0",
        id,
        error: {
          code: -32000,
          message: err?.message || "Internal WebMCP error",
          data: err,
        },
      };
    }
  }

  // Register in browser environments
  public mountBrowserGlobals(): void {
    if (typeof window === "undefined" || this.isInitialized) return;
    this.isInitialized = true;

    // 1. Native Chrome WebMCP & ModelContext support:
    // If the browser/extension provides a native modelContext, call its registerTool() directly!
    const tools = this.getTools();

    if (typeof document !== "undefined" && (document as any).modelContext?.registerTool) {
      for (const tool of tools) {
        try {
          (document as any).modelContext.registerTool({
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema,
            execute: async (input: any) => tool.execute(input),
          });
        } catch (err) {
          console.warn(`[WebMCP Native Register] on document.modelContext for ${tool.name}:`, err);
        }
      }
    }

    if (typeof navigator !== "undefined" && (navigator as any).modelContext?.registerTool) {
      for (const tool of tools) {
        try {
          (navigator as any).modelContext.registerTool({
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema,
            execute: async (input: any) => tool.execute(input),
          });
        } catch (err) {
          console.warn(`[WebMCP Native Register] on navigator.modelContext for ${tool.name}:`, err);
        }
      }
    }

    // 2. Polyfill window/document/navigator.modelContext if not provided
    try {
      if (!(window as any).modelContext) {
        (window as any).modelContext = this;
      }
      if (typeof navigator !== "undefined" && !(navigator as any).modelContext) {
        (navigator as any).modelContext = this;
      }
      if (typeof document !== "undefined" && !(document as any).modelContext) {
        (document as any).modelContext = this;
      }
    } catch {
      // ignore
    }

    // 3. High-level window.webmcp namespace for debugging, inspector, and direct access
    (window as any).webmcp = {
      server: this,
      events: webmcpEvents,
      getTools: () => this.getTools(),
      executeTool: (name: string, args: Record<string, any>) => this.executeTool(name, args),
      search: (query: string) => this.executeTool("search_products", { query }),
      focus: (productNameOrId: string) =>
        this.executeTool("focus_product", { productName: productNameOrId }),
      filter: (category: string) => this.executeTool("filter_products", { category }),
      selectSize: (size: string) => this.executeTool("select_product_size", { size }),
      addToCart: (productId?: string, size?: string, quantity?: number) =>
        this.executeTool("add_to_cart", { productId, size, quantity }),
      getCart: () => this.executeTool("get_cart", {}),
      next: () => this.executeTool("navigate_product", { direction: "next" }),
      prev: () => this.executeTool("navigate_product", { direction: "previous" }),
      back: () => this.executeTool("navigate_product", { direction: "back" }),
      reset: () => this.executeTool("reset_view", {}),
    };

    // 4. PostMessage bridge for MCP Inspector and Browser Extensions
    window.addEventListener("message", async (event: MessageEvent) => {
      const data = event.data;
      if (
        data &&
        typeof data === "object" &&
        data.jsonrpc === "2.0" &&
        typeof data.method === "string"
      ) {
        const response = await this.handleJsonRpc(data);
        if (event.source && typeof (event.source as any).postMessage === "function") {
          (event.source as any).postMessage(response, "*");
        } else {
          window.postMessage(response, "*");
        }
      }
    });

    // 6. Dispatch ready events
    try {
      window.dispatchEvent(new CustomEvent("modelcontext:ready", { detail: { tools } }));
      window.dispatchEvent(new CustomEvent("webmcp:ready", { detail: { tools } }));
    } catch {
      // ignore
    }

    console.log(
      "%c[WebMCP Ready]%c ModelContext Protocol tools registered & active on document.modelContext, navigator.modelContext & window.webmcp",
      "background: #111; color: #10b981; font-weight: bold; padding: 2px 6px; border-radius: 4px;",
      "color: #a3e635;"
    );
  }
}
