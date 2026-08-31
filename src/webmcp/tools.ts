import type { MediaItem } from "../infinite-canvas/types";
import { webmcpEvents } from "./events";
import type { ModelContextTool } from "./types";

export function createWebMCPTools(products: MediaItem[]): ModelContextTool[] {
  return [
    // 1. SEARCH PRODUCTS
    {
      name: "search_products",
      title: "Search Products",
      description:
        "Search and filter catalog products by text keyword, category, brand, price range, and size availability. Returns structured product matches.",
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

        const matched = products.filter((p) => {
          if (inStockOnly && p.inStock === false) return false;
          if (typeof p.price === "number") {
            if (p.price < minPrice || p.price > maxPrice) return false;
          }

          if (brandLower) {
            const pBrand = (p.brand || "").toLowerCase();
            const brandTokens = brandLower.split(/[\s/\-_,]+/).filter(Boolean);
            const brandMatches = brandTokens.some((token) => pBrand.includes(token));
            if (!brandMatches) return false;
          }

          if (categoryLower && !matchCategory(p.category, p.subcategory, categoryLower)) {
            return false;
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
            if (!hasSize) return false;
          }

          if (queryLower) {
            const combinedText = [
              p.name,
              p.title,
              p.brand,
              p.category,
              p.subcategory,
              p.description,
              ...(p.materials || []),
              ...(p.colors || []),
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();

            // Direct substring match
            if (combinedText.includes(queryLower)) {
              return true;
            }

            // Tokenized match: every word in query must appear somewhere in product text
            const queryTokens = queryLower.split(/[\s/\-_,]+/).filter(Boolean);
            if (queryTokens.length > 0) {
              const allTokensFound = queryTokens.every((token) => combinedText.includes(token));
              if (!allTokensFound) return false;
            }
          }

          return true;
        });

        const results = matched.slice(0, limit);

        // If only 1 result matched, trigger single product focus
        if (results.length === 1) {
          webmcpEvents.emit({
            type: "PRODUCT_FOCUS",
            product: results[0],
            source: "mcp",
          });
        } else if (results.length > 1) {
          // If multiple results, trigger multi-product filter view
          webmcpEvents.emit({
            type: "FILTER_PRODUCTS",
            products: results,
            filters: {
              query: args.query,
              category: args.category,
              brand: args.brand,
              minPrice: args.minPrice,
              maxPrice: args.maxPrice,
            },
            source: "mcp",
          });
        }

        return {
          totalMatches: matched.length,
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
        "Selects a specific product, smoothly animates the 3D camera to its spatial position, and opens the detailed AI generative product drawer on the right.",
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
        "Filters the catalog and displays matched items in an aesthetic multi-product shopping grid layout with full details.",
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

        const matched = products.filter((p) => {
          if (typeof p.price === "number") {
            if (p.price < minPrice || p.price > maxPrice) return false;
          }

          if (brandLower) {
            const pBrand = (p.brand || "").toLowerCase();
            const brandTokens = brandLower.split(/[\s/\-_,]+/).filter(Boolean);
            const brandMatches = brandTokens.some((token) => pBrand.includes(token));
            if (!brandMatches) return false;
          }

          if (categoryLower && !matchCategory(p.category, p.subcategory, categoryLower)) {
            return false;
          }

          if (queryLower) {
            const combinedText = [
              p.name,
              p.title,
              p.brand,
              p.category,
              p.subcategory,
              p.description,
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();

            if (combinedText.includes(queryLower)) {
              return true;
            }

            const queryTokens = queryLower.split(/[\s/\-_,]+/).filter(Boolean);
            if (queryTokens.length > 0) {
              const allTokensFound = queryTokens.every((token) => combinedText.includes(token));
              if (!allTokensFound) return false;
            }
          }

          return true;
        });

        webmcpEvents.emit({
          type: "FILTER_PRODUCTS",
          products: matched,
          filters: args,
          source: "mcp",
        });

        return {
          totalMatches: matched.length,
          filtersApplied: args,
          products: matched.slice(0, 30).map((p) => ({
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

    // 6. RESET VIEW
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
