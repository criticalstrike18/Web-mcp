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
  return { width: 600, height: 800 };
}

// Curated pool of aesthetic fashion, shoes, tees, streetwear, watches, bags, and lookbook images
const curatedFashionItems: {
  title: string;
  artist: string;
  year: string;
  sourceUrl: string;
}[] = [
  // --- SNEAKERS & FOOTWEAR ---
  {
    title: "Nike Air Max Crimson Retro",
    artist: "Nike Sportswear",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Air Force 1 Streetwear Kicks",
    artist: "Nike Lab",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Pastel Chunky Sneakers",
    artist: "Nike Air",
    year: "2025",
    sourceUrl: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Classic Canvas High-Tops",
    artist: "Converse All Star",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1607522370275-f14206abe5d3?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Air Jordan 1 High Retro",
    artist: "Jordan Brand",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1597045566677-8cf032ed6634?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Vans Old Skool Suede Kicks",
    artist: "Vans California",
    year: "2025",
    sourceUrl: "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Minimalist White Leather Runners",
    artist: "Common Projects Aesthetic",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1518002171953-a080ee817e1f?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Puma Suede Classic Trainers",
    artist: "Puma Heritage",
    year: "2025",
    sourceUrl: "https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Vintage Track Runners",
    artist: "Asics Heritage",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1575537302964-96cd47c06b1b?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Neon Accent Performance Trainers",
    artist: "New Balance Running",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1560769629-975ec94e6a86?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "High Fashion Chunky Platform Sneakers",
    artist: "Balenciaga Inspired",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1579338559194-a162d19bf842?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Handcrafted Chelsea Boots in Dark Espresso",
    artist: "Artisan Leathercraft",
    year: "2025",
    sourceUrl: "https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Velvet Suede Desert Boots",
    artist: "Heritage Footwear",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1514989940723-e8e51635b782?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Polished Italian Leather Brogues",
    artist: "Bespoke Shoemaker",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1539185441755-769473a23570?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Hand-stitched Penny Loafers",
    artist: "Milanese Leather Co.",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1603808033192-082d6919d3e1?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Sculptural Stiletto Heels",
    artist: "Maison Couture",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1562183241-b937e95585b6?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Strappy Minimalist Heeled Sandals",
    artist: "Studio Atelier",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Metallic Gold Evening Stilettos",
    artist: "Luxury Footwear Group",
    year: "2025",
    sourceUrl: "https://images.unsplash.com/photo-1582588678413-dbf45f4823e9?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Cobalt Blue Air Runners",
    artist: "Nike Lab Edition",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1515955656352-a1fa3ffcd111?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Emerald Green Street Sneakers",
    artist: "Nike Sportswear",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Clean Canvas Low Trainers",
    artist: "Nordic Minimalist",
    year: "2025",
    sourceUrl: "https://images.unsplash.com/photo-1587563871167-1ee9c731aefb?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Retro Runner Silhouette",
    artist: "Adidas Originals",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1600269452121-4f2416e55c28?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "High-Top Streetwear Trainers",
    artist: "Urban Kicks Studio",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=700&q=85",
  },

  // --- T-SHIRTS & STREETWEAR TEES ---
  {
    title: "Heavyweight Boxy Crewneck Tee",
    artist: "Studio Essentials",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Oversized Acid-Wash Graphic Tee",
    artist: "Tokyo Streetwear Collective",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Minimalist Typography Tee in Jet Black",
    artist: "Nordic Apparel",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Heather Grey Organic Cotton Tee",
    artist: "Basics & Co.",
    year: "2025",
    sourceUrl: "https://images.unsplash.com/photo-1578587018452-892bacefd3f2?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Vintage Washed Mustard Pocket Tee",
    artist: "Pacific Standard",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1527719327859-c6ce80353573?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Skater Graphic Back-Print Tee",
    artist: "Underground Press",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Aesthetic Vintage Band Tee",
    artist: "Archive Vintage",
    year: "2025",
    sourceUrl: "https://images.unsplash.com/photo-1503341455253-b2e723bb3dbb?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Crisp Organic Cotton T-Shirt Stack",
    artist: "Eco Textiles Atelier",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1618354691438-25bc04584c23?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Contemporary Art Print Tee",
    artist: "Modernist Goods",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1586790170083-2f9ceadc732d?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Relaxed Fit Drop-Shoulder Tee",
    artist: "Seoul Trend Co.",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1622445268045-8120e29b46d0?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Textured Fine-Knit Short Sleeve Tee",
    artist: "Loom & Thread",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Minimal Japanese Striped Top",
    artist: "Muji Aesthetic",
    year: "2025",
    sourceUrl: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Airy Linen Resort Button-Down Shirt",
    artist: "Riviera Leisurewear",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Tailored Crisp Oxford Cotton Shirt",
    artist: "Savile Row Modern",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1603252109303-2751441dd157?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Onyx Silk Casual Long Sleeve Shirt",
    artist: "Noir Paris",
    year: "2025",
    sourceUrl: "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Western Distressed Denim Workshirt",
    artist: "Heritage Workwear",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1607345366928-199ea26ede99?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Classic Piqué Cotton Polo Shirt",
    artist: "Clubhouse Athletic",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1563630423918-b58f07336ac9?auto=format&fit=crop&w=700&q=85",
  },

  // --- HOODIES, SWEATSHIRTS & KNITWEAR ---
  {
    title: "Heavyweight Fleece Street Hoodie in Ash",
    artist: "District Collective",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1556906781-9a91260c3778?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Oatmeal Ribbed Knit Wool Sweater",
    artist: "Nordic Yarn Studio",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Beige Cable-Knit Oversized Jumper",
    artist: "Chunky Knit Co.",
    year: "2025",
    sourceUrl: "https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Merino Wool Turtleneck in Terracotta",
    artist: "Atelier Tricot",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Vintage French Terry Sweatshirt",
    artist: "Collegiate Heritage",
    year: "2025",
    sourceUrl: "https://images.unsplash.com/photo-1584999734482-0311a23b0217?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Ultra-Soft Cashmere Turtleneck Pullover",
    artist: "Loro Luxury",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1608256246200-53e635b5b65f?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Folded Cashmere & Mohair Knitwear",
    artist: "Textile Archive",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1516762689617-e1cffcef479d?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Chunky Hand-Knitted Cardigan",
    artist: "Slow Fashion Goods",
    year: "2025",
    sourceUrl: "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Minimalist Cream Popover Hoodie",
    artist: "Clean Cut Studios",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1620799139834-6b8f844fbe61?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Graphic Skate Pullover Hoodie",
    artist: "Off-Grid Streetwear",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1516826957135-700dedea698c?auto=format&fit=crop&w=700&q=85",
  },

  // --- JACKETS, COATS & OUTERWEAR ---
  {
    title: "Classic Leather Biker Moto Jacket",
    artist: "AllSaints Aesthetic",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Vintage Trucker Denim Jacket",
    artist: "Levi's Heritage",
    year: "2025",
    sourceUrl: "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Minimalist Down Puffer Jacket in Sand",
    artist: "Aesthete Outerwear",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1548883354-7622d03aca27?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Double-Breasted Heritage Trench Coat",
    artist: "Burberry Heritage Style",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Tailored Camel Wool Overcoat",
    artist: "Sartorial Paris",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1544441892-794166f1e3be?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Embroidered Custom Denim Trucker Jacket",
    artist: "Custom Studio LA",
    year: "2025",
    sourceUrl: "https://images.unsplash.com/photo-1559551409-dadc959f76b8?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Quilted Winter Parka Coat",
    artist: "Nordic Extreme",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1516257984-b1b4d707412e?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Matte Black Down Jacket",
    artist: "Studio Outerwear",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1548126032-079a0fb0099d?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Oversized Tailored Suit Blazer",
    artist: "The Frankie Shop Style",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Wool Houndstooth Tailored Jacket",
    artist: "Bespoke Tailoring",
    year: "2025",
    sourceUrl: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Distressed Cafe Racer Leather Jacket",
    artist: "Highway Leather Co.",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1495105787522-5334e3ffa0ef?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Designer Wool Cocoon Coat",
    artist: "Haute Pret-a-Porter",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=700&q=85",
  },

  // --- PANTS, JEANS & BOTTOMS ---
  {
    title: "Classic Straight Leg Indigo Denim Jeans",
    artist: "Selvedge Denim Mill",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Stack of Washed Denim Jeans",
    artist: "Indigo Dye House",
    year: "2025",
    sourceUrl: "https://images.unsplash.com/photo-1582552938357-32b906df40cb?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Japanese Raw Selvedge Denim",
    artist: "Okayama Jeans Co.",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1584370848010-d7fe6bc767ec?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Curated Denim Wall Display",
    artist: "Denim Archive",
    year: "2025",
    sourceUrl: "https://images.unsplash.com/photo-1565084888279-aca607ecce0c?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Multi-Pocket Tactical Cargo Pants",
    artist: "Urban Utility Wear",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "High-Rise Washed Mom Jeans",
    artist: "Retro Denim Studio",
    year: "2025",
    sourceUrl: "https://images.unsplash.com/photo-1517445312882-bc9910d016b7?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Tailored Pleated Wide-Leg Trousers",
    artist: "Contemporary Studio",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1509551388413-e18d0ac5d495?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Sandstone Relaxed Linen Chinos",
    artist: "Mediterranean Minimal",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Cropped Wool Flannel Trousers",
    artist: "Milanese Menswear",
    year: "2025",
    sourceUrl: "https://images.unsplash.com/photo-1551854838-212c50b4c184?auto=format&fit=crop&w=700&q=85",
  },

  // --- DRESSES, SKIRTS & EVENING WEAR ---
  {
    title: "Minimalist Silk Satin Slip Dress",
    artist: "Silk & Satin Couture",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Floral Bohemian Maxi Summer Dress",
    artist: "Sunlight & Bloom",
    year: "2025",
    sourceUrl: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Velvet Couture Evening Gown",
    artist: "Gala Atelier Paris",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1539008835657-9e8e9680c956?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Scarlet Red Silk Cocktail Dress",
    artist: "Chic Avenue",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1502716119720-b23a93e5fe1b?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Timeless Little Black Dress (LBD)",
    artist: "Maison Elegance",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Breezy Pastel Linen Sundress",
    artist: "Summer Holiday Collective",
    year: "2025",
    sourceUrl: "https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Sunshine Yellow Cotton Shift Dress",
    artist: "Solaris Apparel",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1518049362265-d5b2a6467637?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Editorial Haute Couture Runway Piece",
    artist: "Paris Fashion Week",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "High Fashion Monochrome Silhouette",
    artist: "Editorial Vision",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=700&q=85",
  },

  // --- BAGS, WATCHES & LUXURY ACCESSORIES ---
  {
    title: "Top-Handle Structured Leather Handbag",
    artist: "Tuscan Leather Goods",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Caramel Full-Grain Leather Shopper Tote",
    artist: "Artisan Guild",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Vintage Cognac Leather Shoulder Bag",
    artist: "Heritage Saddle Co.",
    year: "2025",
    sourceUrl: "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Minimalist Urban Commuter Backpack",
    artist: "Nomad Tech Goods",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Heavy Canvas Market Tote Bag",
    artist: "Botanical Goods",
    year: "2025",
    sourceUrl: "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Pastel Leather Mini Crossbody Pouch",
    artist: "Jacquemus Inspired",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Textured Leather Camera Crossbody Bag",
    artist: "Studio Accessories",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1594223274512-ad4803739b7c?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Stainless Steel Minimalist Chronograph Watch",
    artist: "Swiss Horology",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Rose Gold Mesh Luxury Dress Watch",
    artist: "Geneva Timepiece",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Solid 18K Gold Herringbone Chain Necklace",
    artist: "Fine Jewelry Atelier",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Lustrous Freshwater Pearl Drop Earrings",
    artist: "Pearl House",
    year: "2025",
    sourceUrl: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Tortoiseshell Vintage Round Sunglasses",
    artist: "Oliver Optics",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Retro Chunky Black Acetate Sunglasses",
    artist: "Celine Aesthetic",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1577803645773-f96470509666?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Embroidered 6-Panel Vintage Dad Cap",
    artist: "Athletic Club",
    year: "2025",
    sourceUrl: "https://images.unsplash.com/photo-1534215754734-18e55d13e346?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Chunky Rib-Knit Fisherman Beanie",
    artist: "Heritage Woolens",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1576871337622-98d48d1cf531?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Wide-Brim Wool Felt Fedora Hat",
    artist: "Bespoke Milliner",
    year: "2025",
    sourceUrl: "https://images.unsplash.com/photo-1521369909029-2afed882baee?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Stack of Sculptural Gold & Silver Rings",
    artist: "Modernist Jeweler",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1611042553365-9b101441c135?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Minimal Gold Band Jewelry Collection",
    artist: "Aura Fine Gems",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Luxury Cat-Eye Designer Eyewear",
    artist: "Eyewear Studio",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Minimalist Wire-Frame Sunglasses",
    artist: "Ray Aesthetic",
    year: "2025",
    sourceUrl: "https://images.unsplash.com/photo-1508296695146-257a814070b4?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Luxury Gold Watch & Chain Flatlay",
    artist: "High End Jewels",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1611591475152-a29e1430689e?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Emerald & Gold Statement Earrings",
    artist: "Gemstone Studio",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1599643477877-530eb83abc8e?auto=format&fit=crop&w=700&q=85",
  },

  // --- EDITORIAL LOOKBOOKS & SHOPPING LIFESTYLE ---
  {
    title: "Avant-Garde Mustard Fashion Silhouette",
    artist: "Studio Lookbook 2026",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Minimalist Pastel Apparel Aesthetic",
    artist: "Vogue Scandinavia",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Luxury Department Store Shopping Campaign",
    artist: "Avenue Fashion",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "High Fashion Winter Editorial Look",
    artist: "Harper's Bazaar Style",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1485230895905-ec40ba36b9bc?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Contemporary Menswear Street Style",
    artist: "GQ Lookbook",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Curated Designer Clothes on Wooden Hangers",
    artist: "Concept Store Tokyo",
    year: "2025",
    sourceUrl: "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Color Coordinated Oxford Shirts on Display",
    artist: "Atelier Boutique",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "High-End Luxury Fashion Boutique Interior",
    artist: "Design Retail Paris",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1534452203293-494d7ddbf7e0?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Aesthetic Capsule Wardrobe Flatlay",
    artist: "Minimalist Stylist",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1479064555552-3ef4979f8908?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Curated Apparel Collection on Industrial Rail",
    artist: "SoHo Flagship Store",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1516763296043-f676c1105999?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Vibrant Colorway Garments on Rack",
    artist: "Color Studio",
    year: "2025",
    sourceUrl: "https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Runway Model in Avant-Garde Coat",
    artist: "Milan Fashion Week",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Bohemian Summer Fashion Lookbook",
    artist: "Ibiza Resortwear",
    year: "2025",
    sourceUrl: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Sunlit Editorial Fashion Photography",
    artist: "Sunset Lookbook",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1492707892479-7bc8d5a4ee93?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Urban Streetwear Style Portrait",
    artist: "Hypebeast Lookbook",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1508427953056-b00b8d78ebf5?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "High Fashion Studio Portrait with Sculpted Trench",
    artist: "Editorial Light Studio",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Modern European Street Style Model",
    artist: "Street Snaps Paris",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Nordic Minimalist Portrait Model",
    artist: "Copenhagen Fashion",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Executive Menswear Portrait",
    artist: "Bespoke Savile Row",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "City Chic Streetwear Pose",
    artist: "Metropolis Style",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Golden Hour Fashion Editorial",
    artist: "Lumière Lookbook",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Studio Editorial Model in Monochrome",
    artist: "Studio 24 Fashion",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Refined Casual Menswear Look",
    artist: "Kinfolk Apparel",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Tailored Italian Charcoal Wool Suit",
    artist: "Sartoria Napoli",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Casual Streetwear Model with Graphic Tee",
    artist: "East London Brand",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Youth Urban Apparel Look",
    artist: "Generation Next",
    year: "2025",
    sourceUrl: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Minimalist Modern Boutique Interior",
    artist: "Store Architecture",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Modern Glass Storefront & Mannequins",
    artist: "5th Avenue Flagship",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Luxury Brand Shopping Experience",
    artist: "Retail Lifestyle",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1481437156560-3205f6a55735?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Urban Shopping & Street Fashion",
    artist: "Downtown Trend",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Curated Garment Rails & Neutral Tones",
    artist: "Minimal Goods Co.",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1520006403909-838d6b92c22e?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Designer Studio Clothing Showcase",
    artist: "Atelier Presentation",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Elegance Lookbook Portrait in Beige",
    artist: "Mode Magazine",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1581044777550-4cfa60707c03?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Modern Department Store Apparel Row",
    artist: "Stockholm Fashion",
    year: "2025",
    sourceUrl: "https://images.unsplash.com/photo-1560243563-062bfc001d68?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Soft Pastel Hue Seasonal Collection",
    artist: "Pastel Palette",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "High-Grade Cotton & Silk Fabric Swatches",
    artist: "Textile Laboratory",
    year: "2025",
    sourceUrl: "https://images.unsplash.com/photo-1523381294911-f11ae0e2ef55?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Curated Outfit Flatlay with Shoes & Watch",
    artist: "Lookbook Curator",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1558769132-92e50331ad78?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Gentleman's Sartorial Essentials",
    artist: "Dapper Goods Co.",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1490114538077-0a7f8cb49891?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Fine Weave Knitwear Close-Up",
    artist: "Material Studio",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Monochrome Minimalist Fashion Outfit",
    artist: "Architectural Fashion",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1485968579580-b6d095142e6e?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Complete Luxury Shopping Outfit Flatlay",
    artist: "High Fashion Stylist",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1574015974293-817f0ebebb74?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Streetwear Bomber Jacket Lookbook",
    artist: "Tokyo Nights",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Designer High-Fashion Lookbook Coat",
    artist: "Luxe Pret-a-Porter",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=700&q=85",
  },
  {
    title: "Pastel Sneaker Collection Detail",
    artist: "Street Sneakers Co.",
    year: "2026",
    sourceUrl: "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=700&q=85",
  },
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchDummyJsonProducts(): Promise<
  { title: string; artist: string; year: string; sourceUrl: string }[]
> {
  const cats = [
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
  ];
  const items: { title: string; artist: string; year: string; sourceUrl: string }[] = [];

  for (const c of cats) {
    try {
      const res = await fetch(`https://dummyjson.com/products/category/${c}`);
      if (!res.ok) continue;
      const data = await res.json();
      for (const p of data.products || []) {
        if (p.images && p.images.length > 0) {
          items.push({
            title: p.title,
            artist: p.brand || "Designer Collection",
            year: "2026",
            sourceUrl: p.images[0],
          });
        }
      }
    } catch {
      // ignore
    }
  }
  return items;
}

async function downloadImageWithRetry(url: string, retries = 3): Promise<Buffer | null> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "image/avif,image/webp,image/apng,image/jpeg,image/*,*/*;q=0.8",
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
      await sleep(400 * attempt);
    }
  }
  return null;
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const rawOriginalManifest = fs.readFileSync(MANIFEST_PATH_SRC, "utf8");
  const originalManifest: {
    url: string;
    type?: string;
    title?: string;
    artist?: string;
    year?: string;
    link?: string;
    width?: number;
    height?: number;
  }[] = JSON.parse(rawOriginalManifest);

  console.log(`Loaded original manifest with ${originalManifest.length} items.`);

  console.log("Fetching additional ecommerce fashion products from DummyJSON...");
  const dummyProducts = await fetchDummyJsonProducts();
  console.log(`Fetched ${dummyProducts.length} ecommerce products.`);

  // Combine curated list and dummy products
  const pool = [...curatedFashionItems, ...dummyProducts];
  console.log(`Total fashion image candidate pool: ${pool.length}`);

  const updatedManifest: typeof originalManifest = [];

  for (let i = 0; i < originalManifest.length; i++) {
    const orig = originalManifest[i];
    const filename = path.basename(orig.url);
    const targetFilepath = path.join(OUTPUT_DIR, filename);

    // Pick from pool with rollover
    const fashionSource = pool[i % pool.length];

    console.log(
      `[${i + 1}/${originalManifest.length}] Downloading fashion image for "${fashionSource.title}"...`
    );

    const imageBuffer = await downloadImageWithRetry(fashionSource.sourceUrl);

    if (imageBuffer) {
      fs.writeFileSync(targetFilepath, imageBuffer);
      const dims = getImageDimensions(imageBuffer);

      updatedManifest.push({
        url: `artworks/${filename}`,
        type: "image",
        title: fashionSource.title,
        artist: fashionSource.artist,
        year: fashionSource.year,
        link: "https://aesthetic-shopping.local",
        width: dims.width,
        height: dims.height,
      });
    } else {
      console.warn(`Could not download image ${i + 1}, keeping original entry.`);
      updatedManifest.push(orig);
    }

    // Small polite delay
    await sleep(60);
  }

  // Save manifests
  const manifestJsonString = JSON.stringify(updatedManifest, null, 2);
  fs.writeFileSync(MANIFEST_PATH_SRC, manifestJsonString, "utf8");
  fs.writeFileSync(MANIFEST_PATH_PUB, manifestJsonString, "utf8");

  console.log("\n Successfully replaced all images with high quality aesthetic fashion images!");
  console.log(`Updated ${updatedManifest.length} items in ${MANIFEST_PATH_SRC} and ${MANIFEST_PATH_PUB}`);
}

main().catch(console.error);
