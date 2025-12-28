import { Product, Quotation } from '../types';
import { INITIAL_PRODUCTS } from './initialData';

const KEYS = {
  PRODUCTS: 'obra_products',
  QUOTATIONS: 'obra_quotations',
  CART: 'obra_cart',
  ADMIN_AUTH: 'obra_admin_auth'
};

// Helper to safely write to localStorage
const safeSetItem = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch (e: any) {
    // Catch quota exceeded errors common with base64 images
    if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || e.message?.includes('exceeded')) {
      throw new Error("Storage Full! Your images are too large. Please use smaller images (under 500KB) or delete old products/quotes to free up space.");
    }
    throw e;
  }
};

// Initialize DB if empty
const initDB = () => {
  if (!localStorage.getItem(KEYS.PRODUCTS)) {
    safeSetItem(KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
  }
  if (!localStorage.getItem(KEYS.QUOTATIONS)) {
    safeSetItem(KEYS.QUOTATIONS, JSON.stringify([]));
  }
};

try {
  initDB();
} catch (e) {
  console.error("Failed to initialize DB:", e);
}

export const db = {
  products: {
    getAll: (): Product[] => {
      return JSON.parse(localStorage.getItem(KEYS.PRODUCTS) || '[]');
    },
    getById: (id: string): Product | undefined => {
      const products = db.products.getAll();
      return products.find(p => p.id === id);
    },
    add: (product: Product) => {
      const products = db.products.getAll();
      products.push(product);
      safeSetItem(KEYS.PRODUCTS, JSON.stringify(products));
    },
    update: (product: Product) => {
      const products = db.products.getAll();
      const index = products.findIndex(p => p.id === product.id);
      if (index !== -1) {
        products[index] = product;
        safeSetItem(KEYS.PRODUCTS, JSON.stringify(products));
      }
    },
    delete: (id: string) => {
        const products = db.products.getAll();
        const filtered = products.filter(p => p.id !== id);
        safeSetItem(KEYS.PRODUCTS, JSON.stringify(filtered));
    },
    saveAll: (products: Product[]) => {
      safeSetItem(KEYS.PRODUCTS, JSON.stringify(products));
    }
  },
  quotations: {
    getAll: (): Quotation[] => {
      return JSON.parse(localStorage.getItem(KEYS.QUOTATIONS) || '[]');
    },
    add: (quote: Quotation) => {
      const quotes = db.quotations.getAll();
      quotes.push(quote);
      safeSetItem(KEYS.QUOTATIONS, JSON.stringify(quotes));
    },
    update: (quote: Quotation) => {
        const quotes = db.quotations.getAll();
        const index = quotes.findIndex(q => q.id === quote.id);
        if(index !== -1) {
            quotes[index] = quote;
            safeSetItem(KEYS.QUOTATIONS, JSON.stringify(quotes));
        }
    },
    delete: (id: string) => {
        const quotes = db.quotations.getAll();
        const filtered = quotes.filter(q => q.id !== id);
        safeSetItem(KEYS.QUOTATIONS, JSON.stringify(filtered));
    }
  }
};