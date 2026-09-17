export type SkinProfile = {
  displayName: string | null;
  skinType: string | null;
  skinConcerns: string[];
};

export type Product = {
  id: string;
  sku: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  description: string | null;
  characteristics: string | null;
  purpose: string | null;
  inStock: boolean;
  imageUrl: string | null;
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
  address: string;
  phone: string;
  whatsapp: string;
  hours: string;
};

export type Order = {
  id: string;
  number: string;
  customerName: string;
  customerPhone: string;
  totalPrice: number;
  status: string;
  createdAt: string;
  branch: Branch;
  items: { name: string; brand: string; price: number; quantity: number }[];
};

