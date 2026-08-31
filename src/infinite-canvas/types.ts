import type * as THREE from "three";

export type MediaItem = {
  id?: string;
  url: string;
  name?: string;
  title?: string;
  brand?: string;
  category?: string;
  subcategory?: string;
  price?: number;
  formattedPrice?: string;
  originalPrice?: number;
  discountPercentage?: number;
  description?: string;
  sizes?: string[];
  colors?: string[];
  materials?: string[];
  inStock?: boolean;
  stockCount?: number;
  rating?: number;
  reviewsCount?: number;
  sku?: string;
  link?: string;
  width: number;
  height: number;
  aspectRatio?: number;
  [key: string]: any;
};

export type InfiniteCanvasProps = {
  media: MediaItem[];
  onTextureProgress?: (progress: number) => void;
  showFps?: boolean;
  showControls?: boolean;
  cameraFov?: number;
  cameraNear?: number;
  cameraFar?: number;
  fogNear?: number;
  fogFar?: number;
  backgroundColor?: string;
  fogColor?: string;
};

export type ChunkData = {
  key: string;
  cx: number;
  cy: number;
  cz: number;
};

export type PlaneData = {
  id: string;
  position: THREE.Vector3;
  scale: THREE.Vector3;
  mediaIndex: number;
};
