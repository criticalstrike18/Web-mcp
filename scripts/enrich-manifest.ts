import fs from "node:fs";

const manifestPathSrc = "./src/artworks/manifest.json";
const manifestPathPub = "./public/artworks/manifest.json";

const manifest = JSON.parse(fs.readFileSync(manifestPathSrc, "utf-8"));

const runningShoes = [
  {
    name: "Nike Air Zoom Pegasus 40 Road Running Shoes",
    brand: "Nike",
    category: "Footwear",
    subcategory: "Running Shoes",
    price: 130.0,
    formattedPrice: "$130.00",
    originalPrice: 140.0,
    discountPercentage: 7,
    description:
      "A springy ride for every run, the Pegasus familiar feel returns to help you crush your running goals. Features single-layer mesh upper with dual Zoom Air units for an energized, responsive toe-off.",
    sizes: ["US 7", "US 7.5", "US 8", "US 8.5", "US 9", "US 9.5", "US 10", "US 10.5", "US 11", "US 12"],
    colors: ["Black / White / University Red", "Pure Platinum / Royal", "Triple Black"],
    materials: ["Engineered Mesh Upper", "React Foam Midsole", "Zoom Air Cushioning", "Waffle Rubber Outsole"],
    inStock: true,
    stockCount: 24,
    rating: 4.8,
    reviewsCount: 428,
    sku: "NK-PEG40-BLK-010",
  },
  {
    name: "Nike InfinityRN 4 Max Cushioning Running Shoes",
    brand: "Nike",
    category: "Footwear",
    subcategory: "Running Shoes",
    price: 140.0,
    formattedPrice: "$140.00",
    originalPrice: 160.0,
    discountPercentage: 12,
    description:
      "Engineered with supportive cushioning for smooth distance runs. Built with all-new Nike ReactX foam for 13% more energy return compared to React foam.",
    sizes: ["US 8", "US 8.5", "US 9", "US 9.5", "US 10", "US 10.5", "US 11", "US 12"],
    colors: ["Light Smoke Grey / Total Orange", "Obsidian / White"],
    materials: ["Flyknit Upper", "ReactX Foam Midsole", "Water-Repellent Toe Liner", "Waffle Lugged Rubber"],
    inStock: true,
    stockCount: 19,
    rating: 4.9,
    reviewsCount: 312,
    sku: "NK-INF4-GRY-011",
  },
  {
    name: "Nike Revolution 7 Lightweight Road Running Shoes",
    brand: "Nike",
    category: "Footwear",
    subcategory: "Running Shoes",
    price: 70.0,
    formattedPrice: "$70.00",
    originalPrice: 75.0,
    discountPercentage: 6,
    description:
      "Loaded with soft cushioning and support for daily jogs and road running. Features breathable knit mesh upper and generative traction outsole.",
    sizes: ["US 7", "US 8", "US 8.5", "US 9", "US 9.5", "US 10", "US 11", "US 12"],
    colors: ["Black / Off-White", "Midnight Navy"],
    materials: ["Soft Foam Midsole", "Generative Traction Pattern Rubber", "Breathable Knit Mesh"],
    inStock: true,
    stockCount: 45,
    rating: 4.6,
    reviewsCount: 184,
    sku: "NK-REV7-BLK-012",
  },
  {
    name: "Nike Air Zoom Structure 25 Stability Running Shoes",
    brand: "Nike",
    category: "Footwear",
    subcategory: "Running Shoes",
    price: 140.0,
    formattedPrice: "$140.00",
    originalPrice: 140.0,
    discountPercentage: 0,
    description:
      "Stability where you need it, cushion where you want it. The Structure 25 gives you stability for long training runs with Cushlon 3.0 foam and Zoom Air.",
    sizes: ["US 7.5", "US 8", "US 9", "US 9.5", "US 10", "US 10.5", "US 11", "US 12"],
    colors: ["Thunder Blue / Vivid Orange", "White / Metallic Silver"],
    materials: ["Single Layer Mesh Upper", "Cushlon 3.0 Foam Midsole", "Forefoot Zoom Air Unit"],
    inStock: true,
    stockCount: 16,
    rating: 4.7,
    reviewsCount: 220,
    sku: "NK-STR25-BLU-013",
  },
];

let rIdx = 0;
for (let i = 0; i < manifest.length && rIdx < runningShoes.length; i++) {
  if (manifest[i].brand === "Nike" || manifest[i].name.includes("Nike") || manifest[i].name.includes("Cleats")) {
    Object.assign(manifest[i], runningShoes[rIdx]);
    rIdx++;
  }
}

// Write back
fs.writeFileSync(manifestPathSrc, JSON.stringify(manifest, null, 2));
fs.writeFileSync(manifestPathPub, JSON.stringify(manifest, null, 2));
console.log("Successfully enriched manifest with Nike running shoes!");
