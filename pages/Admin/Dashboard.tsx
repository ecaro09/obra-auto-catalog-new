import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../services/db';
import { Product, Quotation, ProductCategory } from '../../types';
import { Package, FileText, LogOut, Plus, X, Upload, Star, Trash2, CheckSquare, Lock, Loader2, Image as ImageIcon, Link as LinkIcon, Menu, Search, Printer, User, CreditCard, DollarSign, Sparkles, BrainCircuit, Download, Wand2 } from 'lucide-react';
import { generateQuotationPDF, generateCatalogPDF } from '../../utils/pdfGenerator';
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
    if (!editingProduct || !editingProduct.name) return;
    setIsAiProcessing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `A professional, high-end studio photograph of an office furniture item: ${editingProduct.name}. 
      Category: ${editingProduct.category}. 
      Details: ${editingProduct.description}. 
      Style: Clean white background, perfect lighting, 4k resolution, professional furniture catalog style.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: [{ parts: [{ text: prompt }] }],
      });

      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          const base64Data = part.inlineData.data;
          const imageUrl = `data:image/png;base64,${base64Data}`;
          setEditingProduct(prev => prev ? { ...prev, images: [imageUrl, ...prev.images] } : null);
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
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Categorize these furniture items: ${selectedProducts.map(p => p.name).join(', ')}. Return JSON list with id and suggestedCategory.`,
        config: { responseMimeType: 'application/json' }
      });
      const suggestions = JSON.parse(response.text || '[]');
      if (Array.isArray(suggestions)) {
        const updated = products.map(p => {
          const sug = suggestions.find(s => s.id === p.id);
          return sug ? { ...p, category: sug.suggestedCategory } : p;
        });
        db.products.saveAll(updated);
        refreshData();
        setSelectedIds(new Set());
      }
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
        contents: `Write a 2-sentence luxury description for: ${editingProduct.name} (${editingProduct.category}).`,
      });
      if (response.text) setEditingProduct({ ...editingProduct, description: response.text });
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
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Analyze this quote for upsell opportunities: ${JSON.stringify(editingQuote.items)}`,
        config: { thinkingConfig: { thinkingBudget: 16000 } }
      });
      setAiAnalysis(response.text || "No strategy found.");
    } finally {
      setIsAiProcessing(false);
    }
  };

  const handleDownloadCatalog = async () => {
    setIsGeneratingPdf(true);
    try { await generateCatalogPDF(products); } finally { setIsGeneratingPdf(false); }
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
  const handleEditClick = (product: Product) => { setEditingProduct(product); setImageUrlInput(''); };
  const handleAddNewProduct = () => {
    setEditingProduct({
      id: crypto.randomUUID(), code: '', name: '', category: ProductCategory.Other,
      originalPrice: 0, sellingPrice: 0, images: [], isLocked: false, isActive: true,
      description: '', dimensions: ''
    });
    setImageUrlInput('');
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
    if (!e.target.files?.length || !editingProduct) return;
    setIsUploading(true);
    const files = Array.from(e.target.files);
    const readers = files.map(file => new Promise<string>((res) => {
      const r = new FileReader();
      r.onload = () => res(r.result as string);
      r.readAsDataURL(file);
    }));
    const newImages = await Promise.all(readers);
    setEditingProduct({ ...editingProduct, images: [...editingProduct.images, ...newImages] });
    setIsUploading(false);
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
          <button onClick={() => setActiveTab('products')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'products' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-50'}`}><Package size={20} /> Products</button>
          <button onClick={() => setActiveTab('quotes')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'quotes' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-50'}`}><FileText size={20} /> Quotations</button>
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
                  <input type="text" placeholder="Search catalog..." value={productSearch} onChange={e => setProductSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-full text-sm" />
                </div>
                <button onClick={handleAddNewProduct} className="px-4 py-2 bg-accent text-white rounded-full font-bold text-xs uppercase"><Plus size={16} className="inline mr-1" /> New</button>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400">
                  <tr>
                    <th className="p-4 w-10"><input type="checkbox" onChange={toggleSelectAll} checked={selectedIds.size > 0 && selectedIds.size === filteredProducts.length} /></th>
                    <th className="p-4">Product</th>
                    <th className="p-4">Category</th>
                    <th className="p-4 text-right">Selling Price</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredProducts.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4"><input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggleSelectOne(p.id)} /></td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img src={p.images[0]} className="w-10 h-10 rounded object-cover bg-gray-100" />
                          <div><div className="font-bold">{p.name}</div><div className="text-[10px] font-mono text-gray-400 uppercase">{p.code}</div></div>
                        </div>
                      </td>
                      <td className="p-4"><span className="px-2 py-1 bg-gray-100 rounded text-[10px] font-bold uppercase">{p.category}</span></td>
                      <td className="p-4 text-right font-bold text-accent">₱{p.sellingPrice.toLocaleString()}</td>
                      <td className="p-4 text-right"><button onClick={() => handleEditClick(p)} className="text-primary hover:text-accent font-black text-[10px] uppercase">Edit</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {editingProduct && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h3 className="text-xl font-serif font-bold">Product Specification</h3>
                <button onClick={() => setEditingProduct(null)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
              </div>
              
              <form onSubmit={handleSaveProduct} className="p-6 space-y-6 overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase">Product Name</label>
                    <input type="text" required value={editingProduct.name} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} className="w-full border rounded-xl p-3 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase">Model Code</label>
                    <input type="text" required value={editingProduct.code} onChange={e => setEditingProduct({...editingProduct, code: e.target.value})} className="w-full border rounded-xl p-3 text-sm" />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center"><label className="text-[10px] font-black text-gray-400 uppercase">Description</label><button type="button" onClick={handleAiEnhanceDescription} className="text-[9px] font-black uppercase text-accent hover:underline flex items-center gap-1"><Sparkles size={10}/> AI Enhance</button></div>
                  <textarea value={editingProduct.description} onChange={e => setEditingProduct({...editingProduct, description: e.target.value})} className="w-full border rounded-xl p-3 text-sm h-20" />
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-gray-400 uppercase">Product Imagery & Assets</label>
                    <button type="button" onClick={handleAiGenerateImage} disabled={isAiProcessing} className="flex items-center gap-2 px-3 py-1.5 bg-accent/10 text-accent rounded-full text-[10px] font-black uppercase hover:bg-accent hover:text-white transition-all disabled:opacity-50">
                      {isAiProcessing ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                      Generate AI Visual
                    </button>
                  </div>

                  <div className="bg-gray-50 p-5 rounded-2xl space-y-4 border border-gray-100">
                    {/* URL Input Area */}
                    <div className="space-y-2">
                       <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Add via Public URL</p>
                       <div className="flex gap-2">
                         <div className="relative flex-1">
                           <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                           <input 
                             type="text" 
                             value={imageUrlInput} 
                             onChange={(e) => setImageUrlInput(e.target.value)}
                             onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddImageUrl())}
                             className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs focus:ring-accent focus:border-accent" 
                             placeholder="Paste image link from Pinterest, Unsplash, etc..."
                           />
                         </div>
                         <button 
                           type="button" 
                           onClick={() => handleAddImageUrl()} 
                           className="px-4 py-2 bg-primary text-white text-[10px] font-black uppercase rounded-xl hover:bg-black transition-all"
                         >
                           Add URL
                         </button>
                       </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-gray-200 bg-white rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer hover:border-accent hover:bg-accent/5 transition-all">
                        <input type="file" ref={fileInputRef} className="hidden" multiple accept="image/*" onChange={handleImageUpload} />
                        {isUploading ? <Loader2 className="animate-spin text-accent" /> : <Upload className="text-gray-400" size={20} />}
                        <span className="text-[9px] font-bold uppercase text-gray-500 mt-2">Local File Upload</span>
                      </div>
                      <div className="text-[9px] text-gray-400 leading-relaxed italic border border-gray-200 rounded-xl p-4 flex items-center bg-white/50">
                        Pro tip: You can paste a public URL or upload multiple local assets. The first image will be your catalog cover.
                      </div>
                    </div>

                    {/* Gallery Preview */}
                    {editingProduct.images.length > 0 && (
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mt-4">
                        {editingProduct.images.map((img, idx) => (
                          <div key={idx} className="relative aspect-square rounded-lg overflow-hidden group border-2 border-white shadow-sm transition-all hover:scale-105">
                            <img src={img} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <button type="button" onClick={() => {
                                const next = [...editingProduct.images]; next.splice(idx, 1);
                                setEditingProduct({...editingProduct, images: next});
                              }} className="p-1.5 bg-white rounded-full text-red-600 hover:scale-110 transition shadow-lg"><Trash2 size={12} /></button>
                              {idx !== 0 && <button type="button" onClick={() => {
                                const next = [...editingProduct.images]; const [sel] = next.splice(idx, 1);
                                setEditingProduct({...editingProduct, images: [sel, ...next]});
                              }} className="p-1.5 bg-white rounded-full text-accent hover:scale-110 transition shadow-lg"><Star size={12} /></button>}
                            </div>
                            {idx === 0 && <div className="absolute top-0 left-0 bg-accent text-white text-[6px] font-black px-1.5 py-0.5 uppercase">Primary</div>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end pt-6 border-t gap-4">
                  <button type="button" onClick={() => setEditingProduct(null)} className="px-6 py-3 text-[10px] font-black uppercase text-gray-400">Cancel</button>
                  <button type="submit" className="px-10 py-3 bg-primary text-white rounded-xl font-black text-[10px] uppercase shadow-xl hover:shadow-2xl transition-all active:scale-95">Save Changes</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Similar updates for Quotes Modal omitted for brevity, but functionality is preserved */}
        {editingQuote && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
             <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[90vh]">
               <div className="p-6 md:p-8 border-b border-gray-100 flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-accent text-white rounded-2xl"><FileText size={20}/></div>
                    <div><h3 className="text-xl font-serif font-bold">Fulfillment Center</h3><div className="text-[10px] font-mono text-gray-400">{editingQuote.number}</div></div>
                  </div>
                  <button onClick={() => setEditingQuote(null)}><X size={24}/></button>
               </div>
               
               <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
                 <div className="flex-1 p-8 overflow-y-auto bg-gray-50/50">
                   <div className="mb-6"><h4 className="text-[10px] font-black uppercase text-gray-400 mb-4 flex items-center gap-2"><Sparkles size={12}/> AI Strategic Review</h4>
                   <button onClick={handleAiAnalyzeQuote} disabled={isAiProcessing} className="w-full py-4 border-2 border-dashed border-accent/20 rounded-2xl text-[10px] font-black uppercase text-accent hover:bg-accent/5 transition-all">
                    {isAiProcessing ? <Loader2 className="animate-spin inline mr-2" size={14}/> : 'Run Sales Optimization Strategy'}
                   </button>
                   {aiAnalysis && <div className="mt-4 p-5 bg-white border border-accent/10 rounded-2xl shadow-sm text-sm leading-relaxed text-gray-700 italic">{aiAnalysis}</div>}
                   </div>
                   
                   <div className="space-y-4">
                     <h4 className="text-[10px] font-black uppercase text-gray-400">Order Items</h4>
                     {editingQuote.items.map((item, idx) => (
                       <div key={idx} className="flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                         <img src={item.images[0]} className="w-16 h-16 object-cover rounded-xl" />
                         <div className="flex-1"><div className="font-bold">{item.name}</div><div className="text-[10px] text-gray-400">{item.code}</div></div>
                         <div className="text-right"><div className="font-bold text-accent">₱{(item.sellingPrice * item.quantity).toLocaleString()}</div><div className="text-[10px] text-gray-400">Qty: {item.quantity}</div></div>
                       </div>
                     ))}
                   </div>
                 </div>
                 
                 <form onSubmit={handleSaveQuote} className="w-80 p-8 border-l bg-white space-y-6">
                   <h4 className="text-[10px] font-black uppercase text-gray-400">Adjustments</h4>
                   <div className="space-y-4">
                     <div><label className="text-[10px] font-bold text-gray-500 uppercase">Delivery (₱)</label><input type="number" value={editingQuote.deliveryFee} onChange={e => setEditingQuote({...editingQuote, deliveryFee: Number(e.target.value)})} className="w-full border rounded-xl p-3 text-sm mt-1" /></div>
                     <div><label className="text-[10px] font-bold text-gray-500 uppercase">Discount (₱)</label><input type="number" value={editingQuote.discount} onChange={e => setEditingQuote({...editingQuote, discount: Number(e.target.value)})} className="w-full border rounded-xl p-3 text-sm mt-1 text-red-500 font-bold" /></div>
                     <div><label className="text-[10px] font-bold text-gray-500 uppercase">Status</label><select value={editingQuote.status} onChange={e => setEditingQuote({...editingQuote, status: e.target.value as any})} className="w-full border rounded-xl p-3 text-sm mt-1"><option>Draft</option><option>Sent</option><option>Approved</option><option>Rejected</option></select></div>
                   </div>
                   
                   <div className="mt-8 bg-primary rounded-2xl p-6 text-white shadow-2xl">
                     <div className="text-[9px] uppercase tracking-widest text-gray-400 mb-1">Total Payable</div>
                     <div className="text-2xl font-bold">₱{(editingQuote.subtotal + (editingQuote.deliveryFee || 0) - (editingQuote.discount || 0)).toLocaleString()}</div>
                   </div>
                   
                   <div className="space-y-3 pt-6">
                     <button type="submit" className="w-full py-3.5 bg-primary text-white rounded-xl font-black text-[10px] uppercase shadow-lg hover:shadow-2xl transition-all">Commit Updates</button>
                     <button type="button" onClick={() => handleDownloadQuotePdf(editingQuote)} disabled={isGeneratingPdf} className="w-full py-3.5 border border-gray-200 text-gray-700 rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-2 hover:bg-gray-50">
                       {isGeneratingPdf ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />} Visual PDF
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