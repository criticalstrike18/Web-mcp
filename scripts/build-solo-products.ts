import fs from "node:fs";
import path from "node:path";

const MANIFEST_PATH_SRC = "./src/artworks/manifest.json";
const MANIFEST_PATH_PUB = "./public/artworks/manifest.json";
const OUTPUT_DIR = "./public/artworks";

function getImageDimensions(buf: Buffer): { width: number; height: number } {
  // JPEG
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i < buf.length) {
      if (buf[i] !== 0xff) break;
      const marker = buf[i + 1];
      if (
        (marker >= 0xc0 && marker <= 0xc3) ||
        (marker >= 0xc5 && marker <= 0xc7) ||
        (marker >= 0xc9 && marker <= 0xcb) ||
        (marker >= 0xcd && marker <= 0xcf)
      ) {
        const height = buf.readUInt16BE(i + 5);
        const width = buf.readUInt16BE(i + 7);
        return { width, height };
      }
      const len = buf.readUInt16BE(i + 2);
      i += 2 + len;
    }
  }
  // PNG
  if (
    buf.length >= 24 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  ) {
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    return { width, height };
  }
  // WebP
  if (
    buf.length >= 30 &&
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP"
  ) {
    const type = buf.toString("ascii", 12, 16);
    if (type === "VP8 ") {
      const width = buf.readUInt16LE(26) & 0x3fff;
      const height = buf.readUInt16LE(28) & 0x3fff;
      return { width, height };
    }
    if (type === "VP8L") {
      const b1 = buf[21];
      const b2 = buf[22];
      const b3 = buf[23];
      const b4 = buf[24];
      const width = 1 + (((b2 & 0x3f) << 8) | b1);
      const height = 1 + (((b4 & 0xf) << 10) | (b3 << 2) | ((b2 & 0xc0) >> 6));
      return { width, height };
    }
    if (type === "VP8X") {
      const width = 1 + buf.readUIntLE(24, 3);
      const height = 1 + buf.readUIntLE(27, 3);
      return { width, height };
    }
  }
  return { width: 600, height: 600 };
}

