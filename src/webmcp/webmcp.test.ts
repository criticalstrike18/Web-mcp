import { describe, expect, it } from "bun:test";
import type { MediaItem } from "../infinite-canvas/types";
import { webmcpEvents } from "./events";
import { WebMCPServer } from "./server";

const mockProducts: MediaItem[] = [
  {
    id: "PROD-0001",
    url: "artworks/nike-jordan.jpg",
    name: "Air Jordan 1 Retro High OG 'Chicago'",
    title: "Air Jordan 1 Retro High OG 'Chicago'",
    brand: "Nike / Jordan",
    category: "Footwear",
    subcategory: "High-Top Sneakers",
    price: 180.0,
    formattedPrice: "$180.00",
    originalPrice: 220.0,
    discountPercentage: 18,
    description: "The iconic Air Jordan 1 Retro High OG combines premium leather uppers with the classic red, white, and black colorway.",
    sizes: ["US 8", "US 9", "US 10", "US 11"],
    colors: ["Chicago Red / White / Black"],
    materials: ["100% Full-Grain Calfskin Leather"],
    inStock: true,
    stockCount: 18,
    rating: 4.9,
    reviewsCount: 342,
    sku: "NK-AJ1-CHI-001",
    width: 600,
    height: 600,
  },
  {
    id: "PROD-0002",
    url: "artworks/vans-old-skool.jpg",
    name: "Old Skool Classic Suede Low Sneakers",
    title: "Old Skool Classic Suede Low Sneakers",
    brand: "Vans",
    category: "Footwear",
    subcategory: "Skate Shoes",
    price: 75.0,
    formattedPrice: "$75.00",
    originalPrice: 85.0,
    discountPercentage: 12,
    description: "Durable suede and canvas skate sneakers with signature waffle sole.",
    sizes: ["US 7", "US 8", "US 9", "US 10"],
    colors: ["Black / White"],
    materials: ["Suede", "Canvas", "Rubber"],
    inStock: true,
    stockCount: 40,
    rating: 4.7,
    reviewsCount: 512,
    sku: "VN-OSK-BLK-002",
    width: 600,
    height: 600,
  },
  {
    id: "PROD-0003",
    url: "artworks/fear-of-god-tee.jpg",
    name: "Heavyweight Boxy Fit Organic Cotton Tee",
    title: "Heavyweight Boxy Fit Organic Cotton Tee",
    brand: "Fear of God Essentials",
    category: "Apparel",
    subcategory: "T-Shirts",
    price: 55.0,
    formattedPrice: "$55.00",
    originalPrice: 65.0,
    discountPercentage: 15,
    description: "240 GSM organic cotton heavyweight boxy tee with dropped shoulders.",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Vintage White", "Washed Onyx"],
    materials: ["100% Combed Organic Cotton"],
    inStock: true,
    stockCount: 85,
    rating: 4.8,
    reviewsCount: 410,
    sku: "FOG-TEE-WHT-003",
    width: 600,
    height: 600,
  },
  {
    id: "PROD-0004",
    url: "artworks/rolex-submariner.jpg",
    name: "Submariner Date 41mm Oystersteel",
    title: "Submariner Date 41mm Oystersteel",
    brand: "Rolex",
    category: "Watches",
    subcategory: "Luxury Timepieces",
    price: 10250.0,
    formattedPrice: "$10250.00",
    originalPrice: 10250.0,
    discountPercentage: 0,
    description: "Luxury diver timepiece with black Cerachrom bezel and 3235 calibre movement.",
    sizes: ["41mm Case Diameter"],
    colors: ["Black Dial / Cerachrom Bezel"],
    materials: ["Oystersteel 904L Alloy", "Sapphire Crystal"],
    inStock: false,
    stockCount: 0,
    rating: 5.0,
    reviewsCount: 78,
    sku: "RLX-SUB-BLK-004",
    width: 600,
    height: 600,
  },
];

