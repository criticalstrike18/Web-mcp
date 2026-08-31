import { describe, expect, it } from "bun:test";
import manifest from "../artworks/manifest.json";
import { findNearestProductPlane } from "./utils";

describe("3D Camera Product Navigation Engine", () => {
  it("finds spatial 3D coordinates for all sample products", () => {
    const totalCount = manifest.length;
    expect(totalCount).toBeGreaterThan(0);

    for (let i = 0; i < Math.min(20, totalCount); i++) {
      const location = findNearestProductPlane(i, totalCount, 0, 0, 0, 6);
      expect(location).not.toBeNull();
      expect(location?.position.x).toBeDefined();
      expect(location?.position.y).toBeDefined();
      expect(location?.position.z).toBeDefined();
      expect(typeof location?.cx).toBe("number");
      expect(typeof location?.cy).toBe("number");
      expect(typeof location?.cz).toBe("number");
    }
  });

  it("finds nearest plane relative to camera position", () => {
    const totalCount = manifest.length;
    const originLocation = findNearestProductPlane(0, totalCount, 0, 0, 0, 6);
    const movedLocation = findNearestProductPlane(0, totalCount, 3, -2, 4, 6);

    expect(originLocation).not.toBeNull();
    expect(movedLocation).not.toBeNull();

    // Distance from start chunk to movedLocation should be within radius
    const chunkDist = Math.max(
      Math.abs(movedLocation!.cx - 3),
      Math.abs(movedLocation!.cy - (-2)),
      Math.abs(movedLocation!.cz - 4)
    );
    expect(chunkDist).toBeLessThanOrEqual(6);
  });

  it("handles invalid indices gracefully", () => {
    const totalCount = manifest.length;
    const neg = findNearestProductPlane(-1, totalCount, 0, 0, 0, 6);
    expect(neg).toBeNull();

    const empty = findNearestProductPlane(0, 0, 0, 0, 0, 6);
    expect(empty).toBeNull();
  });
});
