
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../services/db';
import { Product, Quotation, ProductCategory } from '../../types';
import { Package, FileText, LogOut, Plus, X, Upload, Star, Trash2, CheckSquare, Lock, Loader2, Image as ImageIcon, Link as LinkIcon, Menu, Search, Printer, User, CreditCard, DollarSign, Sparkles, BrainCircuit, Download, Wand2, Eye, EyeOff, Tag, AlertCircle, Settings2, SlidersHorizontal } from 'lucide-react';
import { generateQuotationPDF, generateCatalogPDF, CatalogExportOptions } from '../../utils/pdfGenerator';
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";

export const AdminDashboard: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<'products' | 'quotes' | 'settings'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [quotes, setQuotes] = useState<Quotation[]>([]);
  
  // Product Search & Editing
  const [productSearch, setProductSearch] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [aiImagePrompt, setAiImagePrompt] = useState('');
  
  // Quote Search & Editing
  const [quoteSearch, setQuoteSearch] = useState('');
  const [editingQuote, setEditingQuote] = useState<Quotation | null>(null);

  // Catalog PDF Config State
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [catalogOptions, setCatalogOptions] = useState<CatalogExportOptions>({
    includeDescription: true,
    includeDimensions: true,
    includeOriginalPrice: false,
    includeSellingPrice: true,
    includeCategory: true,
    sortBy: 'name'
  });

  const [imageUrlInput, setImageUrlInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  
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

  const handleAiGenerateImage = async () => {
    if (!editingProduct) return;
    setIsAiProcessing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const prompt = aiImagePrompt.trim() || `A professional, high-end studio photograph of an office furniture item: ${editingProduct.name}. 
      Category: ${editingProduct.category}. 
      Details: ${editingProduct.description || 'Modern contemporary design'}. 
      Style: Clean white background, perfect lighting, 4k resolution, professional furniture catalog style.`;

      const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: prompt }] },
      });

      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            const base64Data = part.inlineData.data;
            const imageUrl = `data:image/png;base64,${base64Data}`;
            setEditingProduct(prev => prev ? { ...prev, images: [imageUrl, ...prev.images] } : null);
          }
        }
      }
    } catch (err) {
      console.error("AI Image Generation failed", err);
    } finally {
      setIsAiProcessing(false);
    }
  };

  const handleAiBulkCategorize = async () => {
    if (selectedIds.size === 0) return;
    setIsAiProcessing(true);
    try {
      const selectedProducts = products.filter(p => selectedIds.has(p.id));
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Categorize these furniture items: ${selectedProducts.map(p => p.name).join(', ')}. Return a JSON array of objects, each containing "id" and "suggestedCategory". Valid categories are: ${Object.values(ProductCategory).join(', ')}.`,
        config: { 
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
        const updated = products.map(p => {
          const sug = suggestions.find(s => s.id === p.id);
          return (sug && Object.values(ProductCategory).includes(sug.suggestedCategory as ProductCategory)) 
            ? { ...p, category: sug.suggestedCategory as ProductCategory } 
            : p;
        });
        db.products.saveAll(updated);
        refreshData();
        setSelectedIds(new Set());
      }
    } catch (err) {
      console.error("AI Categorization failed", err);
    } finally {
      setIsAiProcessing(false);
    }
  };

  const handleAiEnhanceDescription = async () => {
    if (!editingProduct) return;
    setIsAiProcessing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Write a 2-sentence luxury description for: ${editingProduct.name} (${editingProduct.category}).`,
      });
      if (response.text) setEditingProduct({ ...editingProduct, description: response.text.trim() });
    } catch (err) {
      console.error("AI Description enhancement failed", err);
    } finally {
      setIsAiProcessing(false);
    }
  };

  const handleAiAnalyzeQuote = async () => {
    if (!editingQuote) return;
    setIsAiProcessing(true);
    setAiAnalysis(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Analyze this quote for upsell opportunities: ${JSON.stringify(editingQuote.items)}`,
        config: { thinkingConfig: { thinkingBudget: 16000 } }
      });
      setAiAnalysis(response.text || "No strategy found.");
    } catch (err) {
      console.error("AI Quote analysis failed", err);
    } finally {
      setIsAiProcessing(false);
    }
  };

  // --- Bulk Handlers ---
  const handleBulkStatusToggle = (isActive: boolean) => {
    const updated = products.map(p => {
      if (selectedIds.has(p.id)) return { ...p, isActive };
      return p;
    });
    db.products.saveAll(updated);
    refreshData();
    setSelectedIds(new Set());
  };

  const handleBulkCategoryChange = (category: string) => {
    if (!category) return;
    const updated = products.map(p => {
      if (selectedIds.has(p.id)) return { ...p, category: category as ProductCategory };
      return p;
    });
    db.products.saveAll(updated);
    refreshData();
    setSelectedIds(new Set());
  };

  const handleBulkDelete = () => {
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} products?`)) return;
    const remaining = products.filter(p => !selectedIds.has(p.id));
    db.products.saveAll(remaining);
    refreshData();
    setSelectedIds(new Set());
  };

  const handleDownloadCatalog = async () => {
    setIsGeneratingPdf(true);
    try { 
      await generateCatalogPDF(products, catalogOptions); 
      setIsCatalogModalOpen(false);
    } finally { 
      setIsGeneratingPdf(false); 
    }
  };

  const handleDownloadQuotePdf = async (quote: Quotation) => {
    setIsGeneratingPdf(true);
    try { await generateQuotationPDF(quote); } finally { setIsGeneratingPdf(false); }
  };

  // --- Search & Filtering ---
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
    p.code.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.category.toLowerCase().includes(productSearch.toLowerCase())
  );

  const filteredQuotes = quotes.filter(q => 
    q.number.toLowerCase().includes(quoteSearch.toLowerCase()) ||
    q.customer.name.toLowerCase().includes(quoteSearch.toLowerCase())
  );

  // --- Handlers ---
  const handleEditClick = (product: Product) => { 
    setEditingProduct(product); 
    setImageUrlInput('');
    setAiImagePrompt(''); 
  };
  const handleAddNewProduct = () => {
    setEditingProduct({
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
    });
    setImageUrlInput('');
    setAiImagePrompt('');
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProduct) {
      db.products.getById(editingProduct.id) ? db.products.update(editingProduct) : db.products.add(editingProduct);
      setEditingProduct(null);
      refreshData();
    }
  };

  const handleEditQuote = (quote: Quotation) => { setAiAnalysis(null); setEditingQuote({ ...quote }); };
  const handleSaveQuote = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingQuote) {
      const total = editingQuote.subtotal + (editingQuote.deliveryFee || 0) - (editingQuote.discount || 0);
      db.quotations.update({ ...editingQuote, grandTotal: total });
      setEditingQuote(null);
      refreshData();
    }
  };

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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0 || !editingProduct) return;
    setIsUploading(true);
    const files: File[] = Array.from(fileList);
    try {
      const readers = files.map(file => new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result as string);
        r.onerror = () => rej(new Error("Failed to read file"));
        r.readAsDataURL(file);
      }));
      const newImages = await Promise.all(readers);
      setEditingProduct({ ...editingProduct, images: [...editingProduct.images, ...newImages] });
    } catch (err) {
      console.error("Image upload failed", err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSetPrimary = (index: number) => {
    if (!editingProduct) return;
    const newImages = [...editingProduct.images];
    const [selected] = newImages.splice(index, 1);
    newImages.unshift(selected); // Move to front
    setEditingProduct({ ...editingProduct, images: newImages });
  };

  const toggleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedIds(e.target.checked ? new Set(filteredProducts.map(p => p.id)) : new Set());
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden text-gray-900">
      {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 flex flex-col transition-transform duration-300 md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <span className="text-xl font-bold text-primary font-serif">OBRA Admin</span>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-400"><X size={20} /></button>
        </div>
        <nav className="p-4 space-y-2 flex-grow">
          <button onClick={() => setActiveTab('products')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'products' ? 'bg-primary text-white shadow-lg' : 'text-gray-600 hover:bg-gray-50'}`}><Package size={20} /> Products</button>
          <button onClick={() => setActiveTab('quotes')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'quotes' ? 'bg-primary text-white shadow-lg' : 'text-gray-600 hover:bg-gray-50'}`}><FileText size={20} /> Quotations</button>
        </nav>
        <div className="p-4 border-t border-gray-100">
          <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50"><LogOut size={20} /> Logout</button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto p-4 md:p-8 relative">
        {activeTab === 'products' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <h2 className="text-2xl font-serif font-bold">Inventory Management</h2>
              <div className="flex gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input type="text" placeholder="Search catalog..." value={productSearch} onChange={e => setProductSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-full text-sm shadow-sm" />
                </div>
                <button onClick={() => setIsCatalogModalOpen(true)} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-full font-bold text-[10px] uppercase flex items-center gap-2 hover:bg-gray-50 shadow-sm transition-all active:scale-95">
                  <Download size={14} /> Export Catalog
                </button>
                <button onClick={handleAddNewProduct} className="px-6 py-2 bg-accent text-white rounded-full font-bold text-[10px] uppercase shadow-md active:scale-95 hover:bg-accent-hover transition-all"><Plus size={16} className="inline mr-1" /> New Product</button>
              </div>
            </div>

            {/* Bulk Actions Floating Bar */}
            {selectedIds.size > 0 && (
              <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-primary/95 backdrop-blur-md text-white px-6 py-4 rounded-3xl shadow-2xl flex items-center gap-6 border border-white/10 animate-in slide-in-from-bottom-8">
                <div className="flex items-center gap-2 pr-4 border-r border-white/20">
                  <CheckSquare size={18} className="text-accent" />
                  <span className="text-xs font-black uppercase">{selectedIds.size} Selected</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleBulkStatusToggle(true)} className="p-2 bg-white/5 hover:bg-green-500 rounded-xl transition-all" title="Activate All"><Eye size={16}/></button>
                    <button onClick={() => handleBulkStatusToggle(false)} className="p-2 bg-white/5 hover:bg-red-500 rounded-xl transition-all" title="Deactivate All"><EyeOff size={16}/></button>
                  </div>
                  <div className="flex items-center gap-2">
                    <select 
                      onChange={(e) => handleBulkCategoryChange(e.target.value)}
                      className="bg-white/5 border border-white/20 rounded-xl px-3 py-1.5 text-[10px] font-bold text-white focus:outline-none focus:ring-1 focus:ring-accent [&>option]:text-gray-900"
                    >
                      <option value="">Move Category...</option>
                      {Object.values(ProductCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                  <button onClick={handleAiBulkCategorize} disabled={isAiProcessing} className="flex items-center gap-2 px-3 py-1.5 bg-accent text-white rounded-xl text-[10px] font-black uppercase hover:bg-accent-hover transition disabled:opacity-50">
                    {isAiProcessing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} AI Organize
                  </button>
                  <button onClick={handleBulkDelete} className="p-2.5 bg-red-500/20 text-red-400 hover:bg-red-600 hover:text-white rounded-xl transition-all"><Trash2 size={16}/></button>
                </div>
                <button onClick={() => setSelectedIds(new Set())} className="ml-2 p-1.5 text-gray-500 hover:text-white"><X size={16}/></button>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400">
                  <tr>
                    <th className="p-4 w-10"><input type="checkbox" onChange={toggleSelectAll} checked={selectedIds.size > 0 && selectedIds.size === filteredProducts.length} className="rounded accent-primary" /></th>
                    <th className="p-4">Product Details</th>
                    <th className="p-4">Category</th>
                    <th className="p-4 text-right">Selling Price</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredProducts.map(p => (
                    <tr key={p.id} className={`transition-colors ${selectedIds.has(p.id) ? 'bg-accent/5' : 'hover:bg-gray-50'}`}>
                      <td className="p-4"><input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggleSelectOne(p.id)} className="rounded accent-primary" /></td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded bg-gray-100 overflow-hidden flex-shrink-0 border border-gray-100">
                            {p.images[0] ? <img src={p.images[0]} className="w-full h-full object-cover" /> : <ImageIcon className="m-auto text-gray-300 p-2" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <div className="font-bold text-gray-900">{p.name}</div>
                              {p.isLocked && <Lock size={10} className="text-gray-300" />}
                            </div>
                            <div className="text-[10px] font-mono text-gray-400 uppercase">{p.code}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4"><span className="px-2 py-0.5 bg-gray-100 rounded text-[9px] font-bold uppercase text-gray-600 tracking-wider">{p.category}</span></td>
                      <td className="p-4 text-right font-bold text-accent">₱{p.sellingPrice.toLocaleString()}</td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${p.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {p.isActive ? 'Active' : 'Hidden'}
                        </span>
                      </td>
                      <td className="p-4 text-right"><button onClick={() => handleEditClick(p)} className="text-primary hover:text-accent font-black text-[10px] uppercase tracking-[0.2em] transition">Edit</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'quotes' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <h2 className="text-2xl font-serif font-bold">Sales Quotations</h2>
              <div className="relative flex-1 md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input type="text" placeholder="Search customer or ref..." value={quoteSearch} onChange={e => setQuoteSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-full text-sm shadow-sm" />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400">
                  <tr>
                    <th className="p-4">Ref No.</th>
                    <th className="p-4">Customer</th>
                    <th className="p-4">Date</th>
                    <th className="p-4 text-right">Grand Total</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredQuotes.map(q => (
                    <tr key={q.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4 font-mono font-bold text-primary">{q.number}</td>
                      <td className="p-4">
                        <div className="font-bold text-gray-900">{q.customer.name}</div>
                        <div className="text-[10px] text-gray-400">{q.customer.company}</div>
                      </td>
                      <td className="p-4 text-xs text-gray-500">{new Date(q.date).toLocaleDateString()}</td>
                      <td className="p-4 text-right font-bold text-accent">₱{q.grandTotal.toLocaleString()}</td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${q.status === 'Approved' ? 'bg-green-100 text-green-700' : q.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>
                          {q.status}
                        </span>
                      </td>
                      <td className="p-4 text-right"><button onClick={() => handleEditQuote(q)} className="text-primary hover:text-accent font-black text-[10px] uppercase transition">Manage</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Catalog Export Modal */}
        {isCatalogModalOpen && (
          <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h3 className="text-xl font-serif font-bold flex items-center gap-2">
                  <Settings2 className="text-accent" size={20} /> Export Settings
                </h3>
                <button onClick={() => setIsCatalogModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
              </div>
              <div className="p-8 space-y-8">
                {/* Field Selection */}
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <CheckSquare size={12} /> Data Inclusion
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { key: 'includeDescription', label: 'Descriptions' },
                      { key: 'includeDimensions', label: 'Dimensions' },
                      { key: 'includeCategory', label: 'Category' },
                      { key: 'includeSellingPrice', label: 'Selling Price' },
                      { key: 'includeOriginalPrice', label: 'Original Price' },
                    ].map(field => (
                      <label key={field.key} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 cursor-pointer transition-all">
                        <input 
                          type="checkbox" 
                          checked={!!(catalogOptions as any)[field.key]} 
                          onChange={e => setCatalogOptions({...catalogOptions, [field.key]: e.target.checked})}
                          className="rounded text-accent focus:ring-accent"
                        />
                        <span className="text-sm font-medium text-gray-700">{field.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Sorting Selection */}
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <SlidersHorizontal size={12} /> Organize By
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { val: 'name', label: 'Alphabetical' },
                      { val: 'category', label: 'Category' },
                      { val: 'price-asc', label: 'Lowest Price' },
                      { val: 'price-desc', label: 'Highest Price' },
                      { val: 'code', label: 'Model Code' },
                    ].map(sort => (
                      <button 
                        key={sort.val}
                        onClick={() => setCatalogOptions({...catalogOptions, sortBy: sort.val as any})}
                        className={`px-4 py-2.5 rounded-full text-xs font-bold transition-all ${catalogOptions.sortBy === sort.val ? 'bg-primary text-white shadow-lg' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                      >
                        {sort.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t flex gap-3">
                  <button 
                    onClick={() => setIsCatalogModalOpen(false)}
                    className="flex-1 py-4 text-[10px] font-black uppercase text-gray-400 hover:text-gray-600"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleDownloadCatalog}
                    disabled={isGeneratingPdf}
                    className="flex-[2] py-4 bg-primary text-white rounded-2xl font-black text-[10px] uppercase shadow-xl hover:shadow-2xl transition-all flex items-center justify-center gap-2"
                  >
                    {isGeneratingPdf ? <Loader2 className="animate-spin" size={16} /> : <Printer size={16} />}
                    Generate Document
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Product Editing Modal */}
        {editingProduct && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h3 className="text-xl font-serif font-bold flex items-center gap-2">
                  <Package className="text-accent" size={20} /> 
                  {editingProduct.isLocked ? 'View Product Details' : 'Design Manual Product'}
                </h3>
                <button onClick={() => setEditingProduct(null)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
              </div>
              
              <form onSubmit={handleSaveProduct} className="p-6 space-y-6 overflow-y-auto">
                {editingProduct.isLocked && (
                  <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-xl text-blue-800 text-xs font-medium">
                    <AlertCircle size={14} /> This product is imported from the master catalog. Core specifications are read-only.
                  </div>
                )}

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Product Name</label>
                    <input disabled={editingProduct.isLocked} type="text" required value={editingProduct.name} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} className="w-full border rounded-xl p-3 text-sm focus:ring-accent focus:border-accent outline-none transition-all disabled:bg-gray-50 disabled:text-gray-500" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Model Code</label>
                    <input disabled={editingProduct.isLocked} type="text" required value={editingProduct.code} onChange={e => setEditingProduct({...editingProduct, code: e.target.value})} className="w-full border rounded-xl p-3 text-sm focus:ring-accent focus:border-accent outline-none transition-all disabled:bg-gray-50 disabled:text-gray-500" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Category</label>
                    <select disabled={editingProduct.isLocked} value={editingProduct.category} onChange={e => setEditingProduct({...editingProduct, category: e.target.value as ProductCategory})} className="w-full border rounded-xl p-3 text-sm focus:ring-accent focus:border-accent outline-none transition-all bg-white disabled:bg-gray-50 disabled:text-gray-500">
                      {Object.values(ProductCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Dimensions</label>
                    <input disabled={editingProduct.isLocked} type="text" value={editingProduct.dimensions || ''} onChange={e => setEditingProduct({...editingProduct, dimensions: e.target.value})} className="w-full border rounded-xl p-3 text-sm focus:ring-accent focus:border-accent outline-none transition-all disabled:bg-gray-50 disabled:text-gray-500" placeholder="e.g. 180x80x75 cm" />
                  </div>
                </div>

                {/* Price Management */}
                <div className="grid grid-cols-2 gap-6 bg-accent/5 p-5 rounded-2xl border border-accent/10">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-accent uppercase tracking-widest">Original Price (PHP)</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-accent/50" size={14} />
                      <input 
                        disabled={editingProduct.isLocked}
                        type="number" 
                        required 
                        value={editingProduct.originalPrice} 
                        onChange={e => {
                          const val = Number(e.target.value);
                          setEditingProduct({
                            ...editingProduct, 
                            originalPrice: val, 
                            sellingPrice: Math.ceil(val * 1.1)
                          });
                        }} 
                        className="w-full border border-accent/20 rounded-xl p-3 pl-9 text-sm focus:ring-accent outline-none font-bold disabled:bg-gray-200/50" 
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-accent/60 uppercase tracking-widest">Selling Price (+10%)</label>
                    <div className="w-full bg-white/50 border border-accent/20 rounded-xl p-3 text-sm font-black text-accent flex items-center justify-between">
                      <span>₱</span>
                      <span>{editingProduct.sellingPrice.toLocaleString()}</span>
                    </div>
                    <p className="text-[8px] text-accent/50 italic">Calculated automatically</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Description</label>
                    {!editingProduct.isLocked && (
                      <button type="button" onClick={handleAiEnhanceDescription} className="text-[9px] font-black uppercase text-accent hover:underline flex items-center gap-1 transition-all">
                        <Sparkles size={10}/> AI Enhance
                      </button>
                    )}
                  </div>
                  <textarea disabled={editingProduct.isLocked} value={editingProduct.description} onChange={e => setEditingProduct({...editingProduct, description: e.target.value})} className="w-full border rounded-xl p-3 text-sm h-24 focus:ring-accent outline-none transition-all disabled:bg-gray-50 disabled:text-gray-500" />
                </div>

                <div className="space-y-4 pt-4 border-t border-gray-100">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Gallery & Assets</label>
                    {!editingProduct.isLocked && (
                      <button type="button" onClick={handleAiGenerateImage} disabled={isAiProcessing} className="flex items-center gap-2 px-3 py-1.5 bg-accent/10 text-accent rounded-full text-[10px] font-black uppercase hover:bg-accent hover:text-white transition-all disabled:opacity-50">
                        {isAiProcessing ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                        AI Generator
                      </button>
                    )}
                  </div>

                  <div className="bg-gray-50 p-5 rounded-2xl space-y-4 border border-gray-100">
                    {!editingProduct.isLocked && (
                      <div className="bg-white p-4 rounded-xl border border-accent/20 shadow-sm space-y-3">
                        <div className="space-y-2">
                          <textarea 
                            value={aiImagePrompt}
                            onChange={(e) => setAiImagePrompt(e.target.value)}
                            placeholder="AI Instruction: Describe the style, environment, and lighting for the new product visual..."
                            className="w-full border border-gray-200 rounded-xl p-3 text-xs focus:ring-accent focus:border-accent outline-none h-16 transition-all"
                          />
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Add URL</p>
                        <div className="flex gap-2">
                          <input 
                            disabled={editingProduct.isLocked}
                            type="text" 
                            value={imageUrlInput} 
                            onChange={(e) => setImageUrlInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddImageUrl())}
                            className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:ring-accent focus:border-accent outline-none disabled:bg-gray-100" 
                            placeholder="https://..."
                          />
                          <button disabled={editingProduct.isLocked} type="button" onClick={() => handleAddImageUrl()} className="px-4 py-2 bg-primary text-white text-[10px] font-black uppercase rounded-xl hover:bg-black transition-all disabled:opacity-50">Add</button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Local Files</p>
                        <div onClick={() => !editingProduct.isLocked && fileInputRef.current?.click()} className={`border-2 border-dashed border-gray-200 bg-white rounded-xl py-2 flex flex-col items-center justify-center transition-all ${editingProduct.isLocked ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:border-accent hover:bg-accent/5'}`}>
                          <input type="file" ref={fileInputRef} className="hidden" multiple accept="image/*" onChange={handleImageUpload} />
                          {isUploading ? <Loader2 className="animate-spin text-accent" size={16} /> : <Upload className="text-gray-400" size={16} />}
                          <span className="text-[8px] font-bold uppercase text-gray-500 mt-1">Upload Multiple</span>
                        </div>
                      </div>
                    </div>

                    {/* Gallery Preview Area */}
                    <div className="pt-2">
                      <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-3">Product Media Gallery</p>
                      {editingProduct.images.length === 0 ? (
                        <div className="h-24 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-gray-300">
                          <ImageIcon size={24} className="mb-2" />
                          <span className="text-[10px] font-bold uppercase tracking-widest">No Assets Uploaded</span>
                        </div>
                      ) : (
                        <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                          {editingProduct.images.map((img, idx) => (
                            <div key={idx} className={`relative aspect-square rounded-2xl overflow-hidden group border-4 transition-all hover:scale-105 shadow-sm ${idx === 0 ? 'border-accent ring-4 ring-accent/10' : 'border-white hover:border-accent/30'}`}>
                              <img src={img} className="w-full h-full object-cover" />
                              
                              {/* Overlay for Actions (Only if not locked) */}
                              {!editingProduct.isLocked && (
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                                  {idx !== 0 && (
                                    <button 
                                      type="button" 
                                      onClick={() => handleSetPrimary(idx)}
                                      className="p-1.5 bg-accent text-white rounded-full hover:scale-110 transition shadow-lg"
                                      title="Set as Thumbnail"
                                    >
                                      <Star size={14} fill="currentColor" />
                                    </button>
                                  )}
                                  <button 
                                    type="button" 
                                    onClick={() => {
                                      const next = [...editingProduct.images]; next.splice(idx, 1);
                                      setEditingProduct({...editingProduct, images: next});
                                    }} 
                                    className="p-1.5 bg-red-600 text-white rounded-full hover:scale-110 transition shadow-lg"
                                    title="Delete Image"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              )}
                              
                              {idx === 0 && (
                                <div className="absolute top-2 left-2 bg-accent text-white text-[7px] font-black px-2 py-0.5 rounded-full uppercase shadow-lg">
                                  Primary
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-6 border-t gap-4">
                  <button type="button" onClick={() => setEditingProduct(null)} className="px-6 py-3 text-[10px] font-black uppercase text-gray-400">Cancel</button>
                  <button type="submit" className="px-10 py-3 bg-primary text-white rounded-xl font-black text-[10px] uppercase shadow-xl hover:shadow-2xl transition-all active:scale-95">Save Product</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Quote Fulfillment Modal */}
        {editingQuote && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
             <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[90vh]">
               <div className="p-6 md:p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-accent text-white rounded-2xl"><FileText size={20}/></div>
                    <div><h3 className="text-xl font-serif font-bold">Fulfillment Center</h3><div className="text-[10px] font-mono text-gray-400">{editingQuote.number}</div></div>
                  </div>
                  <button onClick={() => setEditingQuote(null)}><X size={24}/></button>
               </div>
               
               <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
                 <div className="flex-1 p-8 overflow-y-auto bg-gray-50/50">
                   <div className="mb-8">
                     <h4 className="text-[10px] font-black uppercase text-gray-400 mb-4 flex items-center gap-2 tracking-widest"><Sparkles size={12}/> AI Strategic Review</h4>
                     <button onClick={handleAiAnalyzeQuote} disabled={isAiProcessing} className="w-full py-6 border-2 border-dashed border-accent/30 rounded-2xl text-[10px] font-black uppercase text-accent hover:bg-accent/5 transition-all flex flex-col items-center gap-2">
                      {isAiProcessing ? <Loader2 className="animate-spin" size={18}/> : <BrainCircuit size={18} />}
                      <span>{isAiProcessing ? 'Synthesizing Market Intelligence...' : 'Run Sales Optimization Strategy'}</span>
                     </button>
                     {aiAnalysis && <div className="mt-4 p-5 bg-white border border-accent/10 rounded-2xl shadow-sm text-sm leading-relaxed text-gray-700 italic border-l-4 border-l-accent">{aiAnalysis}</div>}
                   </div>
                   
                   <div className="space-y-4">
                     <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Inquiry Assets</h4>
                     {editingQuote.items.map((item, idx) => (
                       <div key={idx} className="flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                         <img src={item.images[0]} className="w-16 h-16 object-cover rounded-xl bg-gray-100" />
                         <div className="flex-1"><div className="font-bold text-gray-900">{item.name}</div><div className="text-[10px] text-gray-400">{item.code}</div></div>
                         <div className="text-right">
                           <div className="font-bold text-accent">₱{(item.sellingPrice * item.quantity).toLocaleString()}</div>
                           <div className="text-[10px] text-gray-400 uppercase font-black">Qty: {item.quantity}</div>
                         </div>
                       </div>
                     ))}
                   </div>
                 </div>
                 
                 <form onSubmit={handleSaveQuote} className="w-80 p-8 border-l bg-white space-y-6 flex flex-col">
                   <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Adjustments</h4>
                   <div className="space-y-4 flex-1">
                     <div>
                       <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Logistics / Delivery (₱)</label>
                       <input type="number" value={editingQuote.deliveryFee} onChange={e => setEditingQuote({...editingQuote, deliveryFee: Number(e.target.value)})} className="w-full border rounded-xl p-3 text-sm mt-1 focus:ring-accent outline-none" />
                     </div>
                     <div>
                       <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Strategic Discount (₱)</label>
                       <input type="number" value={editingQuote.discount} onChange={e => setEditingQuote({...editingQuote, discount: Number(e.target.value)})} className="w-full border rounded-xl p-3 text-sm mt-1 text-red-500 font-bold focus:ring-accent outline-none" />
                     </div>
                     <div>
                       <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Contract Status</label>
                       <select value={editingQuote.status} onChange={e => setEditingQuote({...editingQuote, status: e.target.value as any})} className="w-full border rounded-xl p-3 text-sm mt-1 font-bold uppercase tracking-widest">
                         <option>Draft</option>
                         <option>Sent</option>
                         <option>Approved</option>
                         <option>Rejected</option>
                       </select>
                     </div>
                   </div>
                   
                   <div className="mt-auto bg-primary rounded-2xl p-6 text-white shadow-2xl relative overflow-hidden">
                     <div className="relative z-10">
                       <div className="text-[9px] uppercase tracking-[0.2em] text-gray-400 mb-1">Total Net Value</div>
                       <div className="text-2xl font-bold text-accent">₱{(editingQuote.subtotal + (editingQuote.deliveryFee || 0) - (editingQuote.discount || 0)).toLocaleString()}</div>
                     </div>
                     <div className="absolute -right-4 -bottom-4 opacity-10"><DollarSign size={80}/></div>
                   </div>
                   
                   <div className="space-y-3 pt-6">
                     <button type="submit" className="w-full py-4 bg-primary text-white rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg hover:bg-black transition-all">Commit Updates</button>
                     <button type="button" onClick={() => handleDownloadQuotePdf(editingQuote)} disabled={isGeneratingPdf} className="w-full py-4 border border-gray-200 text-gray-700 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-gray-50 transition-all">
                       {isGeneratingPdf ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />} Export Visual Quote
                     </button>
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
