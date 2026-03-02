/**
 * Panier local (localStorage) pour les articles marketplace.
 * Clé : mbourake_cart
 */

export type CartItem = {
  productId: string;
  quantity: number;
  title: string;
  price: number;
  promoPercent?: number | null;
  image?: string | null;
};

const STORAGE_KEY = 'mbourake_cart';

function read(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(items: CartItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.warn('cart write failed', e);
  }
}

export function getCart(): CartItem[] {
  return read();
}

export function addToCart(item: Omit<CartItem, 'quantity'> & { quantity?: number }): void {
  const items = read();
  const qty = item.quantity ?? 1;
  const existing = items.find((i) => i.productId === item.productId);
  if (existing) {
    existing.quantity += qty;
  } else {
    items.push({
      productId: item.productId,
      quantity: qty,
      title: item.title,
      price: item.price,
      promoPercent: item.promoPercent ?? null,
      image: item.image ?? null,
    });
  }
  write(items);
}

export function removeFromCart(productId: string): void {
  write(read().filter((i) => i.productId !== productId));
}

export function updateCartQuantity(productId: string, quantity: number): void {
  const items = read();
  const item = items.find((i) => i.productId === productId);
  if (!item) return;
  if (quantity <= 0) {
    write(items.filter((i) => i.productId !== productId));
    return;
  }
  item.quantity = quantity;
  write(items);
}

export function clearCart(): void {
  write([]);
}

export function getCartTotal(items: CartItem[]): number {
  return items.reduce((sum, i) => {
    const unit = i.promoPercent && i.promoPercent > 0
      ? i.price * (1 - i.promoPercent / 100)
      : i.price;
    return sum + unit * i.quantity;
  }, 0);
}
