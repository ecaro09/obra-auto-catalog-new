import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../services/db';
import { Product, Quotation, ProductCategory } from '../../types';
import { Package, FileText, LogOut, Plus, X, Upload, Star, Trash2, CheckSquare, Lock, Loader2, Image as ImageIcon, GripVertical, Link as LinkIcon, MousePointer2 } from 'lucide-react';

export const AdminDashboard: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<'products' | 'quotes' | 'settings'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [quotes, setQuotes] = useState<Quotation[]>([]);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isDraggingOverZone, setIsDraggingOverZone] = useState(false);
  
  // Drag and Drop State for Reordering
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  
  // Bulk Selection State for Table
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Refresh data
  const refreshData = () => {
    setProducts(db.products.getAll());
    setQuotes(db.quotations.getAll());
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handlePriceUpdate = (id: string, newPrice: number) => {
    const product = products.find(p => p.id === id);
    if (product) {
      db.products.update({ ...product, sellingPrice: newPrice });
      refreshData();
    }
  };

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

  // --- Price Sync Logic ---
  const updateOriginalPrice = (val: number) => {
    if (!editingProduct) return;
    setEditingProduct({
      ...editingProduct,
      originalPrice: val,
      sellingPrice: Math.ceil(val * 1.10) // Always 10% markup
    });
  };

  const updateSellingPrice = (val: number) => {
    if (!editingProduct) return;
    setEditingProduct({
      ...editingProduct,
      sellingPrice: val,
      originalPrice: Math.round(val / 1.10) // Back-calculate base cost
    });
  };

  // --- Image Handling Logic ---

  const handleAddImageUrl = (e: React.MouseEvent | React.FormEvent) => {
    e.preventDefault();
    const url = imageUrlInput.trim();
    if (!url) return;
    
    if (!url.startsWith('http')) {
      alert('Please enter a valid image URL starting with http:// or https://');
      return;
    }

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
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
          reader.readAsDataURL(file);
        });
      });

      const base64Results = await Promise.all(uploadPromises);
      const successfulImages = base64Results.filter(img => img && img.startsWith('data:image'));

      setEditingProduct(prev => {
        if (!prev) return null;
        return {
          ...prev,
          images: [...prev.images, ...successfulImages]
        };
      });
    } catch (error) {
      console.error("Multiple image upload failed:", error);
      alert("One or more images failed to upload. Please check file sizes or formats.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFiles(files);
      e.target.value = ''; // Reset input
    }
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

  // --- Reordering Handlers ---

  const onDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => {
       setDraggedIndex(index);
    }, 0);
  };

  const onDragEnter = (index: number) => {
    if (draggedIndex === null) return;
    setDragOverIndex(index);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault(); 
    e.dataTransfer.dropEffect = 'move';
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
    onDragEnd();
  };

  // --- Bulk Selection Handlers ---

  const toggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(products.map(p => p.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const toggleSelectOne = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkStatusChange = (isActive: boolean) => {
    if (selectedIds.size === 0) return;
    const updatedProducts = products.map(p => {
      if (selectedIds.has(p.id)) return { ...p, isActive };
      return p;
    });
    db.products.saveAll(updatedProducts);
    refreshData();
    setSelectedIds(new Set());
  };

  const handleBulkCategoryChange = (category: string) => {
    if (selectedIds.size === 0 || !category) return;
    if (window.confirm(`Move ${selectedIds.size} products to "${category}"?`)) {
      const updatedProducts = products.map(p => {
        if (selectedIds.has(p.id)) return { ...p, category };
        return p;
      });
      db.products.saveAll(updatedProducts);
      refreshData();
      setSelectedIds(new Set());
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <aside className="w-64 bg-white border-r border-gray-200">
        <div className="p-6 border-b border-gray-100">
          <span className="text-xl font-bold text-primary">Admin Panel</span>
        </div>
        <nav className="p-4 space-y-2">
          <button 
            onClick={() => setActiveTab('products')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-md transition ${activeTab === 'products' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <Package size={20} /> Products
          </button>
          <button 
            onClick={() => setActiveTab('quotes')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-md transition ${activeTab === 'quotes' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <FileText size={20} /> Quotations
          </button>
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-md text-red-600 hover:bg-red-50 mt-auto"
          >
            <LogOut size={20} /> Logout
          </button>
        </nav>
      </aside>

      <main className="flex-1 overflow-auto p-8 relative">
        {activeTab === 'products' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Product Management</h2>
              <button 
                className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-md hover:bg-accent-hover transition shadow-md active:scale-95"
                onClick={handleAddNewProduct}
              >
                <Plus size={18} /> Add New Product
              </button>
            </div>

            {selectedIds.size > 0 && (
              <div className="bg-primary text-white p-4 rounded-lg shadow-md mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-2 font-medium min-w-[120px]">
                  <CheckSquare size={20} className="text-accent" />
                  <span>{selectedIds.size} Selected</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-300">Status:</span>
                  <button onClick={() => handleBulkStatusChange(true)} className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm font-medium transition">Active</button>
                  <button onClick={() => handleBulkStatusChange(false)} className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm font-medium transition">Inactive</button>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-300">Category:</span>
                  <select 
                    onChange={(e) => handleBulkCategoryChange(e.target.value)}
                    className="bg-white/10 border border-white/20 rounded px-2 py-1 text-sm focus:outline-none focus:bg-white/20 text-white [&>option]:text-gray-900"
                    value=""
                  >
                    <option value="" disabled>Choose...</option>
                    {Object.values(ProductCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <button onClick={() => setSelectedIds(new Set())} className="ml-auto text-sm text-gray-300 hover:text-white underline decoration-dotted transition">Cancel</button>
              </div>
            )}
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left w-10">
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300 text-primary focus:ring-accent w-4 h-4"
                        checked={products.length > 0 && selectedIds.size === products.length}
                        onChange={toggleSelectAll}
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Original</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Selling</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {products.map(product => (
                    <tr key={product.id} className={selectedIds.has(product.id) ? 'bg-blue-50/50' : ''}>
                      <td className="px-6 py-4">
                        <input 
                          type="checkbox" 
                          className="rounded border-gray-300 text-primary focus:ring-accent w-4 h-4"
                          checked={selectedIds.has(product.id)}
                          onChange={() => toggleSelectOne(product.id)}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
                             {product.images[0] ? <img className="h-full w-full object-cover" src={product.images[0]} alt="" loading="lazy" /> : <ImageIcon className="h-full w-full p-2 text-gray-400" />}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{product.name}</div>
                            <div className="text-sm text-gray-500">{product.code}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.category}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">₱{product.originalPrice.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                        <div className="flex items-center gap-2">
                          ₱ <input type="number" className="w-24 border rounded px-2 py-1" value={product.sellingPrice} onChange={(e) => handlePriceUpdate(product.id, Number(e.target.value))} />
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${product.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {product.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button onClick={() => handleEditClick(product)} className="text-indigo-600 hover:text-indigo-900 mr-4 transition">Edit</button>
                        {!product.isLocked && (
                          <button 
                            className="text-red-600 hover:text-red-900 transition"
                            onClick={() => { if(confirm('Delete product?')) { db.products.delete(product.id); refreshData(); } }}
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {editingProduct && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto flex flex-col">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-20">
                <div className="flex items-center gap-3">
                   <div className="h-8 w-8 bg-primary rounded-md flex items-center justify-center text-white">
                      <ImageIcon size={18} />
                   </div>
                   <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    {editingProduct.isLocked && <Lock size={18} className="text-accent" />}
                    {editingProduct.isLocked ? 'Catalog Entry' : 'Edit Product'}
                  </h3>
                </div>
                <button onClick={() => setEditingProduct(null)} className="text-gray-400 hover:text-gray-600 transition p-2 bg-gray-50 rounded-full">
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleSaveProduct} className="p-6 space-y-6 flex-1">
                {editingProduct.isLocked && (
                   <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-md">
                      <p className="text-xs text-blue-800 leading-relaxed">
                        <strong>Locked Entry:</strong> This is a standard catalog item. Meta-details are read-only, but cost and customer pricing can be updated. Markup is fixed at 10%.
                      </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Product Name</label>
                    <input type="text" required disabled={editingProduct.isLocked} value={editingProduct.name} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} className="w-full rounded-md border-gray-200 shadow-sm focus:border-accent focus:ring-accent disabled:bg-gray-50 border p-2 text-sm transition" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Product Code</label>
                    <input type="text" required disabled={editingProduct.isLocked} value={editingProduct.code} onChange={e => setEditingProduct({...editingProduct, code: e.target.value})} className="w-full rounded-md border-gray-200 shadow-sm focus:border-accent focus:ring-accent disabled:bg-gray-50 border p-2 text-sm transition" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Category</label>
                    <select disabled={editingProduct.isLocked} value={editingProduct.category} onChange={e => setEditingProduct({...editingProduct, category: e.target.value})} className="w-full rounded-md border-gray-200 shadow-sm focus:border-accent focus:ring-accent disabled:bg-gray-50 border p-2 text-sm transition">
                      {Object.values(ProductCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Dimensions</label>
                    <input type="text" disabled={editingProduct.isLocked} value={editingProduct.dimensions || ''} onChange={e => setEditingProduct({...editingProduct, dimensions: e.target.value})} placeholder="e.g. 180x80x75 cm" className="w-full rounded-md border-gray-200 shadow-sm focus:border-accent focus:ring-accent disabled:bg-gray-50 border p-2 text-sm transition" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Availability</label>
                    <select value={editingProduct.isActive ? 'active' : 'inactive'} onChange={e => setEditingProduct({...editingProduct, isActive: e.target.value === 'active'})} className="w-full rounded-md border-gray-200 shadow-sm focus:border-accent focus:ring-accent border p-2 text-sm transition">
                      <option value="active">Active (Show In Catalog)</option>
                      <option value="inactive">Disabled (Hide From Public)</option>
                    </select>
                  </div>
                  <div className="group relative">
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Original Price (Cost)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-gray-400 text-sm">₱</span>
                      <input 
                        type="number" 
                        value={editingProduct.originalPrice} 
                        onChange={e => updateOriginalPrice(Number(e.target.value))}
                        className="w-full rounded-md border-gray-200 shadow-sm focus:border-accent focus:ring-accent border p-2 pl-7 text-sm transition" 
                      />
                    </div>
                    <p className="text-[9px] text-gray-400 mt-1 italic">Changing this will auto-update Selling Price (+10%)</p>
                  </div>
                </div>

                <div className="bg-accent/5 p-4 rounded-lg border border-accent/20">
                    <label className="block text-[11px] font-bold text-accent uppercase tracking-widest mb-1.5">Calculated Selling Price (Customer)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-accent font-bold text-sm">₱</span>
                      <input 
                        type="number" 
                        required 
                        value={editingProduct.sellingPrice} 
                        onChange={e => updateSellingPrice(Number(e.target.value))}
                        className="w-full rounded-md border-accent/30 shadow-sm focus:border-accent focus:ring-accent border p-2.5 pl-8 text-lg font-bold text-accent transition bg-white" 
                      />
                    </div>
                    <p className="text-[10px] text-accent/70 mt-1.5 font-medium">Markup fixed at 10%. Changing this will back-calculate the Original Cost.</p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Description / Spec Notes</label>
                  <textarea rows={2} disabled={editingProduct.isLocked} value={editingProduct.description || ''} onChange={e => setEditingProduct({...editingProduct, description: e.target.value})} className="w-full rounded-md border-gray-200 shadow-sm focus:border-accent focus:ring-accent disabled:bg-gray-50 border p-2 text-sm transition resize-none" placeholder="Enter materials, warranty, or other item details..." />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">Product Visuals</label>
                    <span className="text-[10px] text-gray-400 font-medium italic">First image is the main thumbnail. Drag to reorder.</span>
                  </div>
                  
                  <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 shadow-inner">
                    {/* Bulk Upload & URL Input Area */}
                    <div className="flex flex-col gap-4 mb-6">
                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1 group">
                          <span className="absolute left-3 top-2.5 text-gray-400 group-focus-within:text-accent transition-colors">
                             <LinkIcon size={14} />
                          </span>
                          <input 
                            type="text" 
                            value={imageUrlInput} 
                            onChange={(e) => setImageUrlInput(e.target.value)} 
                            placeholder="Paste direct image URL..." 
                            className="w-full rounded-md border-gray-200 shadow-sm focus:border-accent focus:ring-accent border p-2 pl-9 text-sm pr-12 transition bg-white" 
                          />
                          <button 
                            type="button"
                            onClick={handleAddImageUrl} 
                            className="absolute right-2 top-1.5 px-3 py-1 bg-accent/10 text-accent rounded-md hover:bg-accent hover:text-white transition-all text-[10px] font-black uppercase"
                          >
                            Add
                          </button>
                        </div>
                      </div>

                      {/* Explicit Bulk Upload Button & Drop Zone */}
                      <div 
                        onDragOver={(e) => { e.preventDefault(); setIsDraggingOverZone(true); }}
                        onDragLeave={() => setIsDraggingOverZone(false)}
                        onDrop={handleZoneDrop}
                        className={`
                          relative border-2 border-dashed rounded-xl p-8 transition-all duration-300 flex flex-col items-center justify-center gap-3
                          ${isDraggingOverZone ? 'border-accent bg-accent/5 scale-[1.01]' : 'border-gray-300 bg-white hover:border-gray-400'}
                          ${isUploading ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}
                        `}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <input 
                          ref={fileInputRef}
                          type="file" 
                          multiple 
                          accept="image/*" 
                          className="hidden" 
                          onChange={handleImageUpload} 
                        />
                        
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-transform duration-500 ${isUploading ? 'bg-gray-100' : 'bg-primary text-white group-hover:scale-110 shadow-lg'}`}>
                          {isUploading ? <Loader2 size={24} className="animate-spin text-primary" /> : <Upload size={24} />}
                        </div>
                        
                        <div className="text-center">
                          <p className="text-sm font-black text-gray-900 uppercase tracking-widest">
                            {isUploading ? 'Processing Gallery...' : 'Bulk Upload Product Images'}
                          </p>
                          <p className="text-[10px] text-gray-400 mt-1 font-medium">
                            Select multiple files or drag & drop images here
                          </p>
                        </div>
                        
                        {isDraggingOverZone && (
                          <div className="absolute inset-0 flex items-center justify-center bg-accent/10 backdrop-blur-[1px] rounded-xl animate-in fade-in zoom-in-95">
                             <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-xl border border-accent/20">
                                <MousePointer2 size={16} className="text-accent animate-bounce" />
                                <span className="text-xs font-bold text-accent uppercase">Release to Upload</span>
                             </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Image Gallery Grid */}
                    {editingProduct.images.length > 0 ? (
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                        {editingProduct.images.map((img, idx) => (
                          <div 
                            key={`${img}-${idx}`} 
                            draggable
                            onDragStart={(e) => onDragStart(e, idx)}
                            onDragEnter={() => onDragEnter(idx)}
                            onDragOver={onDragOver}
                            onDragEnd={onDragEnd}
                            onDrop={() => onDrop(idx)}
                            className={`relative group aspect-square rounded-lg overflow-hidden border-2 shadow-sm transition-all duration-300 cursor-grab active:cursor-grabbing
                              ${draggedIndex === idx ? 'opacity-30 scale-90 grayscale bg-gray-300' : 'opacity-100 scale-100'} 
                              ${dragOverIndex === idx && draggedIndex !== idx ? 'border-accent border-dashed ring-4 ring-accent/10 scale-110 z-10 bg-accent/5' : ''}
                              ${idx === 0 ? 'border-accent ring-4 ring-accent/20 bg-accent/5 shadow-lg' : 'border-white hover:border-gray-300'}
                            `}
                          >
                            <img src={img} alt="" className="w-full h-full object-cover select-none pointer-events-none" loading="lazy" />
                            
                            {/* Hover Controls */}
                            <div className="absolute inset-0 bg-primary/70 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-3 pointer-events-none group-hover:pointer-events-auto backdrop-blur-[2px]">
                              <div className="flex gap-2">
                                {idx !== 0 && (
                                  <button 
                                    type="button" 
                                    onClick={(e) => { e.stopPropagation(); setPrimaryImage(idx); }} 
                                    title="Set as Primary" 
                                    className="p-2.5 bg-white text-gray-700 rounded-full hover:text-accent hover:scale-110 shadow-xl transition-all active:scale-90"
                                  >
                                    <Star size={18} />
                                  </button>
                                )}
                                <button 
                                  type="button" 
                                  onClick={(e) => { e.stopPropagation(); removeImage(idx); }} 
                                  title="Remove Image" 
                                  className="p-2.5 bg-white text-red-600 rounded-full hover:bg-red-50 hover:scale-110 shadow-xl transition-all active:scale-90"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                              <span className="text-[8px] text-white font-black uppercase tracking-[0.2em] bg-black/40 px-2 py-0.5 rounded">Reorder</span>
                            </div>

                            {/* Corner Handle */}
                            <div className="absolute top-1.5 right-1.5 p-1 bg-black/40 backdrop-blur-md rounded-md opacity-40 group-hover:opacity-100 transition-opacity text-white pointer-events-none">
                              <GripVertical size={12} />
                            </div>

                            {/* Primary Badge */}
                            {idx === 0 && (
                              <div className="absolute top-0 left-0 bg-accent text-white text-[8px] px-2 py-1 font-black uppercase tracking-[0.15em] shadow-lg z-10 rounded-br-md flex items-center gap-1.5 animate-in slide-in-from-left-2 duration-300">
                                <Star size={8} fill="currentColor" />
                                Primary
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-14 border-2 border-dashed border-gray-200 rounded-2xl bg-white/60">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                           <ImageIcon size={32} />
                        </div>
                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Empty Gallery</p>
                        <p className="text-[10px] text-gray-400 mt-2 italic">Start by uploading some professional product angles</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end pt-8 border-t border-gray-100 gap-3">
                  <button type="button" onClick={() => setEditingProduct(null)} className="px-6 py-2.5 text-xs font-bold text-gray-500 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors uppercase tracking-widest">Discard Changes</button>
                  <button type="submit" className="px-10 py-2.5 text-xs font-black text-white bg-primary rounded-md hover:bg-black transition-all shadow-xl hover:-translate-y-0.5 active:translate-y-0 uppercase tracking-widest">Save Item Updates</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};