export interface CartItem {
  id: number;
  slug: string;
  name: string;
  price: number;
  regularPrice: number;
  image: string;
  quantity: number;
  url: string;
}

interface CartEventDetail {
  items: CartItem[];
  count: number;
}

type CartItemInput = Partial<Omit<CartItem, "id" | "price" | "regularPrice" | "quantity">> & {
  id?: unknown;
  price?: unknown;
  regularPrice?: unknown;
  quantity?: unknown;
};

const STORAGE_KEY = "astro-shop-cart";
const CART_UPDATED_EVENT = "astro-shop:cart-updated";
const FALLBACK_IMAGE = "https://placehold.co/800x800/eceff3/1b2430?text=Tap+Hoa+Tech";
const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0
});

let hasInitialized = false;

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function toText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toQuantity(value: unknown): number {
  return Math.max(1, Math.floor(toNumber(value, 1)));
}

function normalizeCartItem(input: CartItemInput): CartItem | null {
  const id = toNumber(input.id, 0);
  const slug = toText(input.slug);
  const name = toText(input.name);
  const price = Math.max(0, toNumber(input.price, 0));

  if (!id || !slug || !name || !price) {
    return null;
  }

  const regularPrice = Math.max(price, toNumber(input.regularPrice, price));
  const image = toText(input.image) || FALLBACK_IMAGE;
  const url = toText(input.url) || `/products/${slug}/`;
  const quantity = toQuantity(input.quantity);

  return {
    id,
    slug,
    name,
    price,
    regularPrice,
    image,
    quantity,
    url
  };
}

function emitCartUpdated(items: CartItem[]): void {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<CartEventDetail>(CART_UPDATED_EVENT, {
      detail: {
        items,
        count: getCartCount(items)
      }
    })
  );
}

export function formatCartCurrency(value: number): string {
  return currencyFormatter.format(value);
}

export function readCart(): CartItem[] {
  if (!canUseStorage()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => normalizeCartItem(item as CartItemInput))
      .filter((item): item is CartItem => Boolean(item));
  } catch {
    return [];
  }
}

export function writeCart(items: CartItem[]): CartItem[] {
  const normalized = items
    .map((item) => normalizeCartItem(item))
    .filter((item): item is CartItem => Boolean(item));

  if (!canUseStorage()) {
    return normalized;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  emitCartUpdated(normalized);
  return normalized;
}

export function getCartCount(items: CartItem[] = readCart()): number {
  return items.reduce((total, item) => total + item.quantity, 0);
}

export function addToCart(
  item: Partial<CartItem> & Pick<CartItem, "id" | "slug" | "name" | "price">,
  quantity = 1
): CartItem[] {
  const normalized = normalizeCartItem({
    ...item,
    quantity,
    regularPrice: item.regularPrice ?? item.price,
    image: item.image ?? FALLBACK_IMAGE,
    url: item.url ?? `/products/${item.slug}/`
  });

  if (!normalized) {
    return readCart();
  }

  const nextItems = [...readCart()];
  const existingItem = nextItems.find((entry) => entry.id === normalized.id);

  if (existingItem) {
    existingItem.quantity += normalized.quantity;
    existingItem.price = normalized.price;
    existingItem.regularPrice = normalized.regularPrice;
    existingItem.image = normalized.image;
    existingItem.name = normalized.name;
    existingItem.slug = normalized.slug;
    existingItem.url = normalized.url;
  } else {
    nextItems.push(normalized);
  }

  return writeCart(nextItems);
}

export function updateCartQuantity(productId: number | string, nextQuantity: number): CartItem[] {
  const id = toNumber(productId, 0);
  if (!id) {
    return readCart();
  }

  if (nextQuantity <= 0) {
    return removeFromCart(id);
  }

  return writeCart(
    readCart().map((item) =>
      item.id === id
        ? {
            ...item,
            quantity: toQuantity(nextQuantity)
          }
        : item
    )
  );
}

export function removeFromCart(productId: number | string): CartItem[] {
  const id = toNumber(productId, 0);
  if (!id) {
    return readCart();
  }

  return writeCart(readCart().filter((item) => item.id !== id));
}

function getItemFromButton(button: HTMLButtonElement): CartItem | null {
  return normalizeCartItem({
    id: button.dataset.productId,
    slug: button.dataset.productSlug,
    name: button.dataset.productName,
    price: button.dataset.productPrice,
    regularPrice: button.dataset.productRegularPrice ?? button.dataset.productPrice,
    image: button.dataset.productImage,
    url: button.dataset.productUrl,
    quantity: 1
  });
}

function flashButtonState(button: HTMLButtonElement): void {
  button.classList.add("is-added");

  const label = button.querySelector<HTMLElement>("[data-add-to-cart-label]");
  const originalLabel = label?.textContent ?? "";
  const addedText = button.dataset.addedText ?? "Đã thêm";

  if (label) {
    label.textContent = addedText;
  }

  window.setTimeout(() => {
    button.classList.remove("is-added");
    if (label) {
      label.textContent = originalLabel;
    }
  }, 1200);
}

export function updateCartCountBadges(
  root: ParentNode = document,
  items: CartItem[] = readCart()
): void {
  const count = getCartCount(items);

  root.querySelectorAll<HTMLElement>("[data-cart-count]").forEach((badge) => {
    badge.textContent = String(count);

    if (count > 0) {
      badge.removeAttribute("hidden");
    } else {
      badge.setAttribute("hidden", "");
    }
  });
}

export function subscribeCartUpdates(callback: (items: CartItem[]) => void): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handler = (event: Event) => {
    const detail = (event as CustomEvent<CartEventDetail>).detail;
    callback(detail?.items ?? readCart());
  };

  window.addEventListener(CART_UPDATED_EVENT, handler as EventListener);

  return () => {
    window.removeEventListener(CART_UPDATED_EVENT, handler as EventListener);
  };
}

export function initCartUi(): void {
  if (typeof document === "undefined") {
    return;
  }

  updateCartCountBadges(document);

  if (hasInitialized) {
    return;
  }

  document.addEventListener("click", (event) => {
    const target = event.target as Element | null;
    const button = target?.closest<HTMLButtonElement>("[data-add-to-cart]");

    if (!button) {
      return;
    }

    const item = getItemFromButton(button);
    if (!item) {
      return;
    }

    addToCart(item, 1);
    flashButtonState(button);
  });

  window.addEventListener(CART_UPDATED_EVENT, (event) => {
    const detail = (event as CustomEvent<CartEventDetail>).detail;
    updateCartCountBadges(document, detail?.items ?? readCart());
  });

  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY) {
      updateCartCountBadges(document, readCart());
    }
  });

  hasInitialized = true;
}
