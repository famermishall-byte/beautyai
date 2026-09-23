export type SkinProfile = {
  displayName: string | null;
  skinType: string | null;
  skinConcerns: string[];
};

/** Filterable characteristics (products.attributes jsonb) — see src/lib/attributes.ts. */
export type ProductAttributes = {
  productType?: string;
  volume?: string;
  hairType?: string[];
  skinType?: string[];
  /** Sub-section tags (e.g. "cleansing", "pad") — one product can carry several. */
  tags?: string[];
  /** Price before the discount; a card shows a badge and a struck-through price when it is above `price`. */
  oldPrice?: number;
  hit?: boolean;
};

export type Product = {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  brand: string;
  category: string;
  price: number;
  description: string | null;
  characteristics: string | null;
  purpose: string | null;
  /** Kyrgyz text (products.*_ky); null/absent -> the Russian text is shown. See src/lib/product-text.ts. */
  nameKy?: string | null;
  descriptionKy?: string | null;
  characteristicsKy?: string | null;
  purposeKy?: string | null;
  inStock: boolean;
  imageUrl: string | null;
  createdAt?: string;
  attributes?: ProductAttributes;
  /** Only present when /api/products was called with a branchId (see catalog/page.tsx). */
  branchQuantity?: number | null;
  availableAtOtherBranch?: boolean;
};

export type RecommendedProduct = Product & { reason: string };

export type CartItem = {
  product: Product;
  quantity: number;
};

export type Branch = {
  id: string;
  name: string;
  city: string;
  address: string;
  phone: string;
  whatsapp: string;
  hours: string;
  latitude: number | null;
  longitude: number | null;
};

export type Feedback = {
  id: string;
  message: string;
  createdAt: string;
  authorName: string | null;
  branchName: string | null;
};

/** A line of an order. `quantity` is what is left after the seller's changes; `orderedQuantity` is what was ordered. */
export type OrderItem = {
  name: string;
  brand: string;
  price: number;
  quantity: number;
  orderedQuantity?: number;
  productId?: string;
  sku?: string;
  /** Admin views only: current stock of this product in the order's branch (null = no data). */
  stock?: { quantity: number | null };
};

export type Order = {
  id: string;
  number: string;
  customerName: string;
  customerPhone: string;
  totalPrice: number;
  status: string;
  createdAt: string;
  /** When the order was marked paid (null for orders that are not paid yet). */
  paidAt: string | null;
  /** How the status was last changed: "whatsapp" (link tapped in the chat) or "admin" (in the app). */
  statusSource: string | null;
  statusChangedAt: string | null;
  branch: Branch;
  /** Total before the seller / admin changed the order (null = never changed). */
  originalTotal: number | null;
  editedAt: string | null;
  editedBy: string | null;
  items: OrderItem[];
};

export type Banner = {
  id: string;
  productId: string | null;
  title: string;
  subtitle: string | null;
  imageUrl: string | null;
  buttonText: string | null;
  startAt: string;
  endAt: string;
  status: "draft" | "active" | "disabled";
  priority: number;
  createdAt: string;
  updatedAt: string;
  product: Pick<Product, "id" | "name" | "brand" | "imageUrl" | "price"> | null;
};

export type Promotion = {
  id: string;
  productId: string | null;
  title: string;
  discountType: "percent" | "fixed" | "special_price";
  discountValue: number | null;
  oldPrice: number;
  newPrice: number;
  showOldPrice: boolean;
  startAt: string;
  endAt: string;
  status: "draft" | "active" | "disabled";
  createdAt: string;
  updatedAt: string;
  product: Pick<Product, "id" | "name" | "brand" | "imageUrl" | "price"> | null;
};

