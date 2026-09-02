import * as React from "react";
import type { MediaItem } from "../infinite-canvas/types";
import styles from "./style.module.css";

const GRID_IMAGE_POSITIONS = [
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
  styles.gridCell_c2_r5,
  styles.gridCell_c4_r5,
];

type GridOverviewProps = {
  products: MediaItem[];
  filterInfo?: {
    query?: string;
    category?: string;
    brand?: string;
    minPrice?: number;
    maxPrice?: number;
  };
  onSelectProduct: (product: MediaItem) => void;
  onClose: () => void;
};

export function GridOverview({
  products,
  filterInfo,
  onSelectProduct,
  onClose,
}: GridOverviewProps) {
  const collectionTitle = React.useMemo(() => {
    if (filterInfo?.query) return `Search: "${filterInfo.query}"`;
    if (filterInfo?.category) return `${filterInfo.category} Collection`;
    if (filterInfo?.brand) return `${filterInfo.brand} Showcase`;
    return "Curated Collection";
  }, [filterInfo]);

  return (
    <main>
      <div className={`${styles.grid} ${styles.gridLarge}`}>
        {/* Frame Cell at c4-r2 */}
        <div className={`${styles.gridCell} ${styles.gridCellPadded} ${styles.gridCell_c4_r2}`}>
          <div className={styles.frame}>
            <h1 className={`${styles.frameTitle} ${styles.oh}`}>
              <span className={styles.oh__inner}>{collectionTitle}</span>
            </h1>
            <nav className={styles.frameLinks}>
              <button
                type="button"
                className={`${styles.frameLink} ${styles.oh}`}
                onClick={onClose}
              >
                <span className={styles.oh__inner}>← Explore 3D Canvas</span>
              </button>
            </nav>
          </div>
        </div>

        {/* Counter Cell at c2-r2 */}
        <div className={`${styles.gridCell} ${styles.gridCellPadded} ${styles.gridCell_c2_r2}`}>
          <span className={`${styles.filterBadge} ${styles.oh}`}>
            <span className={styles.oh__inner}>{products.length} Products</span>
          </span>
        </div>

        {/* Pure Image Cells without text */}
        {products.map((product, index) => {
          const posClass = GRID_IMAGE_POSITIONS[index % GRID_IMAGE_POSITIONS.length] || "";

          return (
            <button
              type="button"
              key={product.id || product.url || index}
              className={`${styles.gridCell} ${styles.gridCellClickable} ${posClass}`}
              onClick={() => onSelectProduct(product)}
              title={product.name || product.title}
            >
              <div className={styles.gridCellImg}>
                <div
                  className={styles.gridCellImgInner}
                  style={{ backgroundImage: `url(${product.url})` }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </main>
  );
}
