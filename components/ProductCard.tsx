import React, { useState } from 'react';
import { Plus, Image as ImageIcon } from 'lucide-react';
import { Product } from '../types';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  onViewDetails: (product: Product) => void;
  priority?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart, onViewDetails, priority = false }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  return (
    <div className="group bg-white rounded-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-500 flex flex-col h-full">
      {/* Image Container with fixed aspect-ratio to eliminate layout shift (CLS) */}
      <div 
        className="relative aspect-square overflow-hidden bg-gray-50 cursor-pointer"
        onClick={() => onViewDetails(product)}
      >
        {/* Professional Placeholder / Skeleton */}
        <div 
          className={`absolute inset-0 bg-gray-100 flex items-center justify-center transition-opacity duration-700 ease-in-out ${isLoaded ? 'opacity-0' : 'opacity-100'}`}
          aria-hidden="true"
        >
          <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 animate-pulse flex items-center justify-center">
            <ImageIcon className="text-gray-300" size={32} />
          </div>
        </div>
        
        {!hasError ? (
          <img 
            src={product.images[0]} 
            alt={product.name} 
            loading={priority ? "eager" : "lazy"}
            // @ts-ignore - fetchpriority is a valid performance hint
            fetchpriority={priority ? "high" : "low"}
            decoding="async"
            onLoad={() => setIsLoaded(true)}
            onError={() => {
              setHasError(true);
              setIsLoaded(true);
            }}
            className={`w-full h-full object-cover object-center group-hover:scale-105 transition-all duration-1000 ease-out ${isLoaded ? 'opacity-100' : 'opacity-0 scale-110'}`}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50 p-4">
            <ImageIcon size={24} className="mb-2 opacity-50" />
            <span className="text-[10px] font-black uppercase tracking-tighter">Asset Unavailable</span>
          </div>
        )}
        
        {!product.isActive && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center z-10">
            <span className="px-5 py-2 bg-primary text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-full shadow-2xl">
              Out of Stock
            </span>
          </div>
        )}

        {/* Dynamic UI Overlays */}
        <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end p-5 pointer-events-none">
           <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-lg shadow-xl translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
             <span className="text-[10px] font-black text-primary uppercase tracking-widest">View Selection Details</span>
           </div>
        </div>
      </div>
      
      <div className="p-6 flex flex-col flex-grow">
        <div className="mb-4">
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.25em] mb-1.5">{product.code}</p>
          <h3 
            className="font-serif text-lg font-bold text-gray-900 leading-tight cursor-pointer hover:text-accent transition-colors line-clamp-2"
            onClick={() => onViewDetails(product)}
          >
            {product.name}
          </h3>
        </div>
        
        <div className="mt-auto pt-5 flex items-end justify-between border-t border-gray-50">
          <div className="flex flex-col">
            <span className="text-[8px] text-gray-400 font-black uppercase tracking-[0.2em] mb-0.5">Investment</span>
            <span className="text-xl font-bold text-accent">
              ₱{product.sellingPrice.toLocaleString()}
            </span>
          </div>
          
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart(product);
            }}
            disabled={!product.isActive}
            className={`group/btn relative h-12 w-12 flex items-center justify-center rounded-2xl transition-all duration-500 shadow-sm ${
              product.isActive 
                ? 'bg-primary text-white hover:bg-accent hover:shadow-2xl hover:-translate-y-1.5 active:scale-90 active:translate-y-0' 
                : 'bg-gray-100 text-gray-300 cursor-not-allowed'
            }`}
            aria-label="Add to Inquiry Cart"
          >
            <Plus size={24} className="group-hover/btn:rotate-180 transition-transform duration-700" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-accent rounded-full scale-0 group-hover/btn:scale-100 transition-transform duration-500 delay-100 border-2 border-white"></div>
          </button>
        </div>
      </div>
    </div>
  );
};