import React, { useState, useEffect } from 'react';
import { Search, SlidersHorizontal, Image as ImageIcon } from 'lucide-react';
import { Product, ProductCategory } from '../types';
import { db } from '../services/db';
import { ProductCard } from '../components/ProductCard';
import { useCart } from '../App';

// Enhanced Skeleton Component that mirrors ProductCard structure precisely
const ProductSkeleton = () => (
  <div className="bg-white rounded-lg border border-gray-100 overflow-hidden flex flex-col h-full shadow-sm">
    {/* Image placeholder matches aspect-square of ProductCard */}
    <div className="aspect-square bg-gray-100 animate-pulse relative">
      <div className="absolute inset-0 flex items-center justify-center opacity-30">
        <ImageIcon className="text-gray-300" size={32} />
      </div>
    </div>
    
    <div className="p-6 flex flex-col flex-grow">
      <div className="mb-4 space-y-2">
        {/* Code Skeleton */}
        <div className="h-3 bg-gray-100 rounded w-1/3 animate-pulse"></div>
        {/* Title Skeleton - 2 lines */}
        <div className="h-6 bg-gray-100 rounded w-full animate-pulse"></div>
        <div className="h-6 bg-gray-100 rounded w-2/3 animate-pulse"></div>
      </div>
      
      <div className="mt-auto pt-5 flex items-end justify-between border-t border-gray-50">
        <div className="space-y-1">
          {/* Label Skeleton */}
          <div className="h-2 bg-gray-100 rounded w-12 animate-pulse"></div>
          {/* Price Skeleton */}
          <div className="h-7 bg-gray-100 rounded w-24 animate-pulse"></div>
        </div>
        {/* Button Skeleton */}
        <div className="h-12 w-12 bg-gray-100 rounded-2xl animate-pulse"></div>
      </div>
    </div>
  </div>
);

export const Catalog: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { addToCart } = useCart();

  useEffect(() => {
    // Simulate network delay for realistic feel
    const timer = setTimeout(() => {
        const allProducts = db.products.getAll();
        // Sort by active status first, then by name
        allProducts.sort((a, b) => (a.isActive === b.isActive ? 0 : a.isActive ? -1 : 1));
        setProducts(allProducts);
        setFilteredProducts(allProducts);
        setIsLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let result = products;

    if (selectedCategory !== 'All') {
      result = result.filter(p => p.category === selectedCategory);
    }

    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(lowerQuery) || 
        p.code.toLowerCase().includes(lowerQuery) ||
        p.category.toLowerCase().includes(lowerQuery)
      );
    }

    setFilteredProducts(result);
  }, [selectedCategory, searchQuery, products]);

  const categories = ['All', ...Object.values(ProductCategory)];

  // Function to handle viewing details (placeholder for now)
  const handleViewDetails = (product: Product) => {
    // This could open a modal or navigate to a details page
    // For now, it's just a placeholder to satisfy the ProductCard prop
    console.log("View details for:", product.name);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        
        {/* Mobile Filter Toggle */}
        <div className="md:hidden flex items-center justify-between mb-4">
          <h2 className="text-xl font-serif font-bold">Catalog</h2>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 bg-white border border-gray-200 rounded-md text-gray-600"
          >
            <SlidersHorizontal size={20} />
          </button>
        </div>

        {/* Sidebar / Filters */}
        <aside className={`
          md:w-64 flex-shrink-0 space-y-8
          ${isSidebarOpen ? 'block' : 'hidden md:block'}
        `}>
          <div>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Categories</h3>
            <div className="space-y-2">
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => {
                    setSelectedCategory(category);
                    setIsSidebarOpen(false);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={`block w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    selectedCategory === category 
                      ? 'bg-accent text-white font-medium shadow-md' 
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1">
          {/* Search Bar */}
          <div className="mb-8 relative max-w-xl">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search furniture by name, code, or category..."
              className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-lg leading-5 bg-white placeholder-gray-400 focus:outline-none focus:placeholder-gray-300 focus:ring-2 focus:ring-accent focus:border-accent sm:text-sm shadow-sm transition-shadow"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Product Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => <ProductSkeleton key={i} />)}
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
              {filteredProducts.map((product, index) => (
                <ProductCard 
                  key={product.id} 
                  product={product} 
                  onAddToCart={addToCart}
                  onViewDetails={handleViewDetails}
                  priority={index < 6}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-white rounded-lg border border-gray-100 dashed">
              <div className="mx-auto h-12 w-12 text-gray-300 mb-4">
                <Search size={48} />
              </div>
              <h3 className="text-lg font-medium text-gray-900">No products found</h3>
              <p className="mt-1 text-gray-500">Try adjusting your search or filter to find what you're looking for.</p>
              <button 
                onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }}
                className="mt-4 text-accent hover:text-accent-hover font-medium text-sm"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};