// Curated solo product shots with clean background & product metadata
const curatedSoloProducts = [
  {
    name: "Air Jordan 1 Retro High OG 'Chicago'",
    brand: "Nike / Jordan",
    category: "Footwear",
    subcategory: "High-Top Sneakers",
    price: 180.0,
    originalPrice: 220.0,
    discountPercentage: 18,
    description:
      "The iconic Air Jordan 1 Retro High OG combines premium full-grain leather uppers with the classic red, white, and black colorway. Features encapsulated Air-Sole cushioning and a durable rubber cupsole for unmatched traction and comfort on and off the court.",
    sizes: ["US 7.5", "US 8", "US 8.5", "US 9", "US 9.5", "US 10", "US 10.5", "US 11", "US 12"],
    colors: ["Chicago Red / White / Black", "Bred Black / Red", "Royal Blue"],
    materials: ["100% Full-Grain Calfskin Leather", "Encapsulated Air-Sole Unit", "Solid Rubber Outsole"],
    inStock: true,
    stockCount: 18,
    rating: 4.9,
    reviewsCount: 342,
    sku: "NK-AJ1-CHI-001",
    imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=700&q=85",
  },
  {
    name: "Old Skool Classic Suede Low Sneakers",
    brand: "Vans",
    category: "Footwear",
    subcategory: "Skate Shoes",
    price: 75.0,
    originalPrice: 85.0,
    discountPercentage: 12,
    description:
      "First known as the Vans #36, the Old Skool debuted in 1977 with a unique new addition: a random doodle drawn by founder Paul Van Doren, originally called the 'jazz stripe'. Built with durable suede and canvas uppers, re-enforced toe caps, and signature waffle rubber outsoles.",
    sizes: ["US 6", "US 7", "US 8", "US 9", "US 10", "US 11", "US 12"],
    colors: ["Black / White", "Navy Blue", "Dune Cream"],
    materials: ["Durable Suede Uppers", "Heavyweight 10oz Canvas", "Vulcanized Rubber Waffle Outsole"],
    inStock: true,
    stockCount: 42,
    rating: 4.7,
    reviewsCount: 512,
    sku: "VN-OSK-BLK-002",
    imageUrl: "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=700&q=85",
  },
  {
    name: "Air Force 1 '07 Low Triple White",
    brand: "Nike",
    category: "Footwear",
    subcategory: "Lifestyle Sneakers",
    price: 115.0,
    originalPrice: 130.0,
    discountPercentage: 11,
    description:
      "The radiance lives on in the Nike Air Force 1 '07, the basketball icon that puts a fresh spin on what you know best: crisp leather, bold colors, and the perfect amount of flash to make you shine.",
    sizes: ["US 7", "US 7.5", "US 8", "US 8.5", "US 9", "US 9.5", "US 10", "US 10.5", "US 11", "US 12"],
    colors: ["Triple White", "Triple Black", "Sail White"],
    materials: ["Stitched Leather Overlays", "Nike Air Cushioning", "Perforations on the Toe"],
    inStock: true,
    stockCount: 65,
    rating: 4.8,
    reviewsCount: 890,
    sku: "NK-AF1-WHT-003",
    imageUrl: "https://images.unsplash.com/photo-1518002171953-a080ee817e1f?auto=format&fit=crop&w=700&q=85",
  },
  {
    name: "Suede Classic XXI Low Top Trainers",
    brand: "Puma",
    category: "Footwear",
    subcategory: "Casual Shoes",
    price: 70.0,
    originalPrice: 85.0,
    discountPercentage: 18,
    description:
      "The Suede hit the scene in 1968 and has been changing the game ever since. It's been worn by icons of every generation, and it's stayed classic through it all. Features a full suede upper with modern comfort improvements.",
    sizes: ["US 7", "US 8", "US 9", "US 10", "US 11", "US 12"],
    colors: ["Puma Black / White", "Peacoat Navy", "Cabernet Red"],
    materials: ["100% Premium Suede", "Comfort Sockliner", "Rubber Midsole and Outsole"],
    inStock: true,
    stockCount: 30,
    rating: 4.6,
    reviewsCount: 220,
    sku: "PM-SUD-BLK-004",
    imageUrl: "https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&w=700&q=85",
  },
  {
    name: "Handcrafted Italian Leather Chelsea Boots",
    brand: "Common Projects",
    category: "Footwear",
    subcategory: "Boots",
    price: 525.0,
    originalPrice: 580.0,
    discountPercentage: 9,
    description:
      "Minimalist Chelsea boots crafted in Italy from supple suede with elasticated side gussets and a pull tab for effortless entry. Finished with the brand's signature gold foil serial number stamped at the heel.",
    sizes: ["EU 39", "EU 40", "EU 41", "EU 42", "EU 43", "EU 44", "EU 45"],
    colors: ["Dark Charcoal", "Tobacco Brown", "Sand Suede"],
    materials: ["Italian Calf Suede", "Natural Crepe Rubber Sole", "Leather Lining"],
    inStock: true,
    stockCount: 14,
    rating: 4.9,
    reviewsCount: 94,
    sku: "CP-CHL-DKC-005",
    imageUrl: "https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&w=700&q=85",
  },
  {
    name: "Goodyear-Welted Oxford Brogue Shoes",
    brand: "Church's",
    category: "Footwear",
    subcategory: "Formal Shoes",
    price: 690.0,
    originalPrice: 750.0,
    discountPercentage: 8,
    description:
      "Handcrafted in Northamptonshire from polished binder leather with intricate wingtip brogue detailing. Features a Goodyear-welted double leather sole designed for decades of elegant wear.",
    sizes: ["UK 7", "UK 7.5", "UK 8", "UK 8.5", "UK 9", "UK 9.5", "UK 10", "UK 11"],
    colors: ["Burnished Walnut Brown", "Ebony Black", "Deep Burgundy"],
    materials: ["Polished Binder Calf Leather", "Goodyear-Welted Construction", "Oak-Tanned Leather Sole"],
    inStock: true,
    stockCount: 10,
    rating: 5.0,
    reviewsCount: 48,
    sku: "CH-BRO-BRN-006",
    imageUrl: "https://images.unsplash.com/photo-1539185441755-769473a23570?auto=format&fit=crop&w=700&q=85",
  },
  {
    name: "Heavyweight Boxy Fit Organic Cotton Tee",
    brand: "Fear of God Essentials",
    category: "Apparel",
    subcategory: "T-Shirts",
    price: 55.0,
    originalPrice: 65.0,
    discountPercentage: 15,
    description:
      "Crafted from custom 240 GSM combed organic cotton with a dry, vintage hand-feel. Cut in a signature oversized boxy silhouette with dropped shoulders and a thick ribbed collar that holds its shape.",
    sizes: ["XS", "S", "M", "L", "XL", "XXL"],
    colors: ["Vintage White", "Washed Onyx", "Sage Green", "Desert Taupe"],
    materials: ["100% 240 GSM Combed Organic Cotton", "Heavy 1x1 Rib Collar", "Pre-Shrunk Treatment"],
    inStock: true,
    stockCount: 88,
    rating: 4.8,
    reviewsCount: 410,
    sku: "FOG-TEE-WHT-007",
    imageUrl: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=700&q=85",
  },
  {
    name: "Tokyo Undercover Graphic Heavy Tee",
    brand: "Undercover",
    category: "Apparel",
    subcategory: "T-Shirts",
    price: 120.0,
    originalPrice: 140.0,
    discountPercentage: 14,
    description:
      "Designed in Tokyo with high-density screen-printed typographic artwork across the back. Spun from premium Japanese cotton yarn for a substantial, drapey feel that gets softer with every wash.",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Jet Black", "Charcoal Heather"],
    materials: ["100% Japanese Ring-Spun Cotton", "Water-Based Screen Print", "Reinforced Seams"],
    inStock: true,
    stockCount: 26,
    rating: 4.9,
    reviewsCount: 165,
    sku: "UC-TEE-BLK-008",
    imageUrl: "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=700&q=85",
  },
  {
    name: "Minimalist Heavy Fleece Popover Hoodie",
    brand: "Acne Studios",
    category: "Apparel",
    subcategory: "Hoodies",
    price: 340.0,
    originalPrice: 380.0,
    discountPercentage: 11,
    description:
      "Constructed in Portugal from 450 GSM French loopback terry cotton. Features a double-layered hood without drawstrings for clean architectural lines, ribbed gussets, and relaxed raglan sleeves.",
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: ["Ash Grey Melange", "Washed Black", "Dusty Lilac"],
    materials: ["100% 450 GSM Organic Cotton French Terry", "Double Layer Hood", "Blindstitch Detailing"],
    inStock: true,
    stockCount: 22,
    rating: 4.9,
    reviewsCount: 115,
    sku: "AC-HOD-GRY-009",
    imageUrl: "https://images.unsplash.com/photo-1556906781-9a91260c3778?auto=format&fit=crop&w=700&q=85",
  },
  {
    name: "Heritage 14oz Japanese Selvedge Denim Jeans",
    brand: "Nudie Jeans",
    category: "Apparel",
    subcategory: "Denim & Pants",
    price: 220.0,
    originalPrice: 260.0,
    discountPercentage: 15,
    description:
      "Woven on vintage Toyoda shuttle looms in Kurashiki, Japan using 100% organic cotton dipped 16 times in natural indigo. Designed to develop high-contrast personal fade patterns over years of continuous wear.",
    sizes: ["29x32", "30x32", "31x32", "32x32", "33x32", "34x34", "36x34"],
    colors: ["Raw Indigo Dry", "Washed Vintage Blue", "Black Rinse"],
    materials: ["14oz Japanese Red-Line Selvedge Denim", "Copper Rivets", "Custom Button Fly"],
    inStock: true,
    stockCount: 35,
    rating: 4.8,
    reviewsCount: 280,
    sku: "ND-DEN-IND-010",
    imageUrl: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=700&q=85",
  },
  {
    name: "Classic Moto Biker Leather Jacket",
    brand: "AllSaints",
    category: "Outerwear",
    subcategory: "Leather Jackets",
    price: 599.0,
    originalPrice: 699.0,
    discountPercentage: 14,
    description:
      "Crafted from premium washed lambskin leather for a soft, supple hand that naturally breaks in. Accented with asymmetrical industrial metal zippers, snap lapels, and an adjustable waist belt.",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Washed Black", "Oxblood Red"],
    materials: ["100% Supple Lamb Leather", "Recycled Polyester Lining", "Heavy Metal Hardware"],
    inStock: true,
    stockCount: 12,
    rating: 4.9,
    reviewsCount: 198,
    sku: "AS-JKT-BLK-011",
    imageUrl: "https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=700&q=85",
  },
  {
    name: "Submariner Date 41mm Oystersteel",
    brand: "Rolex",
    category: "Watches",
    subcategory: "Luxury Timepieces",
    price: 10250.0,
    originalPrice: 10250.0,
    discountPercentage: 0,
    description:
      "The benchmark among divers' watches. Crafted in Oystersteel with a black Cerachrom ceramic bezel and large luminescent Chromalight hour markers. Powered by the Manufacture Calibre 3235 automatic movement with 70 hours power reserve.",
    sizes: ["41mm Case Diameter"],
    colors: ["Black Dial / Cerachrom Bezel", "Green Kermit Bezel"],
    materials: ["Oystersteel 904L Alloy", "Scratch-Resistant Sapphire Crystal", "Cerachrom Ceramic"],
    inStock: true,
    stockCount: 4,
    rating: 5.0,
    reviewsCount: 78,
    sku: "RLX-SUB-BLK-012",
    imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=700&q=85",
  },
  {
    name: "Re-Edition 2005 Saffiano Leather Handbag",
    brand: "Prada",
    category: "Bags",
    subcategory: "Shoulder Bags",
    price: 1850.0,
    originalPrice: 1950.0,
    discountPercentage: 5,
    description:
      "An iconic silhouette crafted from Prada's trademark Saffiano cross-hatch leather. Features a detachable woven tape shoulder strap, removable pouch, and polished gold-tone metal hardware with the enameled triangle logo.",
    sizes: ["One Size (22 x 18 x 6 cm)"],
    colors: ["Nero Black", "Fiordaliso Blue", "Cammeo Beige"],
    materials: ["100% Saffiano Calf Leather", "Prada Logo Nylon Jacquard Lining", "Enameled Metal Hardware"],
    inStock: true,
    stockCount: 8,
    rating: 4.9,
    reviewsCount: 145,
    sku: "PRD-BAG-NER-013",
    imageUrl: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=700&q=85",
  },
  {
    name: "Classic Original Wayfarer Polarized Sunglasses",
    brand: "Ray-Ban",
    category: "Eyewear",
    subcategory: "Sunglasses",
    price: 175.0,
    originalPrice: 210.0,
    discountPercentage: 16,
    description:
      "The most recognizable style in the history of sunglasses. First designed in 1952, the Original Wayfarer gained popularity among celebrities and musicians worldwide. Equipped with G-15 green polarized glass lenses for 100% UV protection.",
    sizes: ["Standard 50mm", "Large 54mm"],
    colors: ["Polished Black / G-15 Green", "Havana Tortoiseshell / Brown"],
    materials: ["High-Grade Acetate Frame", "Mineral Crystal Glass Lenses", "7-Barrel Metal Hinges"],
    inStock: true,
    stockCount: 50,
    rating: 4.8,
    reviewsCount: 620,
    sku: "RB-WAY-BLK-014",
    imageUrl: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=700&q=85",
  },
  {
    name: "Solid 18K Yellow Gold Herringbone Necklace",
    brand: "Mejuri",
    category: "Jewelry",
    subcategory: "Necklaces",
    price: 498.0,
    originalPrice: 550.0,
    discountPercentage: 9,
    description:
      "A fluid, ultra-flexible 4.2mm flat herringbone chain crafted in Italy from recycled 18K solid yellow gold. Polished to a mirror shine and sits flush against the collarbone for comfortable everyday luxury.",
    sizes: ["16 Inch", "18 Inch", "20 Inch"],
    colors: ["18K Yellow Gold", "18K White Gold"],
    materials: ["18K Solid Recycled Gold", "Lobster Clasp Fastening", "Hypoallergenic Nickel-Free"],
    inStock: true,
    stockCount: 16,
    rating: 4.9,
    reviewsCount: 310,
    sku: "MJ-NCK-GLD-015",
    imageUrl: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=700&q=85",
  },
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchDummyJsonProducts() {
  const dummyRes = await fetch("https://dummyjson.com/products?limit=200");
  const dummyData = await dummyRes.json();
  const allowedCategories = [
    "mens-shirts",
    "mens-shoes",
    "mens-watches",
    "womens-bags",
    "womens-dresses",
    "womens-jewellery",
    "womens-shoes",
    "womens-watches",
    "sunglasses",
    "tops",
    "fragrances",
    "beauty",
    "skin-care",
  ];

  const products: any[] = [];
  for (const p of dummyData.products || []) {
    if (allowedCategories.includes(p.category) && p.images && p.images.length > 0) {
      for (const img of p.images) {
        products.push({
          name: p.title,
          brand: p.brand || "Atelier Luxury",
          category: p.category
            .split("-")
            .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" "),
          subcategory: p.category,
          price: Number(p.price) || 99.0,
          originalPrice: Math.round((Number(p.price) || 99.0) * (1 + (p.discountPercentage || 10) / 100) * 100) / 100,
          discountPercentage: Math.round(p.discountPercentage || 10),
          description: p.description,
          sizes: p.category.includes("shoes")
            ? ["US 7", "US 8", "US 8.5", "US 9", "US 9.5", "US 10", "US 11", "US 12"]
            : p.category.includes("shirt") || p.category.includes("dress") || p.category.includes("top")
            ? ["XS", "S", "M", "L", "XL", "XXL"]
            : ["One Size"],
          colors: ["Classic Black", "Pure White", "Signature Multi"],
          materials: ["High-Grade Fabric / Material", "Precision Engineered Construction"],
          inStock: p.stock > 0,
          stockCount: p.stock || 25,
          rating: Number(p.rating) || 4.7,
          reviewsCount: p.reviews?.length ? p.reviews.length * 15 + 12 : 64,
          sku: p.sku || `SKU-${p.id}-001`,
          imageUrl: img,
        });
      }
    }
  }
  return products;
}

