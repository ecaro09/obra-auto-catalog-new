import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../services/db';
import { Product, Quotation, ProductCategory } from '../../types';
import { Package, FileText, LogOut, Plus, X, Upload, Star, Trash2, CheckSquare, Lock, Loader2, Image as ImageIcon, GripVertical, Link as LinkIcon, Layers, ShieldCheck, Menu, Search, User, CreditCard, DollarSign, Printer } from 'lucide-react';
import { generateQuotationPDF } from '../../utils/pdfGenerator';

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
  
  // Mobile Sidebar State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Drag and Drop State for Gallery Reordering
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  
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
      try {
        const exists = products.find(p => p.id === editingProduct.id);
        if (exists) {
          db.products.update(editingProduct);
        } else {
          db.products.add(editingProduct);
        }
        setEditingProduct(null);
        refreshData();
      } catch (error: any) {
        alert(error.message || "Failed to save product. Storage might be full.");
      }
    }
  };

  // --- Quote Handlers ---
  const handleEditQuote = (quote: Quotation) => {
    setEditingQuote({ ...quote });
  };

  const handleSaveQuote = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingQuote) {
        try {
            // Auto-calculate Grand Total: Subtotal + Delivery - Discount
            const subtotal = editingQuote.subtotal;
            const delivery = Number(editingQuote.deliveryFee) || 0;
            const discount = Number(editingQuote.discount) || 0;
            const total = Math.max(0, subtotal + delivery - discount); // Prevent negative

            const updatedQuote = { 
                ...editingQuote, 
                deliveryFee: delivery,
                discount: discount,
                grandTotal: total 
            };
            
            db.quotations.update(updatedQuote);
            setEditingQuote(null);
            refreshData();
        } catch (error: any) {
            alert(error.message || "Failed to save quotation. Storage might be full.");
        }
    }
  };

  // --- Price Sync Logic (+10% markup) ---
  const updateOriginalPrice = (val: number) => {
    if (!editingProduct) return;
    setEditingProduct({
      ...editingProduct,
      originalPrice: val,
      sellingPrice: Math.ceil(val * 1.10)
    });
  };

  const updateSellingPrice = (val: number) => {
    if (!editingProduct) return;
    setEditingProduct({
      ...editingProduct,
      sellingPrice: val,
      originalPrice: Math.round(val / 1.10)
    });
  };

  // --- Bulk Management Functions ---
  const handleBulkStatusChange = (isActive: boolean) => {
    try {
        const updatedProducts = products.map(p => {
          if (selectedIds.has(p.id)) return { ...p, isActive };
          return p;
        });
        db.products.saveAll(updatedProducts);
        refreshData();
        setSelectedIds(new Set());
    } catch (error: any) {
        alert(error.message);
    }
  };

  const handleBulkCategoryChange = (category: string) => {
    if (!category) return;
    try {
        const updatedProducts = products.map(p => {
          if (selectedIds.has(p.id)) return { ...p, category };
          return p;
        });
        db.products.saveAll(updatedProducts);
        refreshData();
        setSelectedIds(new Set());
    } catch (error: any) {
        alert(error.message);
    }
  };

  // --- Image Management Logic ---
  const handleAddImageUrl = (e: React.MouseEvent | React.FormEvent) => {
    e.preventDefault();
    const url = imageUrlInput.trim();
    if (!url || !url.startsWith('http')) return;

    if (editingProduct) {
      setEditingProduct({
        ...editingProduct,
        images: [...editingProduct.images, url]
      });
      setImageUrlInput('');
    }
  };

  const processFiles = async (files: FileList) => {
    if (!editingProduct) return;
    setIsUploading(true);
    
    try {
      const uploadPromises = Array.from(files).map((file: File) => {
        return new Promise<string>((resolve, reject) => {
          if (!file.type.startsWith('image/')) {
            return reject(new Error(`File "${file.name}" is not an image`));
          }
          if (file.size > 500 * 1024) {
            return reject(new Error(`File "${file.name}" is too large (>500KB). Please compress or resize it.`));
          }
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
          reader.readAsDataURL(file);
        });
      });

      const base64Results = await Promise.allSettled(uploadPromises);
      const successfulImages = base64Results
        .filter((result): result is PromiseFulfilledResult<string> => result.status === 'fulfilled')
        .map(result => result.value);
        
      const failed = base64Results.filter(r => r.status === 'rejected');

      if (successfulImages.length > 0) {
        setEditingProduct(prev => {
          if (!prev) return null;
          return {
            ...prev,
            images: [...prev.images, ...successfulImages]
          };
        });
      }
      
      if (failed.length > 0) {
        alert(`${failed.length} image(s) failed to upload (likely too large). Max size is 500KB.`);
      }

    } catch (error) {
      console.error("Bulk upload operation failed:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) processFiles(e.target.files);
    e.target.value = ''; 
  };

  const handleZoneDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOverZone(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) processFiles(e.dataTransfer.files);
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

  // --- Reordering Logic ---
  const onDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    // Hide default drag image if desired, or let browser handle it
  };

  const onDragEnter = (index: number) => {
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const onDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const onDrop = (index: number) => {
    if (draggedIndex === null || !editingProduct) return;
    const newImages = [...editingProduct.images];
    const [movedImage] = newImages.splice(draggedIndex, 1);
    newImages.splice(index, 0, movedImage);
    setEditingProduct({ ...editingProduct, images: newImages });
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // --- Bulk Selection Handlers ---
  const toggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedIds(e.target.checked ? new Set(products.map(p => p.id)) : new Set());
  };

  const toggleSelectOne = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedIds(newSelected);
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Mobile Sidebar Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 flex flex-col transition-transform duration-300 ease-in-out md:relative md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
      `}>
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <span className="text-xl font-bold text-primary font-serif">OBRA Admin</span>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>
        <nav className="p-4 space-y-2 flex-grow">
          <button 
            onClick={() => { setActiveTab('products'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'products' ? 'bg-primary text-white shadow-lg' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <Package size={20} /> <span className="font-medium">Products</span>
          </button>
          <button 
            onClick={() => { setActiveTab('quotes'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'quotes' ? 'bg-primary text-white shadow-lg' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <FileText size={20} /> <span className="font-medium">Quotations</span>
          </button>
        </nav>
        <div className="p-4 border-t border-gray-100">
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut size={20} /> <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto p-4 md:p-8 relative w-full">
        {/* --- PRODUCTS TAB --- */}
        {activeTab === 'products' && (
          <div>
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIsSidebarOpen(true)}
                  className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg md:hidden"
                >
                  <Menu size={24} />
                </button>
                <h2 className="text-2xl md:text-3xl font-serif font-bold text-gray-900">Product Management</h2>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                {/* Product Search */}
                <div className="relative group w-full md:w-64">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-accent" size={16} />
                   <input 
                    type="text" 
                    placeholder="Search products..." 
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-3 bg-white border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent shadow-sm"
                   />
                </div>
                <button 
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-accent text-white rounded-full hover:bg-accent-hover transition-all shadow-md active:scale-95 font-bold uppercase tracking-widest text-xs whitespace-nowrap"
                  onClick={handleAddNewProduct}
                >
                  <Plus size={18} /> <span className="md:inline">Add Product</span>
                </button>
              </div>
            </div>

            {selectedIds.size > 0 && (
              <div className="bg-primary text-white p-4 rounded-xl shadow-2xl mb-8 flex flex-wrap items-center gap-4 md:gap-6 animate-in slide-in-from-top-4 border border-white/10">
                <div className="flex items-center gap-3 px-4 border-r border-white/20">
                  <CheckSquare size={20} className="text-accent" />
                  <span className="font-bold text-sm">{selectedIds.size} Selected</span>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="hidden md:inline text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Availability:</span>
                    <div className="flex bg-white/5 rounded-lg p-1 border border-white/10">
                      <button onClick={() => handleBulkStatusChange(true)} className="px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest hover:bg-accent/20 transition">Active</button>
                      <button onClick={() => handleBulkStatusChange(false)} className="px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest hover:bg-red-500/20 transition">Hidden</button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="hidden md:inline text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 flex items-center gap-1.5">
                      <Layers size={12} /> Category:
                    </span>
                    <select 
                      className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-accent transition [&>option]:text-gray-900 w-32 md:w-auto"
                      onChange={(e) => handleBulkCategoryChange(e.target.value)}
                      value=""
                    >
                      <option value="" disabled>Move to...</option>
                      {Object.values(ProductCategory).map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <button onClick={() => setSelectedIds(new Set())} className="ml-auto px-4 py-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition bg-white/5 rounded-lg border border-white/10">Deselect</button>
              </div>
            )}
            
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50/50">
                    <tr>
                      <th className="px-6 py-4 text-left w-10">
                        <input type="checkbox" className="rounded border-gray-300 text-primary focus:ring-accent w-4 h-4" checked={filteredProducts.length > 0 && selectedIds.size === filteredProducts.length} onChange={toggleSelectAll} />
                      </th>
                      <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Product Details</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] hidden md:table-cell">Category</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Customer Price</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] hidden sm:table-cell">Status</th>
                      <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {filteredProducts.length === 0 ? (
                        <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400 font-medium">No products found matching "{productSearch}"</td></tr>
                    ) : (
                    filteredProducts.map(product => (
                      <tr key={product.id} className={`${selectedIds.has(product.id) ? 'bg-accent/5' : 'hover:bg-gray-50/50'} transition-colors`}>
                        <td className="px-6 py-4">
                          <input type="checkbox" className="rounded border-gray-300 text-primary focus:ring-accent w-4 h-4" checked={selectedIds.has(product.id)} onChange={() => toggleSelectOne(product.id)} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-12 w-12 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                              {product.images[0] ? <img className="h-full w-full object-cover" src={product.images[0]} alt="" /> : <ImageIcon className="h-full w-full p-3 text-gray-300" />}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-bold text-gray-900 max-w-[120px] md:max-w-xs truncate">{product.name}</div>
                              <div className="text-[10px] font-mono text-gray-400">{product.code}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap hidden md:table-cell">
                          <span className="text-xs text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full">{product.category}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-accent">₱{product.sellingPrice.toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                          <span className={`px-2.5 py-1 inline-flex text-[10px] font-black uppercase tracking-widest rounded-full ${product.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {product.isActive ? 'Active' : 'Hidden'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <button onClick={() => handleEditClick(product)} className="text-primary hover:text-accent font-bold text-xs uppercase tracking-widest mr-4 transition">Edit</button>
                          {!product.isLocked && (
                            <button className="text-red-400 hover:text-red-600 transition" onClick={() => { if(confirm('Permanently delete product?')) { db.products.delete(product.id); refreshData(); } }}>
                              <Trash2 size={16} />
                            </button>
                          )}
                        </td>
                      </tr>
                    )))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* --- QUOTE MANAGER MODAL (WITH MANUAL ADJUSTMENTS) --- */}
        {editingQuote && (
            <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300 overflow-y-auto">
                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh]">
                     {/* Header */}
                     <div className="p-6 md:p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-3xl">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 bg-accent rounded-xl flex items-center justify-center text-white shadow-xl hidden sm:flex">
                                <FileText size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg md:text-xl font-serif font-bold text-gray-900">Manage Quotation</h3>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="font-mono text-[11px] font-bold text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200">{editingQuote.number}</span>
                                    <span className="text-[10px] text-gray-400">•</span>
                                    <span className="text-[10px] text-gray-400 uppercase tracking-widest font-black">{new Date(editingQuote.date).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>
                        <button onClick={() => setEditingQuote(null)} className="text-gray-400 hover:text-gray-600 transition-all p-2 bg-white rounded-full shadow-sm hover:rotate-90">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
                        {/* Left: Customer & Items */}
                        <div className="flex-1 p-6 md:p-8 overflow-y-auto border-b md:border-b-0 md:border-r border-gray-100 bg-gray-50/30">
                            {/* Customer Card */}
                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-6">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                    <User size={12} /> Client Details
                                </h4>
                                <div className="space-y-1">
                                    <p className="font-bold text-gray-900">{editingQuote.customer.name}</p>
                                    <p className="text-sm text-gray-600">{editingQuote.customer.company}</p>
                                    <p className="text-xs text-gray-500 mt-2">{editingQuote.customer.email} • {editingQuote.customer.phone}</p>
                                    <p className="text-xs text-gray-500 italic border-t border-gray-50 mt-2 pt-2">{editingQuote.customer.address}</p>
                                </div>
                            </div>

                            {/* Items List */}
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                <Package size={12} /> Inquiry Items ({editingQuote.items.length})
                            </h4>
                            <div className="space-y-3">
                                {editingQuote.items.map((item, idx) => (
                                    <div key={`${item.id}-${idx}`} className="flex gap-4 bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                                        <div className="h-12 w-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                                            <img src={item.images[0]} alt="" className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-gray-900 truncate">{item.name}</p>
                                            <p className="text-[10px] text-gray-400 font-mono">{item.code}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-accent">₱{(item.sellingPrice * item.quantity).toLocaleString()}</p>
                                            <p className="text-[10px] text-gray-500">Qty: {item.quantity}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Right: Financials & Actions */}
                        <form onSubmit={handleSaveQuote} className="w-full md:w-96 p-6 md:p-8 flex flex-col bg-white">
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                <DollarSign size={12} /> Financial Adjustments
                            </h4>
                            
                            <div className="space-y-6 flex-1">
                                {/* DELIVERY FEE INPUT */}
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold text-gray-700">Delivery Fee (₱)</label>
                                    <input 
                                        type="number" 
                                        value={editingQuote.deliveryFee} 
                                        onChange={(e) => setEditingQuote({...editingQuote, deliveryFee: Number(e.target.value)})} 
                                        placeholder="0.00"
                                        className="w-full rounded-xl border-gray-200 shadow-sm focus:border-accent focus:ring-accent border p-3 text-sm transition font-medium"
                                    />
                                </div>
                                
                                {/* DISCOUNT INPUT */}
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold text-gray-700">Discount Amount (₱)</label>
                                    <input 
                                        type="number" 
                                        value={editingQuote.discount} 
                                        onChange={(e) => setEditingQuote({...editingQuote, discount: Number(e.target.value)})} 
                                        placeholder="0.00"
                                        className="w-full rounded-xl border-gray-200 shadow-sm focus:border-accent focus:ring-accent border p-3 text-sm transition text-red-500 font-bold"
                                    />
                                </div>

                                {/* PAYMENT METHOD SELECT */}
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold text-gray-700">Payment Method</label>
                                    <div className="relative">
                                        <CreditCard size={14} className="absolute left-3.5 top-3.5 text-gray-400" />
                                        <select 
                                            value={editingQuote.paymentMethod || ''} 
                                            onChange={(e) => setEditingQuote({...editingQuote, paymentMethod: e.target.value})} 
                                            className="w-full rounded-xl border-gray-200 shadow-sm focus:border-accent focus:ring-accent border p-3 pl-10 text-sm transition appearance-none bg-white font-medium"
                                        >
                                            <option value="">Select Method...</option>
                                            <option value="Cash on Delivery">Cash on Delivery</option>
                                            <option value="Bank Transfer">Bank Transfer (BDO/BPI)</option>
                                            <option value="Check Deposit">Check Deposit</option>
                                            <option value="GCash / E-Wallet">GCash / E-Wallet</option>
                                            <option value="Terms">Terms (Approval Required)</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold text-gray-700">Workflow Status</label>
                                    <select 
                                        value={editingQuote.status} 
                                        onChange={(e) => setEditingQuote({...editingQuote, status: e.target.value as any})} 
                                        className="w-full rounded-xl border-gray-200 shadow-sm focus:border-accent focus:ring-accent border p-3 text-sm transition bg-gray-50 font-medium"
                                    >
                                        <option value="Draft">Draft (Pending Review)</option>
                                        <option value="Sent">Sent to Client</option>
                                        <option value="Approved">Approved / Sold</option>
                                        <option value="Rejected">Rejected / Cancelled</option>
                                    </select>
                                </div>

                                {/* Summary Box - Auto Calculates */}
                                <div className="mt-8 bg-gray-900 rounded-2xl p-5 text-white shadow-xl">
                                    <div className="flex justify-between text-xs text-gray-400 mb-2">
                                        <span>Subtotal</span>
                                        <span>₱{editingQuote.subtotal.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-xs text-gray-400 mb-2">
                                        <span>Delivery</span>
                                        <span>+ ₱{(Number(editingQuote.deliveryFee) || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-xs text-red-400 mb-4 pb-4 border-b border-gray-700">
                                        <span>Discount</span>
                                        <span>- ₱{(Number(editingQuote.discount) || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Grand Total</span>
                                        <span className="text-xl font-bold text-accent">
                                            ₱{Math.max(0, editingQuote.subtotal + (Number(editingQuote.deliveryFee) || 0) - (Number(editingQuote.discount) || 0)).toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 flex flex-col gap-3">
                                <button type="submit" className="w-full py-3.5 bg-primary text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg hover:bg-black transition">Save Updates</button>
                                <button type="button" onClick={() => generateQuotationPDF(editingQuote)} className="w-full py-3.5 border border-gray-200 text-gray-700 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-50 transition flex items-center justify-center gap-2">
                                    <Printer size={16} /> Export PDF
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        )}

        {/* --- PRODUCT EDITING MODAL (Re-implemented with proper structure) --- */}
        {editingProduct && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300 overflow-y-auto">
             <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                   <h3 className="text-xl font-serif font-bold text-gray-900">
                      {editingProduct.id ? 'Edit Product' : 'New Product'}
                   </h3>
                   <button onClick={() => setEditingProduct(null)} className="p-2 hover:bg-gray-200 rounded-full transition"><X size={20} /></button>
                </div>

                <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
                   {/* Left Column: Images */}
                   <div className="w-full md:w-1/2 bg-gray-50/30 p-6 overflow-y-auto border-r border-gray-100">
                      <div className="flex items-center justify-between mb-4">
                        <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                           Image Gallery ({editingProduct.images.length})
                        </label>
                        <span className="text-[10px] text-gray-400 italic">Drag to reorder</span>
                      </div>

                      {/* Image Gallery Grid */}
                      <div className="grid grid-cols-3 gap-3 mb-6">
                         {editingProduct.images.map((img, idx) => (
                            <div 
                              key={idx}
                              draggable
                              onDragStart={(e) => onDragStart(e, idx)}
                              onDragEnter={() => onDragEnter(idx)}
                              onDragEnd={onDragEnd}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={() => onDrop(idx)}
                              className={`
                                relative aspect-square rounded-xl overflow-hidden group cursor-move border-2 transition-all
                                ${draggedIndex === idx ? 'opacity-40 grayscale scale-90' : 'opacity-100'}
                                ${dragOverIndex === idx ? 'border-accent scale-105 shadow-xl z-10' : 'border-transparent hover:border-gray-200'}
                              `}
                            >
                              <img src={img} alt="" className="w-full h-full object-cover" />
                              
                              {/* Badge for Main Image */}
                              {idx === 0 && (
                                <div className="absolute top-2 left-2 bg-accent text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full shadow-sm z-20">
                                  Main
                                </div>
                              )}
                              {/* Index Badge on Hover */}
                              {idx > 0 && (
                                <div className="absolute top-2 left-2 bg-black/50 text-white text-[10px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition">
                                  {idx + 1}
                                </div>
                              )}

                              {/* Hover Actions */}
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                                 <div className="flex justify-end">
                                    <button type="button" onClick={() => removeImage(idx)} className="p-1.5 bg-white/90 text-red-500 rounded-lg hover:bg-white transition shadow-sm" title="Remove Image">
                                      <Trash2 size={14} />
                                    </button>
                                 </div>
                                 {idx !== 0 && (
                                   <div className="flex justify-center">
                                      <button type="button" onClick={() => setPrimaryImage(idx)} className="px-3 py-1 bg-white/90 text-gray-900 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-accent hover:text-white transition shadow-sm flex items-center gap-1">
                                        <Star size={10} /> Set Main
                                      </button>
                                   </div>
                                 )}
                              </div>
                            </div>
                         ))}
                      </div>

                      {/* Upload Zone */}
                      <div 
                        onDragOver={(e) => { e.preventDefault(); setIsDraggingOverZone(true); }}
                        onDragLeave={() => setIsDraggingOverZone(false)}
                        onDrop={handleZoneDrop}
                        className={`
                          border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 relative
                          ${isDraggingOverZone ? 'border-accent bg-accent/5 scale-[1.02]' : 'border-gray-200 hover:border-accent/50 hover:bg-gray-50'}
                        `}
                      >
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          onChange={handleImageUpload} 
                          className="hidden" 
                          accept="image/*" 
                          multiple 
                        />
                        
                        <div className="flex flex-col items-center gap-3">
                          <div className={`h-12 w-12 rounded-full flex items-center justify-center transition-colors ${isDraggingOverZone ? 'bg-accent text-white' : 'bg-gray-100 text-gray-400'}`}>
                            {isUploading ? <Loader2 className="animate-spin" size={24} /> : <Upload size={24} />}
                          </div>
                          <div>
                            <button 
                              type="button" 
                              onClick={() => fileInputRef.current?.click()}
                              className="text-accent hover:text-accent-hover font-bold text-sm"
                            >
                              Click to upload
                            </button>
                            <span className="text-gray-400 text-sm"> or drag and drop</span>
                          </div>
                          <p className="text-xs text-gray-400">PNG, JPG up to 500KB (Multiple files allowed)</p>
                        </div>
                        
                        {/* URL Input Fallback */}
                        <div className="mt-6 pt-6 border-t border-gray-100">
                          <div className="flex gap-2">
                            <input 
                              type="text" 
                              value={imageUrlInput}
                              onChange={(e) => setImageUrlInput(e.target.value)}
                              placeholder="Or paste image URL..." 
                              className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs focus:ring-accent focus:border-accent"
                            />
                            <button type="button" onClick={handleAddImageUrl} className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">
                              <Plus size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                   </div>

                   {/* Right Column: Details Form */}
                   <form onSubmit={handleSaveProduct} className="w-full md:w-1/2 p-6 flex flex-col h-full overflow-y-auto">
                     <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                           <div className="col-span-2">
                              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Product Name</label>
                              <input required type="text" className="w-full rounded-xl border-gray-200 shadow-sm focus:border-accent focus:ring-accent border p-3 text-sm" value={editingProduct.name} onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})} />
                           </div>
                           <div>
                              <label className="block text-xs font-semibold text-gray-700 mb-1.5">SKU / Code</label>
                              <input required type="text" className="w-full rounded-xl border-gray-200 shadow-sm focus:border-accent focus:ring-accent border p-3 text-sm font-mono" value={editingProduct.code} onChange={(e) => setEditingProduct({...editingProduct, code: e.target.value})} />
                           </div>
                           <div>
                              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Category</label>
                              <select className="w-full rounded-xl border-gray-200 shadow-sm focus:border-accent focus:ring-accent border p-3 text-sm bg-white" value={editingProduct.category} onChange={(e) => setEditingProduct({...editingProduct, category: e.target.value as any})}>
                                 {Object.values(ProductCategory).map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                           </div>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                           <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-2">
                             <DollarSign size={12} /> Pricing Strategy
                           </h4>
                           <div className="grid grid-cols-2 gap-4">
                              <div>
                                 <label className="block text-xs font-semibold text-gray-700 mb-1.5">Base Price</label>
                                 <input type="number" className="w-full rounded-xl border-gray-200 shadow-sm focus:border-accent focus:ring-accent border p-3 text-sm" value={editingProduct.originalPrice} onChange={(e) => updateOriginalPrice(Number(e.target.value))} />
                              </div>
                              <div>
                                 <label className="block text-xs font-semibold text-accent mb-1.5">Selling Price (+10%)</label>
                                 <input type="number" className="w-full rounded-xl border-gray-200 shadow-sm focus:border-accent focus:ring-accent border p-3 text-sm font-bold text-accent" value={editingProduct.sellingPrice} onChange={(e) => updateSellingPrice(Number(e.target.value))} />
                              </div>
                           </div>
                        </div>

                        <div>
                           <label className="block text-xs font-semibold text-gray-700 mb-1.5">Dimensions</label>
                           <input type="text" className="w-full rounded-xl border-gray-200 shadow-sm focus:border-accent focus:ring-accent border p-3 text-sm" placeholder="e.g. L120 x W60 x H75 cm" value={editingProduct.dimensions || ''} onChange={(e) => setEditingProduct({...editingProduct, dimensions: e.target.value})} />
                        </div>
                        
                        <div>
                           <label className="block text-xs font-semibold text-gray-700 mb-1.5">Description & Features</label>
                           <textarea rows={4} className="w-full rounded-xl border-gray-200 shadow-sm focus:border-accent focus:ring-accent border p-3 text-sm" value={editingProduct.description || ''} onChange={(e) => setEditingProduct({...editingProduct, description: e.target.value})} placeholder="Describe materials, finish, and features..." />
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                           <label className="flex items-center cursor-pointer">
                              <input type="checkbox" className="sr-only peer" checked={editingProduct.isActive} onChange={(e) => setEditingProduct({...editingProduct, isActive: e.target.checked})} />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-accent/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                              <span className="ml-3 text-sm font-medium text-gray-700">{editingProduct.isActive ? 'Active (Visible)' : 'Hidden (Draft)'}</span>
                           </label>
                           {editingProduct.isLocked && (
                              <span className="flex items-center gap-1.5 text-xs text-orange-500 bg-orange-50 px-3 py-1.5 rounded-full border border-orange-100">
                                <Lock size={12} /> Protected Item
                              </span>
                           )}
                        </div>
                     </div>

                     <div className="mt-8 pt-6 border-t border-gray-100 flex gap-3">
                        <button type="submit" className="flex-1 py-3 bg-primary text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-black transition shadow-lg">Save Product</button>
                        <button type="button" onClick={() => setEditingProduct(null)} className="px-6 py-3 border border-gray-200 text-gray-600 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-50 transition">Cancel</button>
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