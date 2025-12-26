import React, { useState, useEffect } from 'react';
import { Search, SlidersHorizontal, Image as ImageIcon } from 'lucide-react';
import { Product, ProductCategory } from '../types';
import { db } from '../services/db';
import { ProductCard } from '../components/ProductCard';
import { useCart } from '../App';

// Skeleton Component for loading state
const ProductSkeleton = () => (
  <div className="bg-white rounded-lg border border-gray-100 overflow-hidden flex flex-col h-full animate-pulse">
    <div className="aspect-square bg-gray-200 flex items-center justify-center">
      <ImageIcon className="text-gray-300" size={32} />
    </div>
    <div className="p-5 space-y-3">
      <div className="h-2 w-16 bg-gray-200 rounded"></div>
      <div className="h-4 w-full bg-gray-200 rounded"></div>
      <div className="h-4 w-2/3 bg-gray-200 rounded"></div>
      <div className="mt-auto pt-4 flex justify-between items-end">
        <div className="space-y-2">
          <div className="h-2 w-10 bg-gray-200 rounded"></div>
          <div className="h-6 w-24 bg-gray-200 rounded"></div>
        </div>
        <div className="h-11 w-11 bg-gray-200 rounded-full"></div>
      </div>
    </div>
  </div>
);

export const Catalog: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { addToCart } = useCart();

  useEffect(() => {
    // Simulate initial loading to showcase skeleton states
    const timer = setTimeout(() => {
      setProducts(db.products.getAll());
      setIsLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  const categories = ['All', ...Object.values(ProductCategory)];

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          product.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleDetailClick = (p: Product) => {
    alert(`Details for ${p.name}\n\nDimensions: ${p.dimensions || 'Contact for info'}\n\nDescription: ${p.description || 'Premium quality office furniture.'}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      {/* Top Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
        <div>
          <h1 className="text-4xl font-serif font-bold text-gray-900 mb-2">Workspace Solutions</h1>
          <p className="text-sm text-gray-500 max-w-md">Discover our curated collection of ergonomic office furniture designed for peak performance.</p>
        </div>
        
        <div className="flex w-full md:w-auto gap-2">
          <div className="relative flex-grow md:flex-grow-0 group">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-accent transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Search by name or code..." 
              className="w-full md:w-72 pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            className="md:hidden p-3 bg-white border border-gray-200 rounded-full text-gray-600 shadow-sm"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            <SlidersHorizontal size={20} />
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-10">
        {/* Sidebar Filters */}
        <aside className={`
          fixed md:relative inset-y-0 left-0 z-40 w-72 bg-white transform transition-transform duration-300 ease-in-out md:translate-x-0 border-r md:border-r-0 border-gray-100 p-8 md:p-0 overflow-y-auto
          ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
        `}>
          <div className="md:sticky md:top-28">
            <div className="flex items-center justify-between mb-6 md:hidden">
              <span className="font-bold text-lg">Filters</span>
              <button onClick={() => setIsSidebarOpen(false)} className="text-gray-400">Close</button>
            </div>
            <h3 className="font-bold text-gray-900 mb-5 uppercase tracking-widest text-[10px]">Collection Categories</h3>
            <div className="space-y-1">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedCategory(cat);
                    setIsSidebarOpen(false);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-all ${
                    selectedCategory === cat 
                      ? 'bg-primary text-white font-bold shadow-md translate-x-1' 
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Overlay for Mobile Sidebar */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 md:hidden animate-in fade-in"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Product Grid */}
        <div className="flex-1">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {[...Array(6)].map((_, i) => <ProductSkeleton key={i} />)}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-32 bg-white rounded-2xl border-2 border-dashed border-gray-100 flex flex-col items-center">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 text-gray-300">
                <Search size={32} />
              </div>
              <p className="text-gray-500 font-medium">No results found for your search.</p>
              <button 
                onClick={() => {setSearchTerm(''); setSelectedCategory('All');}}
                className="mt-4 text-accent hover:text-accent-hover font-bold text-sm underline decoration-accent/30 underline-offset-4"
              >
                Reset all filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {filteredProducts.map(product => (
                <ProductCard 
                  key={product.id} 
                  product={product} 
                  onAddToCart={addToCart}
                  onViewDetails={handleDetailClick}
                />
              ))}
            </div>
          )}
          
          {!isLoading && filteredProducts.length > 0 && (
             <div className="mt-16 text-center">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">End of Collection</p>
                <div className="mt-4 inline-block h-1 w-12 bg-gray-100 rounded-full"></div>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};