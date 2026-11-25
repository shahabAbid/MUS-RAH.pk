
const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace(/\/+$/, "");

const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/i, "");

export type StoreProduct = {
  id: string;
  name: string;
  category: string;
  price: number;
  image: string;
  tag: string;
  description: string;
  sizes: string[];
  colors: string[];
  variants: Array<{
    id: string;
    size: string | null;
    colorName: string | null;
    colorHex: string | null;
    stockQuantity: number;
    isActive: boolean;
  }>;
};

type BackendVariant = {
  id?: string;
  size?: string | null;
  color_name?: string | null;
  color_hex?: string | null;
  stock_quantity?: number;
  is_active?: number | boolean;
};

type BackendProduct = {
  id: string;
  name: string;
  category_name?: string | null;
  category_slug?: string | null;
  price: number | string;
  description?: string | null;
  main_image?: string | null;
  images?: Array<{
    image_url?: string | null;
  }>;
  tags?: string[];
  variants?: BackendVariant[];
};

export type BackendCategory = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  image_url?: string | null;
  product_count?: number;
};

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.message ||
        `Request failed: ${response.status} ${response.statusText}`,
    );
  }

  return data as T;
}

function getImageUrl(image?: string | null): string {
  if (!image) return "";

  const cleanImage = image.trim();

  if (/^https?:\/\//i.test(cleanImage)) {
    return cleanImage;
  }

  return `${API_ORIGIN}/${cleanImage.replace(/^\/+/, "")}`;
}

function mapBackendProduct(product: BackendProduct): StoreProduct {
  const variants = (product.variants || []).filter(
    (variant) =>
      variant.is_active !== 0 &&
      variant.is_active !== false,
  );

  return {
    id: String(product.id),
    name: product.name,
    category: product.category_name || "Uncategorized",
    price: Number(product.price),
    image: getImageUrl(
      product.main_image || product.images?.[0]?.image_url,
    ),
    tag: product.tags?.[0] || "ATELIER COLLECTION",
    description: product.description || "",
    sizes: [
      ...new Set(
        variants
          .map((variant) => variant.size)
          .filter((size): size is string => Boolean(size)),
      ),
    ],
    colors: [
      ...new Set(
        variants
          .map((variant) => variant.color_hex)
          .filter((color): color is string => Boolean(color)),
      ),
    ],
    variants: variants
      .filter(
        (variant): variant is BackendVariant & { id: string } =>
          Boolean(variant.id),
      )
      .map((variant) => ({
        id: variant.id,
        size: variant.size || null,
        colorName: variant.color_name || null,
        colorHex: variant.color_hex || null,
        stockQuantity: Number(variant.stock_quantity || 0),
        isActive:
          variant.is_active !== 0 &&
          variant.is_active !== false,
      })),
  };
}

export async function getPublishedProducts(): Promise<StoreProduct[]> {
  const data = await apiRequest<{
    success: boolean;
    products: BackendProduct[];
  }>("/products?limit=50");

  console.log("Storefront API response:", data);

  if (!data.success || !Array.isArray(data.products)) {
    throw new Error("Invalid products response from backend.");
  }

  const mappedProducts = data.products.map(mapBackendProduct);

  console.log("Mapped storefront products:", mappedProducts);

  return mappedProducts;
}

export async function getProductBySlug(
  identifier: string,
): Promise<StoreProduct | null> {
  try {
    const data = await apiRequest<{
      success: boolean;
      product: BackendProduct;
    }>(`/products/${encodeURIComponent(identifier)}`);

    return data.product ? mapBackendProduct(data.product) : null;
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.toLowerCase().includes("not found")
    ) {
      return null;
    }

    throw error;
  }
}

export async function getPublicCategories(): Promise<BackendCategory[]> {
  const data = await apiRequest<{
    success: boolean;
    categories: BackendCategory[];
  }>("/categories");

  return data.categories || [];
}