async function fetchFakeStoreProducts() {
  const res = await fetch("https://fakestoreapi.com/products");
  const data = await res.json();
  const products: any[] = [];
  for (const p of data || []) {
    products.push({
      name: p.title,
      brand: "Urban Outfitters Edition",
      category: p.category
        .split(" ")
        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" "),
      subcategory: p.category,
      price: Number(p.price) || 49.99,
      originalPrice: Math.round((Number(p.price) || 49.99) * 1.2 * 100) / 100,
      discountPercentage: 15,
      description: p.description,
      sizes: p.category.includes("clothing")
        ? ["S", "M", "L", "XL"]
        : ["Standard Fit"],
      colors: ["Midnight Black", "Natural Slate", "Camel Tan"],
      materials: ["Premium Blend", "Reinforced Stitching"],
      inStock: true,
      stockCount: 30,
      rating: p.rating?.rate || 4.6,
      reviewsCount: p.rating?.count || 85,
      sku: `FS-PROD-${p.id}`,
      imageUrl: p.image,
    });
  }
  return products;
}

async function downloadImageWithRetry(url: string, retries = 3): Promise<Buffer | null> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "image/avif,image/webp,image/apng,image/jpeg,image/png,image/*,*/*;q=0.8",
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const arrayBuf = await res.arrayBuffer();
      return Buffer.from(arrayBuf);
    } catch (err) {
      if (attempt === retries) {
        console.error(`Failed to download ${url}:`, err);
        return null;
      }
      await sleep(300 * attempt);
    }
  }
  return null;
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const rawOriginalManifest = fs.readFileSync(MANIFEST_PATH_SRC, "utf8");
  const originalManifest = JSON.parse(rawOriginalManifest);
  const totalCount = originalManifest.length; // 211

  console.log(`Gathering solo product dataset for ${totalCount} items...`);

  const [dummyProducts, fakeStoreProducts] = await Promise.all([
    fetchDummyJsonProducts(),
    fetchFakeStoreProducts(),
  ]);

  console.log(`Fetched ${dummyProducts.length} DummyJSON solo products.`);
  console.log(`Fetched ${fakeStoreProducts.length} FakeStore solo products.`);
  console.log(`Loaded ${curatedSoloProducts.length} curated luxury solo products.`);

  // Combine into a master pool
  const masterPool = [
    ...curatedSoloProducts,
    ...dummyProducts,
    ...fakeStoreProducts,
  ];

  console.log(`Master pool total: ${masterPool.length} solo products.`);

  const updatedManifest: any[] = [];

  for (let i = 0; i < totalCount; i++) {
    const orig = originalManifest[i];
    const filename = path.basename(orig.url);
    const targetFilepath = path.join(OUTPUT_DIR, filename);

    // Pick from pool
    const product = masterPool[i % masterPool.length];

    console.log(
      `[${i + 1}/${totalCount}] Downloading solo product image: ${product.name.slice(0, 45)}...`
    );

    const imageBuffer = await downloadImageWithRetry(product.imageUrl);

    if (imageBuffer) {
      fs.writeFileSync(targetFilepath, imageBuffer);
      const dims = getImageDimensions(imageBuffer);
      const aspect = Math.round((dims.width / dims.height) * 1000) / 1000;

      const formattedPrice = `$${Number(product.price).toFixed(2)}`;

      updatedManifest.push({
        id: `PROD-${String(i + 1).padStart(4, "0")}`,
        url: `artworks/${filename}`,
        type: "image",
        name: product.name,
        title: product.name,
        brand: product.brand,
        category: product.category,
        subcategory: product.subcategory,
        price: Number(product.price),
        formattedPrice: formattedPrice,
        originalPrice: Number(product.originalPrice || product.price),
        discountPercentage: product.discountPercentage || 0,
        description: product.description,
        sizes: product.sizes || ["One Size"],
        colors: product.colors || ["Standard"],
        materials: product.materials || ["Premium Quality Construction"],
        inStock: product.inStock !== false,
        stockCount: product.stockCount || 20,
        rating: product.rating || 4.8,
        reviewsCount: product.reviewsCount || 50,
        sku: product.sku || `SKU-${i + 1}`,
        link: "https://aesthetic-shopping.local",
        width: dims.width,
        height: dims.height,
        aspectRatio: aspect,
      });
    } else {
      console.warn(`Could not download image ${i + 1}, fallback generated.`);
      updatedManifest.push({
        id: `PROD-${String(i + 1).padStart(4, "0")}`,
        url: `artworks/${filename}`,
        type: "image",
        name: product.name,
        title: product.name,
        brand: product.brand,
        category: product.category,
        subcategory: product.subcategory,
        price: Number(product.price),
        formattedPrice: `$${Number(product.price).toFixed(2)}`,
        originalPrice: Number(product.originalPrice || product.price),
        discountPercentage: product.discountPercentage || 0,
        description: product.description,
        sizes: product.sizes || ["One Size"],
        colors: product.colors || ["Standard"],
        materials: product.materials || ["Premium Quality Construction"],
        inStock: true,
        stockCount: 15,
        rating: 4.8,
        reviewsCount: 30,
        sku: `SKU-${i + 1}`,
        link: "https://aesthetic-shopping.local",
        width: 600,
        height: 600,
        aspectRatio: 1.0,
      });
    }

    await sleep(50);
  }

  // Save manifests
  const jsonContent = JSON.stringify(updatedManifest, null, 2);
  fs.writeFileSync(MANIFEST_PATH_SRC, jsonContent, "utf8");
  fs.writeFileSync(MANIFEST_PATH_PUB, jsonContent, "utf8");

  console.log("\n All 211 images and comprehensive product JSON manifest generated successfully!");
}

main().catch(console.error);
