import type { MediaItem } from "../infinite-canvas/types";
import { webmcpEvents } from "./events";
import type { CartItem } from "./types";

class CartManager {
  private items: CartItem[] = [];

  constructor() {
    webmcpEvents.on("ADD_TO_CART", (event) => {
      if (event.type === "ADD_TO_CART" && event.product) {
        this.addItem(event.product, event.size, event.quantity || 1, false);
      }
    });
  }

  public getItems(): CartItem[] {
    return [...this.items];
  }

  public addItem(
    product: MediaItem,
    size?: string | null,
    quantity = 1,
    shouldEmit = true
  ): CartItem {
    const chosenSize = size || (product.sizes && product.sizes.length > 0 ? product.sizes[0] : null);
    const existingIndex = this.items.findIndex(
      (item) =>
        ((item.productId && item.productId === product.id) || item.product.url === product.url) &&
        item.size === chosenSize
    );

    if (existingIndex >= 0) {
      this.items[existingIndex].quantity += quantity;
      if (shouldEmit) this.emitUpdate();
      return this.items[existingIndex];
    }

    const newItem: CartItem = {
      productId: product.id || product.sku || product.url,
      product,
      size: chosenSize,
      quantity,
      addedAt: Date.now(),
    };

    this.items.push(newItem);
    if (shouldEmit) this.emitUpdate();
    return newItem;
  }

  public removeItem(productId: string, size?: string | null): boolean {
    const prevLength = this.items.length;
    this.items = this.items.filter(
      (item) => !(item.productId === productId && (size === undefined || item.size === size))
    );
    if (this.items.length !== prevLength) {
      this.emitUpdate();
      return true;
    }
    return false;
  }

  public clearCart(): void {
    this.items = [];
    this.emitUpdate();
  }

  public getTotalCount(): number {
    return this.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  public getSubtotal(): number {
    return this.items.reduce((sum, item) => sum + (item.product.price || 0) * item.quantity, 0);
  }

  private emitUpdate(): void {
    webmcpEvents.emit({
      type: "CART_UPDATED",
      items: this.getItems(),
    });
  }
}

export const cartManager = new CartManager();
