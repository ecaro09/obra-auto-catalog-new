import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../services/db';
import { Product, Quotation, ProductCategory } from '../../types';
import { Package, FileText, LogOut, Plus, X, Upload, Star, Trash2, CheckSquare, Lock, Loader2, Image as ImageIcon, Link as LinkIcon, Menu, Search, Printer, User, CreditCard, DollarSign, Sparkles, BrainCircuit } from 'lucide-react';
import { generateQuotationPDF } from '../../utils/pdfGenerator';
import { GoogleGenAI, Type } from "@google/genai";

export const AdminDashboard: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<'products' | 'quotes' | 'settings'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [quotes, setQuotes] = useState<Quotation[]>([]);
  
  // Product Search & Editing
  const [productSearch, setProductSearch] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  // Quote Search & Editing
  const [quoteSearch, setQuoteSearch] = useState('');
  const [editingQuote, setEditingQuote] = useState<Quotation | null>(null);

  const [imageUrlInput, setImageUrlInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isDraggingOverZone, setIsDraggingOverZone] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  
  // Mobile Sidebar State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Bulk Selection State for Table
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshData = () => {
    setProducts(db.products.getAll());
    setQuotes(db.quotations.getAll().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  };

  useEffect(() => {
    refreshData();
  }, []);

  // --- Gemini Intelligence ---

  const handleAiBulkCategorize = async () => {
    if (selectedIds.size === 0) return;
    setIsAiProcessing(true);
    
    try {
      const selectedProducts = products.filter(p => selectedIds.has(p.id));
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Analyze the following office furniture products and assign them the MOST APPROPRIATE category from the provided list.
        
        Available Categories: ${Object.values(ProductCategory).join(', ')}
        
        Products to categorize:
        ${selectedProducts.map(p => `- Name: ${p.name}, Code: ${p.code}, Desc: ${p.description}`).join('\n')}
        
        Return ONLY a JSON array of objects with "id" and "suggestedCategory" keys. No other text.`,
        config: {
          thinkingConfig: { thinkingBudget: 32768 },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                suggestedCategory: { type: Type.STRING }
              },
              required: ['id', 'suggestedCategory']
            }
          }
        }
      });

      const suggestions = JSON.parse(response.text || '[]');
      
      if (Array.isArray(suggestions)) {
        const updatedProducts = products.map(p => {
          const suggestion = suggestions.find(s => s.id === p.id);
          if (suggestion && Object.values(ProductCategory).includes(suggestion.suggestedCategory as ProductCategory)) {
            return { ...p, category: suggestion.suggestedCategory };
          }
          return p;
        });
        
        db.products.saveAll(updatedProducts);
        refreshData();
        setSelectedIds(new Set());
      }
    } catch (err) {
      console.error("AI Bulk Categorization failed", err);
    } finally {
      setIsAiProcessing(false);
    }
  };

  const handleAiEnhanceDescription = async () => {
    if (!editingProduct) return;
    setIsAiProcessing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Act as a high-end furniture copywriter. Generate a professional, compelling product description for this office furniture:
        Code: ${editingProduct.code}
        Name: ${editingProduct.name}
        Category: ${editingProduct.category}
        Current Description: ${editingProduct.description}
        Keep it concise (2-3 sentences) and emphasize quality and professional aesthetics.`,
      });
      
      const newDesc = response.text;
      if (newDesc) {
        setEditingProduct({ ...editingProduct, description: newDesc });
      }
    } catch (err) {
      console.error("AI Enhancement failed", err);
    } finally {
      setIsAiProcessing(false);
    }
  };

  /**
   * AI-Powered Strategic Quote Analysis
   * Uses Gemini 3 Pro with deep thinking to provide sales guidance
   */
  const handleAiAnalyzeQuote = async () => {
    if (!editingQuote) return;
    setIsAiProcessing(true);
    setAiAnalysis(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `You are a Senior Sales Strategist for OBRA Office Furniture. 
        Analyze this quotation and provide high-impact, professional advice to help the sales manager close the deal with maximum value.
        
        QUOTE DATA:
        Reference: ${editingQuote.number}
        Customer: ${editingQuote.customer.name}
        Company: ${editingQuote.customer.company}
        Items Selected: ${editingQuote.items.map(i => `${i.name} (Code: ${i.code}) x${i.quantity} @ ₱${i.sellingPrice}`).join(', ')}
        Total Value: ₱${editingQuote.subtotal}
        
        PLEASE PROVIDE:
        1. UPSELL OPPORTUNITIES: Identify logical additions (e.g., if desks are ordered, suggest ergonomic chairs or pedestals).
        2. BUNDLING STRATEGY: Suggest a "Standard Package" discount if they add a specific missing item.
        3. MARGIN & DISCOUNT GUIDANCE: Advise on the maximum safe discount for this specific volume to keep the deal profitable.
        4. CLOSING TACTIC: A personalized follow-up strategy for this specific customer/company.
        
        Keep the tone professional, encouraging, and data-driven.`,
        config: {
          thinkingConfig: { thinkingBudget: 32768 }
        }
      });
      
      setAiAnalysis(response.text || "Strategic analysis unavailable at this moment.");
    } catch (err) {
      console.error("AI Analysis failed", err);
      setAiAnalysis("The AI Strategist is currently over-capacity. Please try again in a few moments.");
    } finally {
      setIsAiProcessing(false);
    }
  };

  // --- Derived State for Searching ---
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
    p.code.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.category.toLowerCase().includes(productSearch.toLowerCase())
  );

  const filteredQuotes = quotes.filter(q => 
    q.number.toLowerCase().includes(quoteSearch.toLowerCase()) ||
    q.customer.name.toLowerCase().includes(quoteSearch.toLowerCase()) ||
    q.status.toLowerCase().includes(quoteSearch.toLowerCase())
  );

  // --- Product Handlers ---
  const handleAddNewProduct = () => {
    const newProduct: Product = {
      id: crypto.randomUUID(),
      code: '',
      name: '',
      category: ProductCategory.Other,
      originalPrice: 0,
      sellingPrice: 0,
      images: [],
      isLocked: false,
      isActive: true,
      description: '',
      dimensions: ''
    };
    setEditingProduct(newProduct);
    setImageUrlInput('');
  };

  const handleEditClick = (product: Product) => {
    setEditingProduct(product);
    setImageUrlInput('');
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProduct) {
      const exists = products.find(p => p.id === editingProduct.id);
      if (exists) {
        db.products.update(editingProduct);
      } else {
        db.products.add(editingProduct);
      }
      setEditingProduct(null);
      refreshData();
    }
  };

  // --- Quote Handlers ---
  const handleEditQuote = (quote: Quotation) => {
    setAiAnalysis(null);
    setEditingQuote({ ...quote });
  };

  const handleSaveQuote = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingQuote) {
        const total = editingQuote.subtotal + editingQuote.deliveryFee - editingQuote.discount;
        const updatedQuote = { ...editingQuote, grandTotal: total };
        db.quotations.update(updatedQuote);
        setEditingQuote(null);
        refreshData();
    }
  };

  // --- Bulk Management Functions ---
  const handleBulkStatusChange = (isActive: boolean) => {
    const updatedProducts = products.map(p => {
      if (selectedIds.has(p.id)) return { ...p, isActive };
      return p;
    });
    db.products.saveAll(updatedProducts);
    refreshData();
    setSelectedIds(new Set());
  };

  const handleBulkCategoryChange = (category: string) => {
    if (!category) return;
    const updatedProducts = products.map(p => {
      if (selectedIds.has(p.id)) return { ...p, category };
      return p;
    });
    db.products.saveAll(updatedProducts);
    refreshData();
    setSelectedIds(new Set());
  };

  const handleBulkDelete = () => {
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} products?`)) return;
    const remainingProducts = products.filter(p => !selectedIds.has(p.id) || p.isLocked);
    db.products.saveAll(remainingProducts);
    refreshData();
    setSelectedIds(new Set());
  };

  // --- Image Management ---
  const handleAddImageUrl = (e?: React.MouseEvent | React.FormEvent) => {
    e?.preventDefault();
    const url = imageUrlInput.trim();
    if (!url || !url.startsWith('http')) return;
    if (editingProduct) {
      if (!editingProduct.images.includes(url)) {
        setEditingProduct({ ...editingProduct, images: [...editingProduct.images, url] });
      }
      setImageUrlInput('');
    }
  };

  const processFiles = async (files: FileList) => {
    if (!editingProduct) return;
    setIsUploading(true);
    
    try {
      const fileArray = Array.from(files);
      const uploadPromises = fileArray.map((file: File) => {
        return new Promise<string>((resolve, reject) => {
          if (!file.type.startsWith('image/')) {
            return reject(new Error(`${file.name} is not an image.`));
          }
          if (file.size > 5 * 1024 * 1024) {
            return reject(new Error(`${file.name} exceeds 5MB limit.`));
          }
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
          reader.readAsDataURL(file);
        });
      });

      const results = await Promise.allSettled(uploadPromises);
      const newImages = results
        .filter((result): result is PromiseFulfilledResult<string> => result.status === 'fulfilled')
        .map(result => result.value);

      if (newImages.length > 0) {
        setEditingProduct(prev => {
          if (!prev) return null;
          const uniqueNewImages = newImages.filter(img => !prev.images.includes(img));
          return { ...prev, images: [...prev.images, ...uniqueNewImages] };
        });
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
    e.target.value = ''; 
  };

  const handleZoneDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOverZone(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const removeImage = (index: number) => {
    if (editingProduct) {
      const newImages = [...editingProduct.images];
      newImages.splice(index, 1);
      setEditingProduct({ ...editingProduct, images: newImages });
    }
  };

  const setPrimaryImage = (index: number) => {
    if (editingProduct) {
      const newImages = [...editingProduct.images];
      const [selected] = newImages.splice(index, 1);
      newImages.unshift(selected); 
      setEditingProduct({ ...editingProduct, images: newImages });
    }
  };

  // --- Bulk Selection Handlers ---
  const toggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const newSelected = new Set(selectedIds);
      filteredProducts.forEach(p => newSelected.add(p.id));
      setSelectedIds(newSelected);
    } else {
      const newSelected = new Set(selectedIds);
      filteredProducts.forEach(p => newSelected.delete(p.id));
      setSelectedIds(newSelected);
    }
  };

  const toggleSelectOne = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedIds(newSelected);
  };

  const isAllSelected = filteredProducts.length > 0 && filteredProducts.every(p => selectedIds.has(p.id));

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />}

      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 flex flex-col transition-transform duration-300 md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <span className="text-xl font-bold text-primary font-serif">OBRA Admin</span>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-400"><X size={20} /></button>
        </div>
        <nav className="p-4 space-y-2 flex-grow">
          <button onClick={() => { setActiveTab('products'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'products' ? 'bg-primary text-white shadow-lg' : 'text-gray-600 hover:bg-gray-50'}`}>
            <Package size={20} /> <span className="font-medium">Products</span>
          </button>
          <button onClick={() => { setActiveTab('quotes'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'quotes' ? 'bg-primary text-white shadow-lg' : 'text-gray-600 hover:bg-gray-50'}`}>
            <FileText size={20} /> <span className="font-medium">Quotations</span>
          </button>
        </nav>
        <div className="p-4 border-t border-gray-100">
          <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50">
            <LogOut size={20} /> <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto p-4 md:p-8 relative w-full pb-32">
        {activeTab === 'products' && (
          <div>
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
              <div className="flex items-center gap-3">
                <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 text-gray-600 md:hidden"><Menu size={24} /></button>
                <h2 className="text-2xl md:text-3xl font-serif font-bold text-gray-900">Inventory</h2>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                <div className="relative group w-full md:w-64">
                   <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-accent" size={16} />
                   <input 
                    type="text" 
                    placeholder="Search catalog..." 
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full pl-11 pr-4 py-2.5 bg-white border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 shadow-sm"
                   />
                </div>
                <button className="flex items-center justify-center gap-2 px-6 py-2.5 bg-accent text-white rounded-full hover:bg-accent-hover transition-all shadow-md font-bold uppercase tracking-widest text-xs" onClick={handleAddNewProduct}>
                  <Plus size={18} /> <span>New Product</span>
                </button>
              </div>
            </div>

            {selectedIds.size > 0 && (
              <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-primary/95 backdrop-blur-md text-white px-6 py-4 rounded-3xl shadow-2xl flex flex-wrap items-center gap-6 border border-white/10 animate-in slide-in-from-bottom-8 duration-500">
                <div className="flex items-center gap-3 pr-6 border-r border-white/10">
                  <div className="bg-accent rounded-lg p-2 flex items-center justify-center"><CheckSquare size={18} /></div>
                  <span className="font-black text-sm">{selectedIds.size} Selected</span>
                </div>
                <div className="flex flex-wrap items-center gap-6">
                  <select className="bg-white/5 border border-white/20 rounded-xl px-4 py-2 text-xs font-bold text-white focus:outline-none transition [&>option]:text-gray-900" onChange={(e) => handleBulkCategoryChange(e.target.value)} value="">
                    <option value="" disabled>Move Category...</option>
                    {Object.values(ProductCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                  <button onClick={handleAiBulkCategorize} disabled={isAiProcessing} className="flex items-center gap-2 px-4 py-2 bg-accent/20 text-accent rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-accent hover:text-white transition disabled:opacity-50">
                    {isAiProcessing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    AI Organize
                  </button>
                  <button onClick={() => handleBulkStatusChange(true)} className="px-3 py-1.5 bg-green-500/10 text-green-400 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-green-500 hover:text-white transition">Show</button>
                  <button onClick={() => handleBulkStatusChange(false)} className="px-3 py-1.5 bg-red-500/10 text-red-400 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition">Hide</button>
                  <button onClick={handleBulkDelete} className="p-2.5 bg-white/5 text-gray-400 rounded-xl hover:bg-red-600 hover:text-white transition"><Trash2 size={16} /></button>
                </div>
                <button onClick={() => setSelectedIds(new Set())} className="ml-4 p-2 text-gray-500 hover:text-white transition"><X size={20} /></button>
              </div>
            )}
            
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50/50">
                    <tr>
                      <th className="px-6 py-4 text-left w-10">
                        <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-accent accent-primary" checked={isAllSelected} onChange={toggleSelectAll} />
                      </th>
                      <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Product Details</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] hidden md:table-cell">Category</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Price</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] hidden sm:table-cell">Status</th>
                      <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {filteredProducts.map(product => (
                      <tr key={product.id} className={`transition-colors ${selectedIds.has(product.id) ? 'bg-accent/5' : 'hover:bg-gray-50/50'}`}>
                        <td className="px-6 py-4">
                          <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-accent accent-primary" checked={selectedIds.has(product.id)} onChange={() => toggleSelectOne(product.id)} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                              {product.images[0] ? <img className="h-full w-full object-cover" src={product.images[0]} alt="" /> : <ImageIcon className="h-full w-full p-2 text-gray-300" />}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-bold text-gray-900 truncate max-w-[150px]">{product.name}</div>
                              <div className="text-[10px] font-mono text-gray-400 uppercase">{product.code}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap hidden md:table-cell"><span className="text-[10px] font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded uppercase">{product.category}</span></td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-accent">₱{product.sellingPrice.toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                          <span className={`px-2 py-0.5 inline-flex text-[9px] font-black uppercase tracking-widest rounded-full ${product.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{product.isActive ? 'Active' : 'Hidden'}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right"><button onClick={() => handleEditClick(product)} className="text-primary hover:text-accent font-bold text-[10px] uppercase tracking-widest mr-4 transition">Edit</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'quotes' && (
          <div>
             <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                <div className="flex items-center gap-3">
                    <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 text-gray-600 md:hidden"><Menu size={24} /></button>
                    <h2 className="text-2xl md:text-3xl font-serif font-bold text-gray-900">Quotations</h2>
                </div>
                <div className="relative group w-full md:w-80">
                   <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-accent" size={16} />
                   <input type="text" placeholder="Search reference..." value={quoteSearch} onChange={(e) => setQuoteSearch(e.target.value)} className="w-full pl-11 pr-4 py-2.5 bg-white border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 shadow-sm" />
                </div>
             </div>
             <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50/50">
                            <tr>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Date</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Ref No.</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Customer</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Total</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Status</th>
                                <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredQuotes.map(quote => (
                                <tr key={quote.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4 text-xs text-gray-600 whitespace-nowrap">{new Date(quote.date).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 text-xs font-mono font-bold text-gray-900">{quote.number}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">{quote.customer.name}</div>
                                        <div className="text-[10px] text-gray-500">{quote.customer.company}</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-bold text-accent whitespace-nowrap">₱{quote.grandTotal.toLocaleString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2.5 py-1 inline-flex text-[9px] font-black uppercase tracking-widest rounded-full ${quote.status === 'Draft' ? 'bg-gray-100 text-gray-600' : ''} ${quote.status === 'Sent' ? 'bg-blue-100 text-blue-600' : ''} ${quote.status === 'Approved' ? 'bg-green-100 text-green-600' : ''} ${quote.status === 'Rejected' ? 'bg-red-100 text-red-700' : ''}`}>{quote.status}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right whitespace-nowrap"><button onClick={() => handleEditQuote(quote)} className="text-primary hover:text-accent font-bold text-[10px] uppercase tracking-widest transition">Manage</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
             </div>
          </div>
        )}

        {editingProduct && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-md overflow-y-auto">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col my-auto">
              <div className="p-6 md:p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div className="flex items-center gap-4">
                   <div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-xl hidden sm:flex"><Package size={20} /></div>
                   <div>
                     <h3 className="text-lg md:text-xl font-serif font-bold text-gray-900 flex items-center gap-2">
                      {editingProduct.isLocked && <Lock size={16} className="text-accent" />}
                      {editingProduct.isLocked ? 'Catalog Item' : 'Edit Product'}
                    </h3>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black">{editingProduct.code || 'NO CODE'}</p>
                   </div>
                </div>
                <button onClick={() => setEditingProduct(null)} className="text-gray-400 hover:text-gray-600 p-2"><X size={20} /></button>
              </div>
              
              <form onSubmit={handleSaveProduct} className="p-6 md:p-8 space-y-6 flex-1 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Display Name</label>
                    <input type="text" required disabled={editingProduct.isLocked} value={editingProduct.name} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} className="w-full rounded-xl border-gray-200 border p-3 text-sm focus:ring-accent disabled:bg-gray-50" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Product Code</label>
                    <input type="text" required disabled={editingProduct.isLocked} value={editingProduct.code} onChange={e => setEditingProduct({...editingProduct, code: e.target.value})} className="w-full rounded-xl border-gray-200 border p-3 text-sm focus:ring-accent disabled:bg-gray-50" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Description</label>
                    <button type="button" onClick={handleAiEnhanceDescription} disabled={isAiProcessing} className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-accent hover:text-accent-hover disabled:opacity-50 transition-all">
                      {isAiProcessing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                      AI Enhance
                    </button>
                  </div>
                  <textarea rows={3} value={editingProduct.description} onChange={e => setEditingProduct({...editingProduct, description: e.target.value})} className="w-full rounded-xl border-gray-200 border p-3 text-sm focus:ring-accent" placeholder="Describe the item's appeal..." />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Category</label>
                    <select disabled={editingProduct.isLocked} value={editingProduct.category} onChange={e => setEditingProduct({...editingProduct, category: e.target.value})} className="w-full rounded-xl border-gray-200 border p-3 text-sm focus:ring-accent">
                      {Object.values(ProductCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Original Price (PHP)</label>
                    <input type="number" required value={editingProduct.originalPrice} onChange={e => setEditingProduct({...editingProduct, originalPrice: Number(e.target.value), sellingPrice: Math.ceil(Number(e.target.value) * 1.1)})} className="w-full rounded-xl border-gray-200 border p-3 text-sm" />
                  </div>
                </div>

                <div className="bg-accent/5 p-6 rounded-2xl border border-accent/20">
                    <label className="block text-[10px] font-black text-accent uppercase tracking-widest mb-2">Calculated Selling Price (10% Markup)</label>
                    <p className="text-2xl font-black text-accent">₱{editingProduct.sellingPrice.toLocaleString()}</p>
                </div>

                <div className="space-y-4">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Image & Media Management</label>
                  <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 space-y-6">
                    <div className="flex flex-col gap-4">
                        {/* URL Paste Input */}
                        <div className="space-y-2">
                          <label className="block text-[9px] font-black text-gray-500 uppercase tracking-widest">Manual URL Entry</label>
                          <div className="relative flex items-center">
                            <input 
                              type="text" 
                              value={imageUrlInput} 
                              onChange={(e) => setImageUrlInput(e.target.value)} 
                              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddImageUrl())}
                              placeholder="Paste public image link (e.g. Unsplash, Pinterest)..." 
                              className="w-full rounded-xl border-gray-200 border p-3 text-sm pl-10 pr-24 focus:ring-accent focus:border-accent transition-all" 
                            />
                            <LinkIcon className="absolute left-3.5 text-gray-400" size={14} />
                            <button 
                              type="button" 
                              onClick={() => handleAddImageUrl()} 
                              className="absolute right-2 bg-primary text-white px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-black transition active:scale-95"
                            >
                              Add URL
                            </button>
                          </div>
                        </div>
                        
                        {/* File Upload Zone */}
                        <div className="space-y-2">
                          <label className="block text-[9px] font-black text-gray-500 uppercase tracking-widest">Bulk File Upload</label>
                          <div 
                            onClick={() => fileInputRef.current?.click()} 
                            onDragOver={(e) => { e.preventDefault(); setIsDraggingOverZone(true); }} 
                            onDragLeave={() => setIsDraggingOverZone(false)} 
                            onDrop={handleZoneDrop} 
                            className={`relative border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${isDraggingOverZone ? 'border-accent bg-accent/5 shadow-inner' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                          >
                            <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} />
                            {isUploading ? <Loader2 size={24} className="animate-spin text-accent" /> : <Upload size={24} className="text-gray-400" />}
                            <div className="text-center">
                              <p className="text-[10px] font-black uppercase tracking-widest text-gray-700">{isUploading ? 'Processing Assets...' : 'Drop multiple files or click to browse'}</p>
                              <p className="text-[9px] text-gray-400 mt-1">Add multiple JPG/PNG/WebP assets to the product gallery</p>
                            </div>
                          </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                      {editingProduct.images.map((img, idx) => (
                        <div key={`${img}-${idx}`} className={`relative aspect-square group rounded-xl overflow-hidden border-2 transition-all ${idx === 0 ? 'border-accent ring-4 ring-accent/10' : 'border-white shadow-sm'}`}>
                          <img src={img} className="w-full h-full object-cover" alt="" />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                            <button type="button" onClick={() => removeImage(idx)} className="p-1.5 bg-white rounded-full text-red-600 hover:scale-110 transition shadow-lg"><Trash2 size={12} /></button>
                            {idx !== 0 && <button type="button" onClick={() => setPrimaryImage(idx)} className="p-1.5 bg-white rounded-full text-accent hover:scale-110 transition shadow-lg"><Star size={12} /></button>}
                          </div>
                          {idx === 0 && <div className="absolute top-0 left-0 bg-accent text-white text-[7px] font-black px-1.5 py-0.5 uppercase tracking-tighter shadow-sm">Primary</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-6 border-t gap-4">
                  <button type="button" onClick={() => setEditingProduct(null)} className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Discard</button>
                  <button type="submit" className="px-8 py-3 bg-primary text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all">Save Changes</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Quotation Specialist Modal */}
        {editingQuote && (
            <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-md overflow-y-auto">
                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[90vh]">
                     <div className="p-6 md:p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 bg-accent rounded-xl flex items-center justify-center text-white"><FileText size={20} /></div>
                            <div>
                                <h3 className="text-lg font-serif font-bold text-gray-900">Quotation Strategy Center</h3>
                                <p className="font-mono text-[10px] text-gray-500">{editingQuote.number}</p>
                            </div>
                        </div>
                        <button onClick={() => setEditingQuote(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                    </div>

                    <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
                        <div className="flex-1 p-6 md:p-8 overflow-y-auto bg-gray-50/30">
                            {/* AI Strategic Analysis Section */}
                            <div className="mb-8">
                              <div className="flex items-center justify-between mb-4">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><BrainCircuit size={12} /> Strategic Sales Review</h4>
                                <div className="flex gap-2">
                                  {aiAnalysis && (
                                    <button onClick={() => setAiAnalysis(null)} className="text-[9px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-600">Clear</button>
                                  )}
                                  <button onClick={handleAiAnalyzeQuote} disabled={isAiProcessing} className="px-4 py-1.5 bg-accent/10 text-accent rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-accent hover:text-white transition flex items-center gap-2 disabled:opacity-50">
                                    {isAiProcessing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                    {aiAnalysis ? 'Refresh Insights' : 'Get AI Strategy'}
                                  </button>
                                </div>
                              </div>
                              
                              {isAiProcessing && (
                                <div className="bg-white p-12 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm animate-pulse border border-accent/10">
                                  <Loader2 className="animate-spin text-accent mb-4" size={32} />
                                  <p className="text-xs font-bold text-gray-600">Thinking deeply about this customer profile...</p>
                                  <p className="text-[10px] text-gray-400 mt-2 italic">Analyzing product mix and calculating optimal bundle strategies.</p>
                                </div>
                              )}

                              {aiAnalysis && !isAiProcessing && (
                                <div className="bg-gradient-to-br from-white to-gray-50 border-l-4 border-accent p-6 rounded-r-2xl shadow-sm animate-in slide-in-from-left-4 duration-500">
                                  <div className="prose prose-sm max-w-none">
                                    <p className="text-sm text-gray-800 leading-relaxed font-medium whitespace-pre-wrap">{aiAnalysis}</p>
                                  </div>
                                </div>
                              )}
                              
                              {!aiAnalysis && !isAiProcessing && (
                                <div className="bg-white/50 border border-dashed border-gray-300 p-8 rounded-2xl text-center">
                                  <p className="text-xs text-gray-400">Run a strategic review to discover upselling opportunities and discount recommendations tailored to this client.</p>
                                </div>
                              )}
                            </div>

                            <div className="bg-white p-5 rounded-2xl border border-gray-100 mb-6">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2"><User size={12} /> Client Profile</h4>
                                <p className="font-bold text-sm text-gray-900">{editingQuote.customer.name}</p>
                                <p className="text-xs text-gray-500">{editingQuote.customer.company}</p>
                                <p className="text-xs text-gray-400 mt-1 italic">{editingQuote.customer.address}</p>
                            </div>

                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2"><Package size={12} /> Selected Assets</h4>
                            <div className="space-y-2">
                                {editingQuote.items.map((item, idx) => (
                                    <div key={idx} className="flex gap-3 bg-white p-3 rounded-xl border border-gray-100 shadow-sm items-center hover:border-accent transition-colors">
                                        <div className="h-10 w-10 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                                          {item.images[0] ? <img src={item.images[0]} className="w-full h-full object-cover" alt={item.name} /> : <ImageIcon size={16} className="m-auto text-gray-300" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-gray-900 truncate">{item.name}</p>
                                            <p className="text-[9px] text-gray-400 font-mono">{item.code}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs font-bold text-accent">₱{(item.sellingPrice * item.quantity).toLocaleString()}</p>
                                            <p className="text-[9px] text-gray-500">Qty: {item.quantity}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <form onSubmit={handleSaveQuote} className="w-full md:w-80 p-6 md:p-8 flex flex-col bg-white border-l">
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><DollarSign size={12} /> Fulfillment Settings</h4>
                            <div className="space-y-4 flex-1">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-700">Logistics / Delivery (₱)</label>
                                    <input type="number" value={editingQuote.deliveryFee} onChange={(e) => setEditingQuote({...editingQuote, deliveryFee: Number(e.target.value)})} className="w-full rounded-xl border-gray-200 border p-2.5 text-sm" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-700">Strategic Discount (₱)</label>
                                    <input type="number" value={editingQuote.discount} onChange={(e) => setEditingQuote({...editingQuote, discount: Number(e.target.value)})} className="w-full rounded-xl border-gray-200 border p-2.5 text-sm text-red-500 font-bold" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-700">Payment Channel</label>
                                    <select value={editingQuote.paymentMethod || ''} onChange={(e) => setEditingQuote({...editingQuote, paymentMethod: e.target.value})} className="w-full rounded-xl border-gray-200 border p-2.5 text-sm appearance-none bg-white">
                                        <option value="">Select...</option>
                                        <option value="COD">Cash on Delivery</option>
                                        <option value="Bank">Bank Transfer</option>
                                        <option value="Check">Check Deposit</option>
                                        <option value="GCash">GCash / E-Wallet</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-700">Status</label>
                                    <select value={editingQuote.status} onChange={(e) => setEditingQuote({...editingQuote, status: e.target.value as any})} className="w-full rounded-xl border-gray-200 border p-2.5 text-sm bg-gray-50 font-medium">
                                        <option value="Draft">Draft</option>
                                        <option value="Sent">Sent</option>
                                        <option value="Approved">Approved</option>
                                        <option value="Rejected">Rejected</option>
                                    </select>
                                </div>

                                <div className="mt-6 bg-primary rounded-2xl p-4 text-white shadow-xl">
                                    <div className="flex justify-between text-[10px] text-gray-400 mb-1"><span>Subtotal</span><span>₱{editingQuote.subtotal.toLocaleString()}</span></div>
                                    <div className="flex justify-between text-[10px] text-gray-400 mb-1"><span>Logistics</span><span>+ ₱{editingQuote.deliveryFee.toLocaleString()}</span></div>
                                    <div className="flex justify-between text-[10px] text-red-400 mb-3 pb-3 border-b border-gray-700"><span>Discount</span><span>- ₱{editingQuote.discount.toLocaleString()}</span></div>
                                    <div className="flex justify-between items-end"><span className="text-[8px] font-black uppercase text-gray-400">Net Value</span><span className="text-xl font-bold text-accent">₱{(editingQuote.subtotal + editingQuote.deliveryFee - editingQuote.discount).toLocaleString()}</span></div>
                                </div>
                            </div>
                            <div className="mt-6 space-y-2">
                                <button type="submit" className="w-full py-3 bg-primary text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition shadow-lg">Commit Records</button>
                                <button type="button" onClick={() => generateQuotationPDF(editingQuote)} className="w-full py-3 border border-gray-200 text-gray-700 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-gray-50"><Printer size={16} /> Export PDF</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        )}
      </main>
    </div>
  );
};