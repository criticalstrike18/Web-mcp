import * as React from "react";
import type { MediaItem } from "../infinite-canvas/types";
import { webmcpEvents } from "../webmcp";
import { GridOverview } from "./GridOverview";
import { ProductDetailView } from "./ProductDetailView";
import styles from "./style.module.css";
import type { ProductDisplayState } from "./types";

export function ProductDisplayManager() {
  const [state, setState] = React.useState<ProductDisplayState>({
    mode: "canvas",
    activeProduct: null,
    productList: [],
    filterInfo: undefined,
    isTransitioning: false,
    isFlighting: false,
  });

  const stateRef = React.useRef(state);
  stateRef.current = state;

  const flightTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const transitionTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    return () => {
      if (flightTimerRef.current) clearTimeout(flightTimerRef.current);
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    };
  }, []);

  const handleClose = React.useCallback(() => {
    webmcpEvents.emit({ type: "RESET_VIEW", source: "ui" });
  }, []);

  const handleSelectProduct = React.useCallback((product: MediaItem) => {
    setState((prev) => ({
      ...prev,
      activeProduct: product,
      mode: "detail",
      isFlighting: false,
      isTransitioning: false,
    }));

    // Broadcast focus for 3D camera sync
    webmcpEvents.emit({
      type: "PRODUCT_FOCUS",
      product,
      products: stateRef.current.productList,
      source: "ui",
    });
  }, []);

  React.useEffect(() => {
    // 1. PRODUCT FOCUS → 3D camera flies to the product; detail drawer appears ONLY on arrival
    const unsubFocus = webmcpEvents.on("PRODUCT_FOCUS", (event) => {
      if (event.type !== "PRODUCT_FOCUS" || !event.product) return;

      if (flightTimerRef.current) clearTimeout(flightTimerRef.current);

      const targetList =
        event.products && event.products.length > 0
          ? event.products
          : event.source === "ui" && stateRef.current.productList.length > 0
            ? stateRef.current.productList
            : [event.product];

      // If user is already viewing the UI (in detail or grid mode) or triggered from UI:
      // Stay in detail mode directly to avoid flickering while camera tracks in background
      if (event.source === "ui" || stateRef.current.mode !== "canvas") {
        setState((prev) => ({
          ...prev,
          mode: "detail",
          activeProduct: event.product,
          productList: targetList,
          isFlighting: false,
          isTransitioning: false,
        }));
        return;
      }

      // Starting from canvas: keep overlay hidden during flight
      setState({
        mode: "canvas",
        isFlighting: true,
        isTransitioning: false,
        activeProduct: event.product,
        productList: targetList,
        filterInfo: undefined,
      });

      // Safety fallback: snap to detail after timeout if flight complete never fires
      flightTimerRef.current = setTimeout(() => {
        setState((prev) => {
          if (!prev.isFlighting) return prev;
          return {
            mode: "detail",
            activeProduct: event.product,
            productList: targetList,
            filterInfo: undefined,
            isFlighting: false,
            isTransitioning: false,
          };
        });
      }, 2000);
    });

    // 2. FILTER PRODUCTS → 3D camera flies to 1st product first; grid appears ONLY on arrival
    const unsubFilter = webmcpEvents.on("FILTER_PRODUCTS", (event) => {
      if (event.type !== "FILTER_PRODUCTS" || !event.products.length) return;

      if (flightTimerRef.current) clearTimeout(flightTimerRef.current);

      const isSingle = event.products.length === 1;

      if (isSingle) {
        // Exactly 1 product: Route directly to single product focus & detail page!
        webmcpEvents.emit({
          type: "PRODUCT_FOCUS",
          product: event.products[0],
          products: event.products,
          source: event.source || "mcp",
        });
        return;
      }

      // MULTI-PRODUCT: If triggered while already in grid/detail mode, update immediately without canvas flicker
      if (stateRef.current.mode !== "canvas") {
        setState((prev) => ({
          ...prev,
          mode: "grid",
          activeProduct: event.products[0],
          productList: event.products,
          filterInfo: event.filters,
          isFlighting: false,
          isTransitioning: false,
        }));
        return;
      }

      // Starting from canvas: keep overlay hidden in 'canvas' mode during flight to 1st product
      setState({
        mode: "canvas",
        isFlighting: true,
        isTransitioning: false,
        activeProduct: event.products[0],
        productList: event.products,
        filterInfo: event.filters,
      });

      // Safety fallback: snap to grid after timeout if flight complete never fires
      flightTimerRef.current = setTimeout(() => {
        setState((prev) => {
          if (!prev.isFlighting) return prev;
          return {
            mode: "grid",
            activeProduct: event.products[0],
            productList: event.products,
            filterInfo: event.filters,
            isFlighting: false,
            isTransitioning: false,
          };
        });
      }, 2000);
    });

    // 3. FOCUS FLIGHT COMPLETE — Camera has arrived at the 1st / target product
    const unsubFlightComplete = webmcpEvents.on("FOCUS_FLIGHT_COMPLETE", (event) => {
      if (event.type !== "FOCUS_FLIGHT_COMPLETE") return;

      if (flightTimerRef.current) clearTimeout(flightTimerRef.current);

      const targetList =
        event.products && event.products.length > 0
          ? event.products
          : event.product
            ? [event.product]
            : stateRef.current.productList;

      const targetProduct =
        event.product || (targetList.length > 0 ? targetList[0] : stateRef.current.activeProduct);

      // Single product = always detail; multi-product filter = grid
      const isSingle = targetList.length <= 1;
      const targetMode = event.mode || (isSingle ? "detail" : "grid");

      setState((prev) => ({
        ...prev,
        mode: targetMode,
        activeProduct: targetProduct,
        productList: targetList.length > 0 ? targetList : prev.productList,
        isFlighting: false,
        isTransitioning: false,
      }));
    });

    // 4. NEXT PRODUCT in list
    const unsubNext = webmcpEvents.on("NEXT_PRODUCT", (event) => {
      if (event.type !== "NEXT_PRODUCT") return;
      const current = stateRef.current;
      if (!current.productList.length || !current.activeProduct) return;

      const idx = current.productList.findIndex(
        (p) => (p.id && p.id === current.activeProduct?.id) || p.url === current.activeProduct?.url
      );
      if (idx >= 0 && idx < current.productList.length - 1) {
        handleSelectProduct(current.productList[idx + 1]);
      }
    });

    // 5. PREVIOUS PRODUCT in list
    const unsubPrev = webmcpEvents.on("PREVIOUS_PRODUCT", (event) => {
      if (event.type !== "PREVIOUS_PRODUCT") return;
      const current = stateRef.current;
      if (!current.productList.length || !current.activeProduct) return;

      const idx = current.productList.findIndex(
        (p) => (p.id && p.id === current.activeProduct?.id) || p.url === current.activeProduct?.url
      );
      if (idx > 0) {
        handleSelectProduct(current.productList[idx - 1]);
      }
    });

    // 6. BACK TO GRID
    const unsubBackToGrid = webmcpEvents.on("BACK_TO_GRID", (event) => {
      if (event.type !== "BACK_TO_GRID") return;
      if (stateRef.current.productList.length > 1) {
        setState((prev) => ({ ...prev, mode: "grid" }));
      } else {
        handleClose();
      }
    });

    // 7. UI STATE CHANGED (e.g. flight cancelled by user drag/zoom)
    const unsubStateChanged = webmcpEvents.on("UI_STATE_CHANGED", (event) => {
      if (event.type !== "UI_STATE_CHANGED") return;
      if (event.state?.isFlighting === false && flightTimerRef.current) {
        clearTimeout(flightTimerRef.current);
        setState((prev) => ({ ...prev, isFlighting: false }));
      }
    });

    // 8. RESET VIEW → Animate out and return to 3D exploration
    const unsubReset = webmcpEvents.on("RESET_VIEW", (event) => {
      if (event.type !== "RESET_VIEW") return;

      if (flightTimerRef.current) clearTimeout(flightTimerRef.current);
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);

      setState((prev) => {
        if (prev.mode === "canvas" && !prev.isTransitioning && !prev.isFlighting) {
          return prev;
        }
        return {
          ...prev,
          isTransitioning: true,
        };
      });

      transitionTimerRef.current = setTimeout(() => {
        setState({
          mode: "canvas",
          activeProduct: null,
          productList: [],
          filterInfo: undefined,
          isTransitioning: false,
          isFlighting: false,
        });
      }, 350);
    });

    return () => {
      unsubFocus();
      unsubFilter();
      unsubFlightComplete();
      unsubNext();
      unsubPrev();
      unsubBackToGrid();
      unsubStateChanged();
      unsubReset();
    };
  }, [handleClose, handleSelectProduct]);

  // Keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const current = stateRef.current;
      if (e.key === "Escape") {
        if (current.mode === "detail" && current.productList.length > 1) {
          setState((prev) => ({ ...prev, mode: "grid" }));
        } else if (current.mode !== "canvas") {
          handleClose();
        }
      } else if (e.key === "ArrowRight" && current.mode === "detail" && current.productList.length > 1) {
        const idx = current.productList.findIndex(
          (p) => (p.id && p.id === current.activeProduct?.id) || p.url === current.activeProduct?.url
        );
        if (idx >= 0 && idx < current.productList.length - 1) {
          handleSelectProduct(current.productList[idx + 1]);
        }
      } else if (e.key === "ArrowLeft" && current.mode === "detail" && current.productList.length > 1) {
        const idx = current.productList.findIndex(
          (p) => (p.id && p.id === current.activeProduct?.id) || p.url === current.activeProduct?.url
        );
        if (idx > 0) {
          handleSelectProduct(current.productList[idx - 1]);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleClose, handleSelectProduct]);

  const handleBackFromDetail = () => {
    if (stateRef.current.productList.length > 1) {
      setState((prev) => ({
        ...prev,
        mode: "grid",
      }));
    } else {
      handleClose();
    }
  };

  const isOverlayActive = state.mode !== "canvas" && !state.isTransitioning && !state.isFlighting;

  // Single-product: ONLY render detail view when explicitly in 'detail' mode
  const shouldRenderDetail = state.mode === "detail" && Boolean(state.activeProduct);

  // Multi-product: ONLY render grid view when explicitly in 'grid' mode with multiple products
  const shouldRenderGrid = state.mode === "grid" && state.productList.length > 1;

  return (
    <div
      className={`${styles.container} ${isOverlayActive ? styles.containerActive : ""}`}
      aria-hidden={!isOverlayActive}
    >
      {/* Multi-Product Grid View (ONLY rendered when in grid mode with multiple items) */}
      {shouldRenderGrid && (
        <GridOverview
          products={state.productList}
          filterInfo={state.filterInfo}
          onSelectProduct={handleSelectProduct}
          onClose={handleClose}
        />
      )}

      {/* Single-Product Detail View (ONLY rendered when in detail mode) */}
      {shouldRenderDetail && state.activeProduct && (
        <ProductDetailView
          product={state.activeProduct}
          productList={state.productList}
          onSelectProduct={handleSelectProduct}
          onBack={handleBackFromDetail}
        />
      )}
    </div>
  );
}
