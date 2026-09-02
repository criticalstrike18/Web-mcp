import { describe, expect, it } from "bun:test";
import type { MediaItem } from "../infinite-canvas/types";
import { webmcpEvents } from "../webmcp/events";

const sampleProducts: MediaItem[] = [
  {
    id: "PROD-0001",
    url: "artworks/nike-jordan.jpg",
    name: "Air Jordan 1 Retro High OG 'Chicago'",
    title: "Air Jordan 1 Retro High OG 'Chicago'",
    brand: "Nike / Jordan",
    category: "Footwear",
    price: 180.0,
    formattedPrice: "$180.00",
    originalPrice: 220.0,
    discountPercentage: 18,
    sizes: ["US 8", "US 9", "US 10"],
    inStock: true,
  },
  {
    id: "PROD-0002",
    url: "artworks/vans-old-skool.jpg",
    name: "Old Skool Classic Suede Low Sneakers",
    title: "Old Skool Classic Suede Low Sneakers",
    brand: "Vans",
    category: "Footwear",
    price: 75.0,
    formattedPrice: "$75.00",
    sizes: ["US 8", "US 9"],
    inStock: true,
  },
  {
    id: "PROD-0003",
    url: "artworks/fear-of-god-tee.jpg",
    name: "Heavyweight Boxy Fit Organic Cotton Tee",
    title: "Heavyweight Boxy Fit Organic Cotton Tee",
    brand: "Fear of God Essentials",
    category: "Apparel",
    price: 55.0,
    formattedPrice: "$55.00",
    sizes: ["S", "M", "L"],
    inStock: true,
  },
];

describe("GridZoom Product Display & Transitions", () => {
  it("broadcasts single product focus event for detail transition", () => {
    let received: any = null;
    const unsub = webmcpEvents.on("PRODUCT_FOCUS", (e) => {
      received = e;
    });

    webmcpEvents.emit({
      type: "PRODUCT_FOCUS",
      product: sampleProducts[0],
      source: "ui",
    });

    expect(received).not.toBeNull();
    expect(received.type).toBe("PRODUCT_FOCUS");
    expect(received.product.id).toBe("PROD-0001");
    expect(received.product.name).toContain("Air Jordan 1");

    unsub();
  });

  it("broadcasts multi-product filter event for grid transition", () => {
    let received: any = null;
    const unsub = webmcpEvents.on("FILTER_PRODUCTS", (e) => {
      received = e;
    });

    webmcpEvents.emit({
      type: "FILTER_PRODUCTS",
      products: sampleProducts,
      filters: { category: "Footwear", minPrice: 50 },
      source: "mcp",
    });

    expect(received).not.toBeNull();
    expect(received.type).toBe("FILTER_PRODUCTS");
    expect(received.products.length).toBe(3);
    expect(received.filters.category).toBe("Footwear");

    unsub();
  });

  it("broadcasts reset view event when returning to 3D canvas", () => {
    let received: any = null;
    const unsub = webmcpEvents.on("RESET_VIEW", (e) => {
      received = e;
    });

    webmcpEvents.emit({
      type: "RESET_VIEW",
      source: "ui",
    });

    expect(received).not.toBeNull();
    expect(received.type).toBe("RESET_VIEW");

    unsub();
  });

  it("calculates correct slide navigation indices for multi-product lists", () => {
    const list = sampleProducts;
    const targetProduct = list[1]; // Vans (index 1)

    const currentIndex = list.findIndex((p) => p.id === targetProduct.id);
    expect(currentIndex).toBe(1);

    const hasPrev = currentIndex > 0;
    const hasNext = currentIndex < list.length - 1;
    expect(hasPrev).toBe(true);
    expect(hasNext).toBe(true);

    const prevProduct = hasPrev ? list[currentIndex - 1] : null;
    const nextProduct = hasNext ? list[currentIndex + 1] : null;

    expect(prevProduct?.id).toBe("PROD-0001");
    expect(nextProduct?.id).toBe("PROD-0003");
  });

  it("broadcasts FOCUS_FLIGHT_COMPLETE when camera finishes flight", () => {
    let received: any = null;
    const unsub = webmcpEvents.on("FOCUS_FLIGHT_COMPLETE", (e) => {
      received = e;
    });

    webmcpEvents.emit({
      type: "FOCUS_FLIGHT_COMPLETE",
      mode: "detail",
      product: sampleProducts[0],
    });

    expect(received).not.toBeNull();
    expect(received.type).toBe("FOCUS_FLIGHT_COMPLETE");
    expect(received.mode).toBe("detail");
    expect(received.product.id).toBe("PROD-0001");

    unsub();
  });

  it("handles single product results with direct detail transition", () => {
    let focusReceived: any = null;
    const unsub = webmcpEvents.on("PRODUCT_FOCUS", (e) => {
      focusReceived = e;
    });

    // Simulate search with 1 product
    webmcpEvents.emit({
      type: "PRODUCT_FOCUS",
      product: sampleProducts[0],
      products: [sampleProducts[0]],
      source: "mcp",
    });

    expect(focusReceived).not.toBeNull();
    expect(focusReceived.type).toBe("PRODUCT_FOCUS");
    expect(focusReceived.product.id).toBe("PROD-0001");
    expect(focusReceived.products?.length).toBe(1);

    unsub();
  });

  it("broadcasts SELECT_SIZE and ADD_TO_CART events accurately", () => {
    let sizeReceived: any = null;
    let cartReceived: any = null;

    const unsubSize = webmcpEvents.on("SELECT_SIZE", (e) => {
      sizeReceived = e;
    });
    const unsubCart = webmcpEvents.on("ADD_TO_CART", (e) => {
      cartReceived = e;
    });

    webmcpEvents.emit({
      type: "SELECT_SIZE",
      size: "US 9.5",
    });

    webmcpEvents.emit({
      type: "ADD_TO_CART",
      product: sampleProducts[0],
      size: "US 9.5",
      quantity: 1,
    });

    expect(sizeReceived?.size).toBe("US 9.5");
    expect(cartReceived?.product.id).toBe("PROD-0001");
    expect(cartReceived?.size).toBe("US 9.5");

    unsubSize();
    unsubCart();
  });

  it("broadcasts NEXT_PRODUCT, PREVIOUS_PRODUCT, and BACK_TO_GRID events", () => {
    let receivedEvent: any = null;

    const unsubNext = webmcpEvents.on("NEXT_PRODUCT", (e) => {
      receivedEvent = e;
    });
    const unsubPrev = webmcpEvents.on("PREVIOUS_PRODUCT", (e) => {
      receivedEvent = e;
    });
    const unsubBack = webmcpEvents.on("BACK_TO_GRID", (e) => {
      receivedEvent = e;
    });

    webmcpEvents.emit({ type: "NEXT_PRODUCT" });
    expect(receivedEvent?.type).toBe("NEXT_PRODUCT");

    webmcpEvents.emit({ type: "PREVIOUS_PRODUCT" });
    expect(receivedEvent?.type).toBe("PREVIOUS_PRODUCT");

    webmcpEvents.emit({ type: "BACK_TO_GRID" });
    expect(receivedEvent?.type).toBe("BACK_TO_GRID");

    unsubNext();
    unsubPrev();
    unsubBack();
  });
});