describe("WebMCP Server & Tools Protocol", () => {
  it("registers all default WebMCP tools", () => {
    const server = new WebMCPServer(mockProducts);
    const tools = server.getTools();
    expect(tools.length).toBe(6);

    const toolNames = tools.map((t) => t.name);
    expect(toolNames).toContain("search_products");
    expect(toolNames).toContain("focus_product");
    expect(toolNames).toContain("filter_products");
    expect(toolNames).toContain("get_product_details");
    expect(toolNames).toContain("list_categories_and_brands");
    expect(toolNames).toContain("reset_view");
  });

  it("executes search_products tool accurately with filters", async () => {
    const server = new WebMCPServer(mockProducts);

    // Search by text query
    const res1 = await server.executeTool("search_products", { query: "Jordan" });
    expect(res1.totalMatches).toBe(1);
    expect(res1.products[0].name).toContain("Jordan");

    // Search by category and price range
    const res2 = await server.executeTool("search_products", {
      category: "Footwear",
      minPrice: 50,
      maxPrice: 100,
    });
    expect(res2.totalMatches).toBe(1);
    expect(res2.products[0].brand).toBe("Vans");

    // Search with size and brand filters
    const res3 = await server.executeTool("search_products", {
      brand: "Nike",
      maxPrice: 200,
      size: "10",
    });
    expect(res3.totalMatches).toBe(1);
    expect(res3.products[0].name).toContain("Jordan");

    // Search with inStockOnly filter
    const res4 = await server.executeTool("search_products", {
      category: "Watches",
      inStockOnly: false,
    });
    expect(res4.totalMatches).toBe(1);
    expect(res4.products[0].brand).toBe("Rolex");
  });

  it("executes focus_product tool and broadcasts event", async () => {
    const server = new WebMCPServer(mockProducts);
    let capturedEvent: any = null;

    const unsubscribe = webmcpEvents.on("PRODUCT_FOCUS", (e) => {
      capturedEvent = e;
    });

    const res = await server.executeTool("focus_product", { productId: "PROD-0001" });
    expect(res.success).toBe(true);
    expect(res.product.name).toContain("Jordan");
    expect(capturedEvent).not.toBeNull();
    expect(capturedEvent.type).toBe("PRODUCT_FOCUS");
    expect(capturedEvent.product.id).toBe("PROD-0001");

    unsubscribe();
  });

  it("executes filter_products tool and broadcasts FILTER_PRODUCTS event", async () => {
    const server = new WebMCPServer(mockProducts);
    let capturedEvent: any = null;

    const unsubscribe = webmcpEvents.on("FILTER_PRODUCTS", (e) => {
      capturedEvent = e;
    });

    const res = await server.executeTool("filter_products", { category: "Footwear" });
    expect(res.totalMatches).toBe(2);
    expect(capturedEvent).not.toBeNull();
    expect(capturedEvent.products.length).toBe(2);

    unsubscribe();
  });

  it("executes get_product_details tool", async () => {
    const server = new WebMCPServer(mockProducts);
    const details = await server.executeTool("get_product_details", {
      productName: "Heavyweight Boxy",
    });

    expect(details.brand).toBe("Fear of God Essentials");
    expect(details.price).toBe(55.0);
    expect(details.sizes).toContain("M");
    expect(details.materials).toContain("100% Combed Organic Cotton");
  });

  it("executes list_categories_and_brands tool", async () => {
    const server = new WebMCPServer(mockProducts);
    const res = await server.executeTool("list_categories_and_brands", {});

    expect(res.totalProducts).toBe(4);
    expect(res.categories.some((c: any) => c.name === "Footwear")).toBe(true);
    expect(res.brands.some((b: any) => b.name === "Rolex")).toBe(true);
  });

  it("executes reset_view tool and emits RESET_VIEW event", async () => {
    const server = new WebMCPServer(mockProducts);
    let resetEmitted = false;

    const unsubscribe = webmcpEvents.on("RESET_VIEW", () => {
      resetEmitted = true;
    });

    const res = await server.executeTool("reset_view", {});
    expect(res.success).toBe(true);
    expect(resetEmitted).toBe(true);

    unsubscribe();
  });

  it("handles JSON-RPC 2.0 protocol methods (initialize, tools/list, tools/call, ping)", async () => {
    const server = new WebMCPServer(mockProducts);

    // 1. initialize
    const initRes = await server.handleJsonRpc({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
    });
    expect(initRes.result?.protocolVersion).toBe("2024-11-05");
    expect(initRes.result?.serverInfo?.name).toBe("WebMCP-Shopping-Server");

    // 2. ping
    const pingRes = await server.handleJsonRpc({
      jsonrpc: "2.0",
      id: 2,
      method: "ping",
    });
    expect(pingRes.result).toEqual({});

    // 3. tools/list
    const listRes = await server.handleJsonRpc({
      jsonrpc: "2.0",
      id: 3,
      method: "tools/list",
    });
    expect(listRes.result?.tools?.length).toBe(6);

    // 4. tools/call
    const callRes = await server.handleJsonRpc({
      jsonrpc: "2.0",
      id: 4,
      method: "tools/call",
      params: {
        name: "search_products",
        arguments: { query: "Jordan" },
      },
    });
    expect(callRes.result?.content?.[0]?.type).toBe("text");
    const parsedContent = JSON.parse(callRes.result.content[0].text);
    expect(parsedContent.totalMatches).toBe(1);
    expect(parsedContent.products[0].name).toContain("Jordan");

    // 5. Invalid method error handling
    const errRes = await server.handleJsonRpc({
      jsonrpc: "2.0",
      id: 5,
      method: "unknown/method",
    });
    expect(errRes.error?.code).toBe(-32601);
  });
});
