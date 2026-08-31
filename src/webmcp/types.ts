import type { MediaItem } from "../infinite-canvas/types";

export type JSONSchemaProperty = {
  type: "string" | "number" | "boolean" | "integer" | "array" | "object";
  description?: string;
  enum?: string[] | number[];
  items?: JSONSchemaProperty;
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
};

export type JSONSchema = {
  type: "object";
  properties: Record<string, JSONSchemaProperty>;
  required?: string[];
  additionalProperties?: boolean;
};

export type ModelContextToolExecuteOptions = {
  signal?: AbortSignal;
};

export type ModelContextTool = {
  name: string;
  title?: string;
  description: string;
  inputSchema: JSONSchema | string;
  execute: (
    inputArguments: Record<string, any>,
    options?: ModelContextToolExecuteOptions
  ) => Promise<any> | any;
  annotations?: {
    readOnlyHint?: boolean;
    untrustedContentHint?: boolean;
  };
};

export interface ModelContext {
  registerTool(tool: ModelContextTool): void;
  unregisterTool(name: string): boolean;
  getTools(): ModelContextTool[];
  getTool(name: string): ModelContextTool | undefined;
  executeTool(name: string, inputArguments?: Record<string, any> | string): Promise<any>;
}

export type WebMCPEventType =
  | "PRODUCT_FOCUS"
  | "FILTER_PRODUCTS"
  | "RESET_VIEW"
  | "TOOL_EXECUTED"
  | "CAMERA_NAVIGATE";

export type WebMCPEvent =
  | {
      type: "PRODUCT_FOCUS";
      product: MediaItem;
      source: "mcp" | "ui";
    }
  | {
      type: "FILTER_PRODUCTS";
      products: MediaItem[];
      filters: {
        query?: string;
        category?: string;
        brand?: string;
        minPrice?: number;
        maxPrice?: number;
      };
      source: "mcp" | "ui";
    }
  | {
      type: "RESET_VIEW";
      source: "mcp" | "ui";
    }
  | {
      type: "TOOL_EXECUTED";
      toolName: string;
      args: Record<string, any>;
      result: any;
    }
  | {
      type: "CAMERA_NAVIGATE";
      target: { x: number; y: number; z: number };
    };

export type JsonRpcRequest = {
  jsonrpc: "2.0";
  id?: string | number;
  method: string;
  params?: Record<string, any>;
};

export type JsonRpcResponse = {
  jsonrpc: "2.0";
  id?: string | number | null;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
};
