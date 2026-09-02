import * as React from "react";
import type { MediaItem } from "../infinite-canvas/types";
import { webmcpEvents } from "../webmcp";
import styles from "./style.module.css";

const MINI_GRID_POSITIONS = [
  styles.gridCell_c1_r1,
  styles.gridCell_c3_r1,
  styles.gridCell_c4_r1,
  styles.gridCell_c1_r2,
  styles.gridCell_c3_r2,
  styles.gridCell_c2_r3,
  styles.gridCell_c4_r3,
  styles.gridCell_c1_r4,
  styles.gridCell_c3_r4,
  styles.gridCell_c3_r5,
];

type ProductDetailViewProps = {
  product: MediaItem;
  productList?: MediaItem[];
  onSelectProduct?: (product: MediaItem) => void;
  onBack: () => void;
};

export function ProductDetailView({
  product,
  productList = [],
  onSelectProduct,
  onBack,
}: ProductDetailViewProps) {
  const [selectedSize, setSelectedSize] = React.useState<string | null>(
    product.sizes && product.sizes.length > 0 ? product.sizes[0] : null
  );
  const [isAdded, setIsAdded] = React.useState(false);
  const addedTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    return () => {
      if (addedTimerRef.current) clearTimeout(addedTimerRef.current);
    };
  }, []);

  React.useEffect(() => {
    if (product.sizes && product.sizes.length > 0) {
      setSelectedSize(product.sizes[0]);
    } else {
      setSelectedSize(null);
    }
    setIsAdded(false);
  }, [product]);

  React.useEffect(() => {
    const unsubSize = webmcpEvents.on("SELECT_SIZE", (event) => {
      if (event.type === "SELECT_SIZE" && event.size) {
        setSelectedSize(event.size);
      }
    });

    const unsubAdd = webmcpEvents.on("ADD_TO_CART", (event) => {
      if (event.type === "ADD_TO_CART") {
        setIsAdded(true);
        if (addedTimerRef.current) clearTimeout(addedTimerRef.current);
        addedTimerRef.current = setTimeout(() => {
          setIsAdded(false);
        }, 2500);
      }
    });

    return () => {
      unsubSize();
      unsubAdd();
    };
  }, []);

  // Find index in productList
  const currentIndex = React.useMemo(() => {
    if (!productList.length) return 0;
    return productList.findIndex(
      (p) => (p.id && p.id === product.id) || (p.name && p.name === product.name) || p.url === product.url
    );
  }, [productList, product]);

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex !== -1 && currentIndex < productList.length - 1;

  const prevProduct = hasPrev ? productList[currentIndex - 1] : null;
  const nextProduct = hasNext ? productList[currentIndex + 1] : null;

  const handleSelectSize = (size: string) => {
    setSelectedSize(size);
    webmcpEvents.emit({
      type: "SELECT_SIZE",
      size,
    });
  };

  const handleAddToCart = () => {
    setIsAdded(true);
    webmcpEvents.emit({
      type: "ADD_TO_CART",
      product,
      size: selectedSize,
      quantity: 1,
    });
    if (addedTimerRef.current) clearTimeout(addedTimerRef.current);
    addedTimerRef.current = setTimeout(() => {
      setIsAdded(false);
    }, 2500);
  };

  const formattedIndex = (currentIndex >= 0 ? currentIndex + 1 : 1).toString().padStart(2, "0");

  return (
    <div>
      {/* Left Column: Content */}
      <div className={styles.content}>
        <div className={styles.contentItem}>
          <span className={`${styles.contentItemNumber} ${styles.oh}`}>
            <span className={styles.oh__inner}>{formattedIndex}</span>
          </span>

          <h2 className={`${styles.contentItemHeading} ${styles.oh}`}>
            <span className={styles.oh__inner}>{product.name || product.title}</span>
          </h2>

          {/* Pricing Row */}
          <div className={styles.priceRow}>
            <span className={styles.priceCurrent}>
              {product.formattedPrice || (product.price ? `$${product.price}` : "")}
            </span>
            {product.originalPrice && product.originalPrice > (product.price || 0) && (
              <span className={styles.priceOriginal}>${product.originalPrice}</span>
            )}
            {Boolean(product.discountPercentage && product.discountPercentage > 0) && (
              <span className={styles.discountBadge}>{product.discountPercentage}% OFF</span>
            )}
          </div>

          {/* Status Row */}
          <div className={styles.statusRow}>
            {product.inStock !== false ? (
              <span className={styles.inStockText}>
                ● In Stock {product.stockCount ? `(${product.stockCount} available)` : ""}
              </span>
            ) : (
              <span className={styles.outOfStockText}>● Out of Stock</span>
            )}

            {product.rating && (
              <span className={styles.ratingText}>
                ★ {product.rating} {product.reviewsCount ? `(${product.reviewsCount} reviews)` : ""}
              </span>
            )}
          </div>

          {/* Description */}
          {product.description && (
            <p className={styles.contentItemText}>{product.description}</p>
          )}

          {/* Sizing Options */}
          {product.sizes && product.sizes.length > 0 && (
            <div className={styles.optionsSection}>
              <div className={styles.optionsLabel}>Select Size</div>
              <div className={styles.sizePillRow}>
                {product.sizes.map((size) => (
                  <button
                    key={size}
                    type="button"
                    className={`${styles.sizePill} ${selectedSize === size ? styles.sizePillActive : ""}`}
                    onClick={() => handleSelectSize(size)}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Details & Specs */}
          {((product.materials && product.materials.length > 0) || (product.colors && product.colors.length > 0)) && (
            <div className={styles.specRow}>
              {product.materials?.map((mat) => (
                <span key={mat} className={styles.specBadge}>
                  {mat}
                </span>
              ))}
              {product.colors?.map((col) => (
                <span key={col} className={styles.specBadge}>
                  Color: {col}
                </span>
              ))}
            </div>
          )}

          {/* CTA Action */}
          <div className={styles.actionRow}>
            <button
              type="button"
              className={`${styles.addToBagButton} ${isAdded ? styles.addToBagButtonSuccess : ""}`}
              onClick={handleAddToCart}
            >
              {isAdded ? "✓ Added to Bag" : "Add to Bag"}
            </button>
          </div>

          {/* Signature Codrops SVG Arrow Back Button */}
          <button
            type="button"
            className={styles.back}
            onClick={onBack}
            title="Back"
          >
            <svg viewBox="0 0 50 9" width="50" height="9" fill="none" stroke="currentColor">
              <path d="M0 4.5l5-3M0 4.5l5 3M50 4.5h-77" />
            </svg>
          </button>

          {/* Mini Grid on Bottom Left (if multiple products in list) */}
          {productList.length > 1 && (
            <nav className={`${styles.grid} ${styles.gridMini}`}>
              {productList.slice(0, 10).map((item, idx) => {
                const isCurrent =
                  (item.id && item.id === product.id) ||
                  (item.name && item.name === product.name) ||
                  item.url === product.url;
                const miniPos = MINI_GRID_POSITIONS[idx % MINI_GRID_POSITIONS.length] || "";

                return (
                  <button
                    type="button"
                    key={item.id || item.url || idx}
                    className={`${styles.gridCell} ${miniPos} ${isCurrent ? styles.gridCellCurrent : ""}`}
                    onClick={() => onSelectProduct?.(item)}
                    title={item.name || item.title}
                  >
                    <div className={styles.gridCellImg}>
                      <div
                        className={styles.gridCellImgInner}
                        style={{ backgroundImage: `url(${item.url})` }}
                      />
                    </div>
                  </button>
                );
              })}
            </nav>
          )}
        </div>
      </div>

      {/* Right Column: Featured Image & Slide Navigation */}
      <div className={styles.detailMediaSection}>
        <div className={styles.featuredImageWrapper}>
          <img
            src={product.url}
            alt={product.name || product.title || "Product Showcase"}
            className={styles.featuredImage}
          />
        </div>

        {productList.length > 1 && (
          <nav className={styles.slideNav}>
            {prevProduct ? (
              <button
                type="button"
                className={styles.slideNavImg}
                style={{ backgroundImage: `url(${prevProduct.url})` }}
                onClick={() => onSelectProduct?.(prevProduct)}
                title={`Previous: ${prevProduct.name || prevProduct.title}`}
              />
            ) : (
              <div style={{ flex: 1 }} />
            )}

            {nextProduct && (
              <button
                type="button"
                className={styles.slideNavImg}
                style={{ backgroundImage: `url(${nextProduct.url})` }}
                onClick={() => onSelectProduct?.(nextProduct)}
                title={`Next: ${nextProduct.name || nextProduct.title}`}
              />
            )}
          </nav>
        )}
      </div>
    </div>
  );
}
