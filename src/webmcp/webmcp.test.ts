import { describe, expect, it } from "bun:test";
import type { MediaItem } from "../infinite-canvas/types";
import { cartManager } from "./cart";
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
    expect(tools.length).toBe(10);

    const toolNames = tools.map((t) => t.name);
    expect(toolNames).toContain("search_products");
    expect(toolNames).toContain("focus_product");
    expect(toolNames).toContain("filter_products");
    expect(toolNames).toContain("get_product_details");
    expect(toolNames).toContain("list_categories_and_brands");
    expect(toolNames).toContain("select_product_size");
    expect(toolNames).toContain("add_to_cart");
    expect(toolNames).toContain("get_cart");
    expect(toolNames).toContain("navigate_product");
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

  it("executes search_products and routes single match to PRODUCT_FOCUS and multi match to FILTER_PRODUCTS", async () => {
    const server = new WebMCPServer(mockProducts);

    // 1. Single match -> Emits PRODUCT_FOCUS
    let singleFocusEvent: any = null;
    let singleFilterEvent: any = null;
    const unsubFocus = webmcpEvents.on("PRODUCT_FOCUS", (e) => {
      singleFocusEvent = e;
    });
    const unsubFilter = webmcpEvents.on("FILTER_PRODUCTS", (e) => {
      singleFilterEvent = e;
    });

    const singleRes = await server.executeTool("search_products", { query: "Jordan" });
    expect(singleRes.totalMatches).toBe(1);
    expect(singleFocusEvent).not.toBeNull();
    expect(singleFocusEvent.type).toBe("PRODUCT_FOCUS");
    expect(singleFocusEvent.product.name).toContain("Jordan");
    expect(singleFilterEvent).toBeNull();

    unsubFocus();
    unsubFilter();

    // 2. Multi match -> Emits FILTER_PRODUCTS (for 1st product camera flight -> grid overview)
    let multiFocusEvent: any = null;
    let multiFilterEvent: any = null;
    const unsubFocus2 = webmcpEvents.on("PRODUCT_FOCUS", (e) => {
      multiFocusEvent = e;
    });
    const unsubFilter2 = webmcpEvents.on("FILTER_PRODUCTS", (e) => {
      multiFilterEvent = e;
    });

    const multiRes = await server.executeTool("search_products", { category: "Footwear" });
    expect(multiRes.totalMatches).toBe(2);
    expect(multiFilterEvent).not.toBeNull();
    expect(multiFilterEvent.type).toBe("FILTER_PRODUCTS");
    expect(multiFilterEvent.products.length).toBe(2);
    expect(multiFocusEvent).toBeNull();

    unsubFocus2();
    unsubFilter2();
  });

  it("executes filter_products tool and broadcasts FILTER_PRODUCTS for multi-products", async () => {
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

  it("executes filter_products tool and broadcasts PRODUCT_FOCUS when exactly 1 match", async () => {
    const server = new WebMCPServer(mockProducts);
    let capturedFocus: any = null;
    let capturedFilter: any = null;

    const unsubFocus = webmcpEvents.on("PRODUCT_FOCUS", (e) => {
      capturedFocus = e;
    });
    const unsubFilter = webmcpEvents.on("FILTER_PRODUCTS", (e) => {
      capturedFilter = e;
    });

    const res = await server.executeTool("filter_products", { brand: "Rolex" });
    expect(res.totalMatches).toBe(1);
    expect(capturedFocus).not.toBeNull();
    expect(capturedFocus.product.brand).toBe("Rolex");
    expect(capturedFilter).toBeNull();

    unsubFocus();
    unsubFilter();
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

  it("executes select_product_size tool and broadcasts SELECT_SIZE event", async () => {
    const server = new WebMCPServer(mockProducts);
    let capturedEvent: any = null;

    const unsubscribe = webmcpEvents.on("SELECT_SIZE", (e) => {
      capturedEvent = e;
    });

    const res = await server.executeTool("select_product_size", { size: "US 10.5" });
    expect(res.success).toBe(true);
    expect(res.selectedSize).toBe("US 10.5");
    expect(capturedEvent).not.toBeNull();
    expect(capturedEvent.size).toBe("US 10.5");

    unsubscribe();
  });

  it("executes add_to_cart and get_cart tools accurately", async () => {
    cartManager.clearCart();
    const server = new WebMCPServer(mockProducts);

    const addRes = await server.executeTool("add_to_cart", {
      productId: "PROD-0001",
      size: "US 9",
      quantity: 2,
    });
    expect(addRes.success).toBe(true);
    expect(addRes.addedItem.name).toContain("Jordan");
    expect(addRes.addedItem.quantity).toBe(2);
    expect(addRes.cartTotalCount).toBeGreaterThanOrEqual(2);

    const cartRes = await server.executeTool("get_cart", {});
    expect(cartRes.totalCount).toBeGreaterThanOrEqual(2);
    expect(cartRes.items.some((i: any) => i.productId === "PROD-0001")).toBe(true);
  });

  it("executes navigate_product tool with direction options", async () => {
    const server = new WebMCPServer(mockProducts);
    let lastEvent: any = null;

    const unsubNext = webmcpEvents.on("NEXT_PRODUCT", (e) => {
      lastEvent = e;
    });
    const unsubPrev = webmcpEvents.on("PREVIOUS_PRODUCT", (e) => {
      lastEvent = e;
    });
    const unsubBack = webmcpEvents.on("BACK_TO_GRID", (e) => {
      lastEvent = e;
    });

    await server.executeTool("navigate_product", { direction: "next" });
    expect(lastEvent?.type).toBe("NEXT_PRODUCT");

    await server.executeTool("navigate_product", { direction: "previous" });
    expect(lastEvent?.type).toBe("PREVIOUS_PRODUCT");

    await server.executeTool("navigate_product", { direction: "back" });
    expect(lastEvent?.type).toBe("BACK_TO_GRID");

    unsubNext();
    unsubPrev();
    unsubBack();
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
    expect(listRes.result?.tools?.length).toBe(10);

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
