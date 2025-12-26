import React, { useState, useEffect } from 'react';
import { Search, SlidersHorizontal, Image as ImageIcon } from 'lucide-react';
import { Product, ProductCategory } from '../types';
import { db } from '../services/db';
import { ProductCard } from '../components/ProductCard';
import { useCart } from '../App';

// Enhanced Skeleton Component for improved perceived performance
const ProductSkeleton = () => (
  <div className="bg-white rounded-lg border border-gray-100 overflow-hidden flex flex-col h-full animate-pulse shadow-sm">
    <div className="aspect-square bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
      <ImageIcon className="text-gray-200" size={32} />
    </div>
    <div className="p-6 space-y-4">
      <div className="h-2 w-16 bg-gray-100 rounded-full"></div>
      <div className="space-y-2">
        <div className="h-4 w-full bg-gray-100 rounded-md"></div>
        <div className="h-4 w-2/3 bg-gray-100 rounded-md"></div>
      </div>
      <div className="mt-auto pt-6 flex justify-between items-end border-t border-gray-50/50">
        <div className="space-y-2">
          <div className="h-2 w-10 bg-gray-100 rounded-full"></div>
          <div className="h-7 w-28 bg-gray-100 rounded-md"></div>
        </div>
        <div className="h-12 w-12 bg-gray-100 rounded-2xl"></div>
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
    // Immediate load in production, simulated slight delay for initial skeleton reveal
    const timer = setTimeout(() => {
      setProducts(db.products.getAll());
      setIsLoading(false);
    }, 450);
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
    alert(`Selection Specifications for: ${p.name}\n\nDimensions: ${p.dimensions || 'Contact for custom sizing'}\n\nDescription: ${p.description || 'Premium quality office solution with modern aesthetics.'}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-16">
      {/* Dynamic Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-8">
        <div className="max-w-xl">
          <h1 className="text-5xl font-serif font-bold text-gray-900 mb-4 tracking-tight">Curation of <span className="text-accent italic">Excellence</span></h1>
          <p className="text-sm text-gray-500 font-medium leading-relaxed">Browse our collection of executive-grade furniture. Every piece is engineered for ergonomics and crafted for professional durability.</p>
        </div>
        
        <div className="flex w-full md:w-auto gap-3">
          <div className="relative flex-grow md:flex-grow-0 group">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-accent transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Search by model or series..." 
              className="w-full md:w-80 pl-11 pr-4 py-3.5 bg-white border border-gray-200 rounded-full shadow-sm focus:outline-none focus:ring-4 focus:ring-accent/5 focus:border-accent transition-all text-sm font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            className="md:hidden p-3.5 bg-white border border-gray-200 rounded-full text-gray-600 shadow-sm active:bg-gray-50"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            <SlidersHorizontal size={20} />
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-12">
        {/* Sidebar Navigation Filters */}
        <aside className={`
          fixed md:relative inset-y-0 left-0 z-40 w-72 bg-white transform transition-transform duration-500 ease-in-out md:translate-x-0 border-r md:border-r-0 border-gray-100 p-8 md:p-0 overflow-y-auto
          ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
        `}>
          <div className="md:sticky md:top-28">
            <div className="flex items-center justify-between mb-8 md:hidden">
              <span className="font-black uppercase tracking-[0.2em] text-xs">Categories</span>
              <button onClick={() => setIsSidebarOpen(false)} className="text-gray-400 p-2 hover:bg-gray-100 rounded-full transition-colors">Close</button>
            </div>
            
            <h3 className="font-black text-gray-400 mb-6 uppercase tracking-[0.25em] text-[10px]">Collection Series</h3>
            <div className="space-y-1.5">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedCategory(cat);
                    setIsSidebarOpen(false);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={`w-full text-left px-5 py-3.5 rounded-xl text-xs font-bold transition-all duration-300 ${
                    selectedCategory === cat 
                      ? 'bg-primary text-white shadow-xl translate-x-2' 
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 hover:translate-x-1'
                  }`}
                >
                  <span className="flex items-center justify-between">
                    {cat}
                    {selectedCategory === cat && <div className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />}
                  </span>
                </button>
              ))}
            </div>
            
            <div className="mt-12 p-6 bg-accent/5 rounded-2xl border border-accent/10">
               <p className="text-[10px] font-black uppercase tracking-widest text-accent mb-2">Service Note</p>
               <p className="text-[11px] text-accent/80 leading-relaxed font-medium">All prices include our standard 10% administrative service fee for fulfillment and quality assurance.</p>
            </div>
          </div>
        </aside>

        {/* Backdrop Overlay for Mobile Sidebar */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-primary/20 backdrop-blur-md z-30 md:hidden animate-in fade-in duration-500"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Main Product Display Area */}
        <div className="flex-1 min-h-[600px]">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {[...Array(6)].map((_, i) => <ProductSkeleton key={i} />)}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-40 bg-white rounded-3xl border-2 border-dashed border-gray-100 flex flex-col items-center animate-in fade-in zoom-in-95 duration-700">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6 text-gray-200">
                <Search size={36} />
              </div>
              <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">No Matching Series Found</p>
              <p className="text-gray-400 text-xs mt-2 italic font-medium">Try adjusting your keywords or category selection.</p>
              <button 
                onClick={() => {setSearchTerm(''); setSelectedCategory('All');}}
                className="mt-8 px-6 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] text-accent bg-accent/5 rounded-full hover:bg-accent hover:text-white transition-all shadow-sm active:scale-95"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-out">
              {filteredProducts.map((product, index) => (
                <ProductCard 
                  key={product.id} 
                  product={product} 
                  onAddToCart={addToCart}
                  onViewDetails={handleDetailClick}
                  // Prioritize the first 6 items (visible area) for better LCP
                  priority={index < 6}
                />
              ))}
            </div>
          )}
          
          {!isLoading && filteredProducts.length > 0 && (
             <div className="mt-24 text-center pb-12">
                <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.4em]">End of Collection Catalog</p>
                <div className="mt-6 inline-block h-1 w-16 bg-gray-100 rounded-full"></div>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};