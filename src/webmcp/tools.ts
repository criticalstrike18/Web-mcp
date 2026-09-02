import type { MediaItem } from "../infinite-canvas/types";
import { cartManager } from "./cart";
import { webmcpEvents } from "./events";
import type { ModelContextTool } from "./types";

function getCanonicalProductKey(p: MediaItem): string {
  const baseName = (p.name || p.title || "")
    .replace(/\s*-\s*Edition\s*#\d+/i, "")
    .trim()
    .toLowerCase();
  return baseName || (p.id || "").toLowerCase() || p.url;
}

function deduplicateProducts(items: MediaItem[], allowExactId?: string): MediaItem[] {
  if (allowExactId) {
    const exact = items.find((p) => (p.id || "").toLowerCase() === allowExactId.toLowerCase());
    if (exact) return [exact];
  }

  const seen = new Set<string>();
  const unique: MediaItem[] = [];

  for (const item of items) {
    const key = getCanonicalProductKey(item);
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(item);
    }
  }

  return unique;
}

export function createWebMCPTools(products: MediaItem[]): ModelContextTool[] {
  return [
    // 1. SEARCH PRODUCTS
    {
      name: "search_products",
      title: "Search Products",
      description:
        "Search and filter catalog products by text keyword, category, brand, price range, and size availability. Automatically animates the 3D camera: if exactly 1 product matches, flies directly to it and opens single-product detail view; if multiple products match, flies to the 1st product and reveals the multi-product grid view. Do NOT call focus_product in a loop for multiple results.",
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Keyword to search in product title, name, description, brand, or category",
          },
          category: {
            type: "string",
            description: "Filter by category (e.g. 'Footwear', 'Apparel', 'Watches', 'Bags', 'Eyewear')",
          },
          brand: {
            type: "string",
            description: "Filter by brand name (e.g. 'Nike', 'Jordan', 'Rolex', 'Prada', 'AllSaints')",
          },
          minPrice: {
            type: "number",
            description: "Minimum price in USD",
          },
          maxPrice: {
            type: "number",
            description: "Maximum price in USD",
          },
          size: {
            type: "string",
            description: "Available size (e.g. 'US 9', 'M', 'XL')",
          },
          inStockOnly: {
            type: "boolean",
            description: "Filter only currently in-stock items (default true)",
          },
          limit: {
            type: "integer",
            description: "Maximum number of results to return (default 10)",
          },
        },
      },
      annotations: {
        readOnlyHint: true,
      },
      execute: async (args: {
        query?: string;
        category?: string;
        brand?: string;
        minPrice?: number;
        maxPrice?: number;
        size?: string;
        inStockOnly?: boolean;
        limit?: number;
      }) => {
        const queryLower = (args.query || "").trim().toLowerCase();
        const categoryLower = (args.category || "").trim().toLowerCase();
        const brandLower = (args.brand || "").trim().toLowerCase();
        const sizeQuery = (args.size || "").trim().toLowerCase();
        const minPrice = typeof args.minPrice === "number" ? args.minPrice : 0;
        const maxPrice = typeof args.maxPrice === "number" ? args.maxPrice : Number.POSITIVE_INFINITY;
        const inStockOnly = args.inStockOnly !== false;
        const limit = Math.max(1, Math.min(args.limit || 10, 50));

        // Category aliases mapping
        const categorySynonyms: Record<string, string[]> = {
          shoes: ["shoes", "footwear", "sneakers", "boots", "trainers", "loafers", "runners", "running"],
          tees: ["tees", "tee", "t-shirts", "t-shirt", "tshirts", "tshirt", "shirts", "tops", "apparel", "crewneck"],
          watches: ["watches", "watch", "timepiece", "chronograph", "diver"],
          bags: ["bags", "bag", "handbag", "handbags", "backpack", "backpacks", "tote", "totes", "duffle", "crossbody"],
        };

        const matchCategory = (prodCategory?: string, prodSub?: string, targetCat?: string) => {
          if (!targetCat) return true;
          const pCat = (prodCategory || "").toLowerCase();
          const pSub = (prodSub || "").toLowerCase();
          if (pCat.includes(targetCat) || pSub.includes(targetCat)) return true;

          for (const [key, synonyms] of Object.entries(categorySynonyms)) {
            const matchesTarget = key === targetCat || synonyms.some((s) => targetCat.includes(s) || s.includes(targetCat));
            if (matchesTarget) {
              if (pCat === key || synonyms.some((s) => pCat.includes(s) || pSub.includes(s))) {
                return true;
              }
            }
          }
          return false;
        };

        const scoredMatches: { product: MediaItem; score: number }[] = [];

        for (const p of products) {
          if (inStockOnly && p.inStock === false) continue;
          if (typeof p.price === "number") {
            if (p.price < minPrice || p.price > maxPrice) continue;
          }

          if (brandLower) {
            const pBrand = (p.brand || "").toLowerCase();
            const brandTokens = brandLower.split(/[\s/\-_,]+/).filter(Boolean);
            const brandMatches = brandTokens.some((token) => pBrand.includes(token));
            if (!brandMatches) continue;
          }

          if (categoryLower && !matchCategory(p.category, p.subcategory, categoryLower)) {
            continue;
          }

          if (sizeQuery) {
            const hasSize = (p.sizes || []).some((s) => {
              const sLower = s.toLowerCase();
              return (
                sLower.includes(sizeQuery) ||
                sLower === `us ${sizeQuery}` ||
                sLower === sizeQuery ||
                sLower.replace("us ", "") === sizeQuery
              );
            });
            if (!hasSize) continue;
          }

          if (queryLower) {
            const nameText = `${p.name || ""} ${p.title || ""}`.toLowerCase();
            const brandCatText = `${p.brand || ""} ${p.category || ""} ${p.subcategory || ""}`.toLowerCase();
            const descText = (p.description || "").toLowerCase();
            const metaText = [...(p.materials || []), ...(p.colors || [])].join(" ").toLowerCase();

            const queryTokens = queryLower.split(/[\s/\-_,]+/).filter(Boolean);

            let score = 0;

            // 1. Exact match in name / title
            if (nameText.includes(queryLower)) {
              score += 100;
            } else if (queryTokens.length > 0 && queryTokens.every((t) => nameText.includes(t))) {
              score += 70;
            } else if (brandCatText.includes(queryLower)) {
              score += 50;
            } else if (queryTokens.length > 0 && queryTokens.every((t) => (nameText + " " + brandCatText).includes(t))) {
              score += 40;
            } else if (descText.includes(queryLower) || (queryTokens.length > 0 && queryTokens.every((t) => (nameText + " " + brandCatText + " " + descText).includes(t)))) {
              score += 20;
            } else if (metaText.includes(queryLower) || (queryTokens.length > 0 && queryTokens.every((t) => (nameText + " " + brandCatText + " " + descText + " " + metaText).includes(t)))) {
              score += 5;
            } else {
              continue; // No match
            }

            scoredMatches.push({ product: p, score });
          } else {
            scoredMatches.push({ product: p, score: 1 });
          }
        }

        scoredMatches.sort((a, b) => b.score - a.score);

        let matched = scoredMatches.map((m) => m.product);
        if (queryLower && scoredMatches.length > 0) {
          const topScore = scoredMatches[0].score;
          if (topScore >= 70) {
            matched = scoredMatches.filter((m) => m.score >= 40).map((m) => m.product);
          }
        }

        const uniqueMatched = deduplicateProducts(matched, queryLower.startsWith("prod-") ? queryLower : undefined);
        const results = uniqueMatched.slice(0, limit);

        if (results.length === 1) {
          // Exactly 1 match: Focus camera directly and open single-product detail view
          webmcpEvents.emit({
            type: "PRODUCT_FOCUS",
            product: results[0],
            products: results,
            source: "mcp",
          });
        } else if (results.length > 1) {
          // Multiple matches: Fly camera to 1st product, then reveal multi-product grid view
          webmcpEvents.emit({
            type: "FILTER_PRODUCTS",
            products: results,
            filters: args,
            source: "mcp",
          });
        }

        return {
          totalMatches: uniqueMatched.length,
          returnedCount: results.length,
          products: results.map((p) => ({
            id: p.id,
            name: p.name || p.title,
            brand: p.brand,
            category: p.category,
            price: p.price,
            formattedPrice: p.formattedPrice,
            rating: p.rating,
            sizes: p.sizes,
            inStock: p.inStock,
            url: p.url,
          })),
        };
      },
    },

    // 2. FOCUS PRODUCT (3D Camera navigation + Right-side details)
    {
      name: "focus_product",
      title: "Focus and Navigate to Product",
      description:
        "Selects a specific single product, smoothly animates the 3D camera to its spatial position, and opens the single-product detail view. Use ONLY when targeting ONE specific product.",
      inputSchema: {
        type: "object",
        properties: {
          productId: {
            type: "string",
            description: "The unique ID of the product (e.g. 'PROD-0001')",
          },
          productName: {
            type: "string",
            description: "The name or title of the product to search and focus on",
          },
        },
      },
      execute: async (args: { productId?: string; productName?: string }) => {
        let found: MediaItem | undefined;

        if (args.productId) {
          found = products.find(
            (p) => (p.id || "").toLowerCase() === args.productId?.trim().toLowerCase()
          );
        }

        if (!found && args.productName) {
          const nameLower = args.productName.trim().toLowerCase();
          // 1. Direct contiguous match
          found = products.find(
            (p) =>
              (p.name || "").toLowerCase().includes(nameLower) ||
              (p.title || "").toLowerCase().includes(nameLower)
          );

          // 2. Token-based match (e.g. "Nike Pegasus 40" matching "Nike Air Zoom Pegasus 40")
          if (!found) {
            const tokens = nameLower.split(/\s+/).filter(Boolean);
            if (tokens.length > 0) {
              found = products.find((p) => {
                const combined = `${p.brand || ""} ${p.name || ""} ${p.title || ""}`.toLowerCase();
                return tokens.every((token) => combined.includes(token));
              });
            }
          }
        }

        if (!found) {
          throw new Error(
            `Product not found matching ID "${args.productId || ""}" or Name "${args.productName || ""}"`
          );
        }

        // Emit focus event to trigger camera flight and detail drawer
        webmcpEvents.emit({
          type: "PRODUCT_FOCUS",
          product: found,
          products: [found],
          source: "mcp",
        });

        return {
          success: true,
          action: "focused",
          product: {
            id: found.id,
            name: found.name || found.title,
            brand: found.brand,
            category: found.category,
            price: found.price,
            formattedPrice: found.formattedPrice,
            originalPrice: found.originalPrice,
            discountPercentage: found.discountPercentage,
            description: found.description,
            sizes: found.sizes,
            colors: found.colors,
            materials: found.materials,
            rating: found.rating,
            reviewsCount: found.reviewsCount,
            sku: found.sku,
            inStock: found.inStock,
            stockCount: found.stockCount,
            url: found.url,
          },
        };
      },
    },

    // 3. FILTER PRODUCTS VIEW (Transition to filtered grid state)
    {
      name: "filter_products",
      title: "Filter Products Grid View",
      description:
        "Filters the catalog and displays matched items in the multi-product shopping grid (or single detail view if exactly 1 match). Automatically flies 3D camera to the 1st product and opens the grid view.",
      inputSchema: {
        type: "object",
        properties: {
          category: {
            type: "string",
            description: "Category to filter (e.g. 'Footwear', 'Apparel', 'Watches')",
          },
          brand: {
            type: "string",
            description: "Brand to filter (e.g. 'Nike', 'Rolex', 'Prada')",
          },
          minPrice: {
            type: "number",
            description: "Minimum price in USD",
          },
          maxPrice: {
            type: "number",
            description: "Maximum price in USD",
          },
          query: {
            type: "string",
            description: "Optional keyword search term",
          },
        },
      },
      execute: async (args: {
        category?: string;
        brand?: string;
        minPrice?: number;
        maxPrice?: number;
        query?: string;
      }) => {
        const queryLower = (args.query || "").trim().toLowerCase();
        const categoryLower = (args.category || "").trim().toLowerCase();
        const brandLower = (args.brand || "").trim().toLowerCase();
        const minPrice = typeof args.minPrice === "number" ? args.minPrice : 0;
        const maxPrice = typeof args.maxPrice === "number" ? args.maxPrice : Number.POSITIVE_INFINITY;

        const categorySynonyms: Record<string, string[]> = {
          shoes: ["shoes", "footwear", "sneakers", "boots", "trainers", "loafers", "runners", "running"],
          tees: ["tees", "tee", "t-shirts", "t-shirt", "tshirts", "tshirt", "shirts", "tops", "apparel", "crewneck"],
          watches: ["watches", "watch", "timepiece", "chronograph", "diver"],
          bags: ["bags", "bag", "handbag", "handbags", "backpack", "backpacks", "tote", "totes", "duffle", "crossbody"],
        };

        const matchCategory = (prodCategory?: string, prodSub?: string, targetCat?: string) => {
          if (!targetCat) return true;
          const pCat = (prodCategory || "").toLowerCase();
          const pSub = (prodSub || "").toLowerCase();
          if (pCat.includes(targetCat) || pSub.includes(targetCat)) return true;

          for (const [key, synonyms] of Object.entries(categorySynonyms)) {
            const matchesTarget = key === targetCat || synonyms.some((s) => targetCat.includes(s) || s.includes(targetCat));
            if (matchesTarget) {
              if (pCat === key || synonyms.some((s) => pCat.includes(s) || pSub.includes(s))) {
                return true;
              }
            }
          }
          return false;
        };

        const scoredMatches: { product: MediaItem; score: number }[] = [];

        for (const p of products) {
          if (typeof p.price === "number") {
            if (p.price < minPrice || p.price > maxPrice) continue;
          }

          if (brandLower) {
            const pBrand = (p.brand || "").toLowerCase();
            const brandTokens = brandLower.split(/[\s/\-_,]+/).filter(Boolean);
            const brandMatches = brandTokens.some((token) => pBrand.includes(token));
            if (!brandMatches) continue;
          }

          if (categoryLower && !matchCategory(p.category, p.subcategory, categoryLower)) {
            continue;
          }

          if (queryLower) {
            const nameText = `${p.name || ""} ${p.title || ""}`.toLowerCase();
            const brandCatText = `${p.brand || ""} ${p.category || ""} ${p.subcategory || ""}`.toLowerCase();
            const descText = (p.description || "").toLowerCase();
            const metaText = [...(p.materials || []), ...(p.colors || [])].join(" ").toLowerCase();

            const queryTokens = queryLower.split(/[\s/\-_,]+/).filter(Boolean);

            let score = 0;

            if (nameText.includes(queryLower)) {
              score += 100;
            } else if (queryTokens.length > 0 && queryTokens.every((t) => nameText.includes(t))) {
              score += 70;
            } else if (brandCatText.includes(queryLower)) {
              score += 50;
            } else if (queryTokens.length > 0 && queryTokens.every((t) => (nameText + " " + brandCatText).includes(t))) {
              score += 40;
            } else if (descText.includes(queryLower) || (queryTokens.length > 0 && queryTokens.every((t) => (nameText + " " + brandCatText + " " + descText).includes(t)))) {
              score += 20;
            } else if (metaText.includes(queryLower) || (queryTokens.length > 0 && queryTokens.every((t) => (nameText + " " + brandCatText + " " + descText + " " + metaText).includes(t)))) {
              score += 5;
            } else {
              continue;
            }

            scoredMatches.push({ product: p, score });
          } else {
            scoredMatches.push({ product: p, score: 1 });
          }
        }

        scoredMatches.sort((a, b) => b.score - a.score);

        let matched = scoredMatches.map((m) => m.product);
        if (queryLower && scoredMatches.length > 0) {
          const topScore = scoredMatches[0].score;
          if (topScore >= 70) {
            matched = scoredMatches.filter((m) => m.score >= 40).map((m) => m.product);
          }
        }

        const uniqueMatched = deduplicateProducts(matched, queryLower.startsWith("prod-") ? queryLower : undefined);
        const results = uniqueMatched.slice(0, 30);

        // Single result: route directly to product focus (skip grid entirely)
        if (results.length === 1) {
          webmcpEvents.emit({
            type: "PRODUCT_FOCUS",
            product: results[0],
            products: results,
            source: "mcp",
          });
        } else if (results.length > 1) {
          webmcpEvents.emit({
            type: "FILTER_PRODUCTS",
            products: results,
            filters: args,
            source: "mcp",
          });
        }

        return {
          totalMatches: uniqueMatched.length,
          filtersApplied: args,
          products: results.map((p) => ({
            id: p.id,
            name: p.name || p.title,
            brand: p.brand,
            category: p.category,
            price: p.price,
            formattedPrice: p.formattedPrice,
            sizes: p.sizes,
            inStock: p.inStock,
            url: p.url,
          })),
        };
      },
    },

    // 4. GET PRODUCT DETAILS
    {
      name: "get_product_details",
      title: "Get Full Product Details",
      description: "Returns the comprehensive technical, sizing, pricing, and material specifications for a product.",
      inputSchema: {
        type: "object",
        properties: {
          productId: {
            type: "string",
            description: "Product ID (e.g. 'PROD-0001')",
          },
          productName: {
            type: "string",
            description: "Product name to search",
          },
        },
      },
      annotations: {
        readOnlyHint: true,
      },
      execute: async (args: { productId?: string; productName?: string }) => {
        let found: MediaItem | undefined;

        if (args.productId) {
          found = products.find(
            (p) => (p.id || "").toLowerCase() === args.productId?.trim().toLowerCase()
          );
        }

        if (!found && args.productName) {
          const nameLower = args.productName.trim().toLowerCase();
          // 1. Direct contiguous match
          found = products.find(
            (p) =>
              (p.name || "").toLowerCase().includes(nameLower) ||
              (p.title || "").toLowerCase().includes(nameLower)
          );

          // 2. Token-based match
          if (!found) {
            const tokens = nameLower.split(/\s+/).filter(Boolean);
            if (tokens.length > 0) {
              found = products.find((p) => {
                const combined = `${p.brand || ""} ${p.name || ""} ${p.title || ""}`.toLowerCase();
                return tokens.every((token) => combined.includes(token));
              });
            }
          }
        }

        if (!found) {
          throw new Error(`Product not found with criteria: ${JSON.stringify(args)}`);
        }

        return {
          id: found.id,
          name: found.name || found.title,
          brand: found.brand,
          category: found.category,
          subcategory: found.subcategory,
          price: found.price,
          formattedPrice: found.formattedPrice,
          originalPrice: found.originalPrice,
          discountPercentage: found.discountPercentage,
          description: found.description,
          sizes: found.sizes,
          colors: found.colors,
          materials: found.materials,
          inStock: found.inStock,
          stockCount: found.stockCount,
          rating: found.rating,
          reviewsCount: found.reviewsCount,
          sku: found.sku,
          width: found.width,
          height: found.height,
          aspectRatio: found.aspectRatio,
        };
      },
    },

    // 5. LIST CATEGORIES AND BRANDS
    {
      name: "list_categories_and_brands",
      title: "List Categories & Brands",
      description: "Returns all unique product categories, subcategories, brands, and price ranges available in the catalog.",
      inputSchema: {
        type: "object",
        properties: {},
      },
      annotations: {
        readOnlyHint: true,
      },
      execute: async () => {
        const categories = new Map<string, number>();
        const brands = new Map<string, number>();
        let minPrice = Number.POSITIVE_INFINITY;
        let maxPrice = Number.NEGATIVE_INFINITY;

        for (const p of products) {
          if (p.category) {
            categories.set(p.category, (categories.get(p.category) || 0) + 1);
          }
          if (p.brand) {
            brands.set(p.brand, (brands.get(p.brand) || 0) + 1);
          }
          if (typeof p.price === "number") {
            if (p.price < minPrice) minPrice = p.price;
            if (p.price > maxPrice) maxPrice = p.price;
          }
        }

        return {
          totalProducts: products.length,
          priceRange: {
            min: minPrice === Number.POSITIVE_INFINITY ? 0 : minPrice,
            max: maxPrice === Number.NEGATIVE_INFINITY ? 0 : maxPrice,
          },
          categories: Array.from(categories.entries()).map(([name, count]) => ({ name, count })),
          brands: Array.from(brands.entries()).map(([name, count]) => ({ name, count })),
        };
      },
    },

    // 6. SELECT PRODUCT SIZE
    {
      name: "select_product_size",
      title: "Select Product Size",
      description: "Selects a size (e.g. 'US 9', 'M', 'XL', '41mm') for the currently focused product.",
      inputSchema: {
        type: "object",
        properties: {
          size: {
            type: "string",
            description: "The size to select (e.g. 'US 9', 'US 10', 'M', 'L', 'XL')",
          },
        },
        required: ["size"],
      },
      execute: async (args: { size: string }) => {
        if (!args.size) {
          throw new Error("Missing required 'size' parameter");
        }
        webmcpEvents.emit({
          type: "SELECT_SIZE",
          size: args.size,
        });
        return {
          success: true,
          selectedSize: args.size,
        };
      },
    },

    // 7. ADD TO CART
    {
      name: "add_to_cart",
      title: "Add Product to Bag / Cart",
      description: "Adds a product and chosen size to the shopping bag. Can target a specific productId or the currently focused product.",
      inputSchema: {
        type: "object",
        properties: {
          productId: {
            type: "string",
            description: "Optional product ID (e.g. 'PROD-0001'). If omitted, adds the currently focused product.",
          },
          productName: {
            type: "string",
            description: "Optional product name to look up and add",
          },
          size: {
            type: "string",
            description: "Chosen size (e.g. 'US 9', 'M', 'XL')",
          },
          quantity: {
            type: "integer",
            description: "Quantity to add (default 1)",
          },
        },
      },
      execute: async (args: {
        productId?: string;
        productName?: string;
        size?: string;
        quantity?: number;
      }) => {
        let targetProduct: MediaItem | undefined;

        if (args.productId) {
          targetProduct = products.find(
            (p) => (p.id || "").toLowerCase() === args.productId?.trim().toLowerCase()
          );
        } else if (args.productName) {
          const nameLower = args.productName.trim().toLowerCase();
          targetProduct = products.find(
            (p) =>
              (p.name || "").toLowerCase().includes(nameLower) ||
              (p.title || "").toLowerCase().includes(nameLower)
          );
        }

        if (!targetProduct) {
          const history = webmcpEvents.getHistory();
          for (let i = history.length - 1; i >= 0; i--) {
            const ev = history[i];
            if (ev.type === "PRODUCT_FOCUS" && ev.product) {
              targetProduct = ev.product;
              break;
            }
          }
        }

        if (!targetProduct && products.length > 0) {
          targetProduct = products[0];
        }

        if (!targetProduct) {
          throw new Error("No product available to add to cart");
        }

        const quantity = Math.max(1, args.quantity || 1);
        const chosenSize =
          args.size ||
          (targetProduct.sizes && targetProduct.sizes.length > 0 ? targetProduct.sizes[0] : null);

        webmcpEvents.emit({
          type: "ADD_TO_CART",
          product: targetProduct,
          size: chosenSize,
          quantity,
        });

        const targetId = targetProduct.id || targetProduct.sku || targetProduct.url;
        const cartItem =
          cartManager.getItems().find((i) => i.productId === targetId && i.size === chosenSize) || {
            productId: targetId,
            size: chosenSize,
            quantity,
          };

        return {
          success: true,
          addedItem: {
            productId: cartItem.productId,
            name: targetProduct.name || targetProduct.title,
            size: cartItem.size,
            quantity: cartItem.quantity,
            price: targetProduct.price,
            formattedPrice: targetProduct.formattedPrice,
          },
          cartTotalCount: cartManager.getTotalCount(),
          cartSubtotal: cartManager.getSubtotal(),
          formattedSubtotal: `$${cartManager.getSubtotal().toFixed(2)}`,
        };
      },
    },

    // 8. GET CART
    {
      name: "get_cart",
      title: "Get Shopping Cart",
      description: "Returns all items currently in the user's shopping bag, total quantity count, and subtotal calculation.",
      inputSchema: {
        type: "object",
        properties: {},
      },
      annotations: {
        readOnlyHint: true,
      },
      execute: async () => {
        const items = cartManager.getItems();
        const totalCount = cartManager.getTotalCount();
        const subtotal = cartManager.getSubtotal();

        return {
          totalCount,
          subtotal,
          formattedSubtotal: `$${subtotal.toFixed(2)}`,
          items: items.map((i) => ({
            productId: i.productId,
            name: i.product.name || i.product.title,
            brand: i.product.brand,
            size: i.size,
            quantity: i.quantity,
            price: i.product.price,
            formattedPrice: i.product.formattedPrice,
          })),
        };
      },
    },

    // 9. NAVIGATE PRODUCT
    {
      name: "navigate_product",
      title: "Navigate Product in Collection",
      description: "Navigates between products in the current list: 'next' for next product, 'previous' for previous product, or 'back' to return to the grid overview.",
      inputSchema: {
        type: "object",
        properties: {
          direction: {
            type: "string",
            enum: ["next", "previous", "back"],
            description: "Direction to navigate: 'next', 'previous', or 'back'",
          },
        },
        required: ["direction"],
      },
      execute: async (args: { direction: "next" | "previous" | "back" }) => {
        if (args.direction === "next") {
          webmcpEvents.emit({ type: "NEXT_PRODUCT" });
        } else if (args.direction === "previous") {
          webmcpEvents.emit({ type: "PREVIOUS_PRODUCT" });
        } else if (args.direction === "back") {
          webmcpEvents.emit({ type: "BACK_TO_GRID" });
        } else {
          throw new Error(`Invalid direction: ${args.direction}. Expected 'next', 'previous', or 'back'`);
        }

        return {
          success: true,
          action: args.direction,
        };
      },
    },

    // 10. RESET VIEW
    {
      name: "reset_view",
      title: "Reset View to Explore Mode",
      description: "Closes any active product drawers or filter overlays and returns the 3D camera to ambient infinite canvas exploration mode.",
      inputSchema: {
        type: "object",
        properties: {},
      },
      execute: async () => {
        webmcpEvents.emit({
          type: "RESET_VIEW",
          source: "mcp",
        });
        return {
          success: true,
          mode: "explore",
        };
      },
    },
  ];
}
