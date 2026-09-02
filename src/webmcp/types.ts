import type { MediaItem } from "../infinite-canvas/types";

export type WebMCPEventType =
  | "PRODUCT_FOCUS"
  | "FILTER_PRODUCTS"
  | "RESET_VIEW"
  | "TOOL_EXECUTED"
  | "CAMERA_NAVIGATE"
  | "FOCUS_FLIGHT_COMPLETE"
  | "UI_STATE_CHANGED"
  | "SELECT_SIZE"
  | "ADD_TO_CART"
  | "CART_UPDATED"
  | "BACK_TO_GRID"
  | "NEXT_PRODUCT"
  | "PREVIOUS_PRODUCT";

export type CartItem = {
  productId: string;
  product: MediaItem;
  size: string | null;
  quantity: number;
  addedAt?: number;
};

export type WebMCPEvent =
  | {
      type: "PRODUCT_FOCUS";
      product: MediaItem;
      products?: MediaItem[];
      source?: "mcp" | "ui";
    }
  | {
      type: "FILTER_PRODUCTS";
      products: MediaItem[];
      filters?: Record<string, any>;
      source?: "mcp" | "ui";
    }
  | {
      type: "RESET_VIEW";
      source?: "mcp" | "ui";
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
    }
  | {
      type: "FOCUS_FLIGHT_COMPLETE";
      mode?: "detail" | "grid";
      product?: MediaItem;
      products?: MediaItem[];
    }
  | {
      type: "UI_STATE_CHANGED";
      state: any;
    }
  | {
      type: "SELECT_SIZE";
      size: string;
    }
  | {
      type: "ADD_TO_CART";
      product: MediaItem;
      size?: string | null;
      quantity?: number;
    }
  | {
      type: "CART_UPDATED";
      items: CartItem[];
    }
  | {
      type: "BACK_TO_GRID";
    }
  | {
      type: "NEXT_PRODUCT";
    }
  | {
      type: "PREVIOUS_PRODUCT";
    };

export type ModelContextTool = {
  name: string;
  title?: string;
  description: string;
  inputSchema: {
    type: string;
    properties?: Record<string, any>;
    required?: string[];
    [key: string]: any;
  };
  annotations?: {
    readOnlyHint?: boolean;
    [key: string]: any;
  };
  execute: (args: any) => Promise<any> | any;
};

export interface ModelContext {
  registerTool(tool: ModelContextTool): void;
  unregisterTool(name: string): boolean;
  getTools(): ModelContextTool[];
  getTool(name: string): ModelContextTool | undefined;
  executeTool(
    name: string,
    inputArguments?: Record<string, any> | string
  ): Promise<any>;
}

export type JsonRpcRequest = {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: any;
};

export type JsonRpcResponse = {
  jsonrpc: "2.0";
  id: string | number | null;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
};
