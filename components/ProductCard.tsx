import React, { useState } from 'react';
import { Plus, Image as ImageIcon } from 'lucide-react';
import { Product } from '../types';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  onViewDetails: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart, onViewDetails }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  return (
    <div className="group bg-white rounded-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col h-full">
      {/* Image Container with aspect-ratio to prevent Layout Shift */}
      <div 
        className="relative aspect-square overflow-hidden bg-gray-50 cursor-pointer"
        onClick={() => onViewDetails(product)}
      >
        {/* Skeleton / Placeholder Background */}
        <div 
          className={`absolute inset-0 bg-gray-100 flex items-center justify-center transition-opacity duration-500 ${isLoaded ? 'opacity-0' : 'opacity-100'}`}
          aria-hidden="true"
        >
          <div className="w-full h-full bg-gray-200 animate-pulse flex items-center justify-center">
            <ImageIcon className="text-gray-300" size={32} />
          </div>
        </div>
        
        {!hasError ? (
          <img 
            src={product.images[0]} 
            alt={product.name} 
            loading="lazy"
            decoding="async"
            onLoad={() => setIsLoaded(true)}
            onError={() => {
              setHasError(true);
              setIsLoaded(true);
            }}
            className={`w-full h-full object-cover object-center group-hover:scale-110 transition-all duration-700 ease-out ${isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'}`}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50 p-4">
            <ImageIcon size={24} className="mb-2 opacity-50" />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Image Unavailable</span>
          </div>
        )}
        
        {!product.isActive && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center">
            <span className="px-4 py-1.5 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg">
              Out of Stock
            </span>
          </div>
        )}

        {/* Quick View Hover Indicator */}
        <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4 pointer-events-none">
           <span className="text-[10px] font-bold text-white bg-black/20 backdrop-blur-md px-2 py-1 rounded">Click for Details</span>
        </div>
      </div>
      
      <div className="p-5 flex flex-col flex-grow">
        <div className="mb-3">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{product.code}</p>
          <h3 
            className="font-serif text-lg font-bold text-gray-900 leading-tight cursor-pointer hover:text-accent transition-colors line-clamp-2"
            onClick={() => onViewDetails(product)}
          >
            {product.name}
          </h3>
        </div>
        
        <div className="mt-auto pt-4 flex items-end justify-between border-t border-gray-50">
          <div className="flex flex-col">
            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Investment</span>
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
            className={`group/btn relative h-11 w-11 flex items-center justify-center rounded-full transition-all duration-300 ${
              product.isActive 
                ? 'bg-primary text-white hover:bg-accent hover:shadow-lg hover:-translate-y-1' 
                : 'bg-gray-100 text-gray-300 cursor-not-allowed'
            }`}
            aria-label="Add to Cart"
          >
            <Plus size={22} className="group-hover/btn:rotate-90 transition-transform duration-300" />
          </button>
        </div>
      </div>
    </div>
  );
};