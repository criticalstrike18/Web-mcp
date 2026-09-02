import type { MediaItem } from "../infinite-canvas/types";

export type DisplayMode = "canvas" | "grid" | "detail";

export type ProductDisplayState = {
  mode: DisplayMode;
  activeProduct: MediaItem | null;
  productList: MediaItem[];
  filterInfo?: {
    query?: string;
    category?: string;
    brand?: string;
    minPrice?: number;
    maxPrice?: number;
  };
  isTransitioning: boolean;
  isFlighting: boolean;
};
