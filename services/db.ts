import { Product, Quotation } from '../types';
import { INITIAL_PRODUCTS } from './initialData';

const KEYS = {
  PRODUCTS: 'obra_products',
  QUOTATIONS: 'obra_quotations',
  CART: 'obra_cart',
  ADMIN_AUTH: 'obra_admin_auth'
};

// Initialize DB if empty
const initDB = () => {
  if (!localStorage.getItem(KEYS.PRODUCTS)) {
    localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
  }
  if (!localStorage.getItem(KEYS.QUOTATIONS)) {
    localStorage.setItem(KEYS.QUOTATIONS, JSON.stringify([]));
  }
};

initDB();

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
      localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(products));
    },
    update: (product: Product) => {
      const products = db.products.getAll();
      const index = products.findIndex(p => p.id === product.id);
      if (index !== -1) {
        products[index] = product;
        localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(products));
      }
    },
    delete: (id: string) => {
        const products = db.products.getAll();
        const filtered = products.filter(p => p.id !== id);
        localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(filtered));
    },
    saveAll: (products: Product[]) => {
      localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(products));
    }
  },
  quotations: {
    getAll: (): Quotation[] => {
      return JSON.parse(localStorage.getItem(KEYS.QUOTATIONS) || '[]');
    },
    add: (quote: Quotation) => {
      const quotes = db.quotations.getAll();
      quotes.push(quote);
      localStorage.setItem(KEYS.QUOTATIONS, JSON.stringify(quotes));
    },
    update: (quote: Quotation) => {
        const quotes = db.quotations.getAll();
        const index = quotes.findIndex(q => q.id === quote.id);
        if(index !== -1) {
            quotes[index] = quote;
            localStorage.setItem(KEYS.QUOTATIONS, JSON.stringify(quotes));
        }
    }
  }
};