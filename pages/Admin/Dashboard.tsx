import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../services/db';
import { Product, Quotation, ProductCategory } from '../../types';
import { Package, FileText, LogOut, Plus, X, Upload, Star, Trash2, CheckSquare, Lock, Loader2, Image as ImageIcon, GripVertical, Link as LinkIcon, MousePointer2, Layers, ShieldCheck } from 'lucide-react';

export const AdminDashboard: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<'products' | 'quotes' | 'settings'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [quotes, setQuotes] = useState<Quotation[]>([]);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isDraggingOverZone, setIsDraggingOverZone] = useState(false);
  
  // Drag and Drop State for Gallery Reordering
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  
  // Bulk Selection State for Table
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshData = () => {
    setProducts(db.products.getAll());
    setQuotes(db.quotations.getAll());
  };

  useEffect(() => {
    refreshData();
  }, []);

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

  /**
   * Processes multiple image files and adds them to the product gallery
   */
  const processFiles = async (files: FileList) => {
    if (!editingProduct) return;
    setIsUploading(true);
    
    try {
      const uploadPromises = Array.from(files).map((file: File) => {
        return new Promise<string>((resolve, reject) => {
          if (!file.type.startsWith('image/')) {
            return reject(new Error(`File "${file.name}" is not an image`));
          }
          // Limit file size to 10MB per image
          if (file.size > 10 * 1024 * 1024) {
            return reject(new Error(`File "${file.name}" exceeds 10MB limit`));
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

      if (successfulImages.length > 0) {
        setEditingProduct(prev => {
          if (!prev) return null;
          return {
            ...prev,
            images: [...prev.images, ...successfulImages]
          };
        });
      }

      // Handle errors if needed
      const errors = base64Results.filter(r => r.status === 'rejected');
      if (errors.length > 0) {
        console.error(`${errors.length} file(s) failed to upload.`);
        alert(`Warning: ${errors.length} file(s) could not be uploaded. Ensure they are images under 10MB.`);
      }
    } catch (error) {
      console.error("Bulk upload operation failed:", error);
      alert("An unexpected error occurred during upload.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
    // Reset value so same file can be uploaded again if needed
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

  // --- Reordering Logic ---
  const onDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragEnter = (index: number) => {
    if (draggedIndex === null) return;
    setDragOverIndex(index);
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
    <div className="flex h-screen bg-gray-100">
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-100">
          <span className="text-xl font-bold text-primary font-serif">OBRA Admin</span>
        </div>
        <nav className="p-4 space-y-2 flex-grow">
          <button 
            onClick={() => setActiveTab('products')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'products' ? 'bg-primary text-white shadow-lg' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <Package size={20} /> <span className="font-medium">Products</span>
          </button>
          <button 
            onClick={() => setActiveTab('quotes')}
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

      <main className="flex-1 overflow-auto p-8 relative">
        {activeTab === 'products' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-serif font-bold text-gray-900">Product Management</h2>
              <button 
                className="flex items-center gap-2 px-6 py-3 bg-accent text-white rounded-full hover:bg-accent-hover transition-all shadow-md active:scale-95 font-bold uppercase tracking-widest text-xs"
                onClick={handleAddNewProduct}
              >
                <Plus size={18} /> Add New Product
              </button>
            </div>

            {selectedIds.size > 0 && (
              <div className="bg-primary text-white p-4 rounded-xl shadow-2xl mb-8 flex flex-wrap items-center gap-6 animate-in slide-in-from-top-4 border border-white/10">
                <div className="flex items-center gap-3 px-4 border-r border-white/20">
                  <CheckSquare size={20} className="text-accent" />
                  <span className="font-bold text-sm">{selectedIds.size} Selected</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Availability:</span>
                  <div className="flex bg-white/5 rounded-lg p-1 border border-white/10">
                    <button onClick={() => handleBulkStatusChange(true)} className="px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest hover:bg-accent/20 transition">Active</button>
                    <button onClick={() => handleBulkStatusChange(false)} className="px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest hover:bg-red-500/20 transition">Hidden</button>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 flex items-center gap-1.5">
                    <Layers size={12} /> Move Category:
                  </span>
                  <select 
                    className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-accent transition [&>option]:text-gray-900"
                    onChange={(e) => handleBulkCategoryChange(e.target.value)}
                    value=""
                  >
                    <option value="" disabled>Select Category...</option>
                    {Object.values(ProductCategory).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <button onClick={() => setSelectedIds(new Set())} className="ml-auto px-4 py-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition bg-white/5 rounded-lg border border-white/10">Deselect All</button>
              </div>
            )}
            
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50/50">
                  <tr>
                    <th className="px-6 py-4 text-left w-10">
                      <input type="checkbox" className="rounded border-gray-300 text-primary focus:ring-accent w-4 h-4" checked={products.length > 0 && selectedIds.size === products.length} onChange={toggleSelectAll} />
                    </th>
                    <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Product Details</th>
                    <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Category</th>
                    <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Customer Price</th>
                    <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Status</th>
                    <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {products.map(product => (
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
                            <div className="text-sm font-bold text-gray-900">{product.name}</div>
                            <div className="text-[10px] font-mono text-gray-400">{product.code}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                         <span className="text-xs text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full">{product.category}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-accent">₱{product.sellingPrice.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
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
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {editingProduct && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col">
              <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div className="flex items-center gap-4">
                   <div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-xl">
                      <Package size={20} />
                   </div>
                   <div>
                     <h3 className="text-xl font-serif font-bold text-gray-900 flex items-center gap-2">
                      {editingProduct.isLocked && <Lock size={16} className="text-accent" />}
                      {editingProduct.isLocked ? 'Catalog Product' : 'Edit Product'}
                    </h3>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black">{editingProduct.code || 'NO CODE ASSIGNED'}</p>
                   </div>
                </div>
                <button onClick={() => setEditingProduct(null)} className="text-gray-400 hover:text-gray-600 transition-all p-2 bg-white rounded-full shadow-sm hover:rotate-90">
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleSaveProduct} className="p-8 space-y-8 flex-1 overflow-y-auto">
                {editingProduct.isLocked && (
                   <div className="bg-accent/5 border border-accent/20 p-4 rounded-2xl flex gap-3 items-start">
                      <ShieldCheck size={20} className="text-accent shrink-0 mt-0.5" />
                      <p className="text-xs text-accent-hover leading-relaxed">Protected catalog item. Restricted editing on core identifiers.</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Display Name</label>
                    <input type="text" required disabled={editingProduct.isLocked} value={editingProduct.name} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} className="w-full rounded-xl border-gray-200 shadow-sm focus:border-accent focus:ring-accent disabled:bg-gray-50 border p-3 text-sm transition" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Product Code</label>
                    <input type="text" required disabled={editingProduct.isLocked} value={editingProduct.code} onChange={e => setEditingProduct({...editingProduct, code: e.target.value})} className="w-full rounded-xl border-gray-200 shadow-sm focus:border-accent focus:ring-accent disabled:bg-gray-50 border p-3 text-sm transition" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Category</label>
                    <select disabled={editingProduct.isLocked} value={editingProduct.category} onChange={e => setEditingProduct({...editingProduct, category: e.target.value})} className="w-full rounded-xl border-gray-200 shadow-sm focus:border-accent focus:ring-accent disabled:bg-gray-50 border p-3 text-sm transition">
                      {Object.values(ProductCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Original Price (PHP)</label>
                    <input type="number" required value={editingProduct.originalPrice} onChange={e => updateOriginalPrice(Number(e.target.value))} className="w-full rounded-xl border-gray-200 shadow-sm focus:border-accent focus:ring-accent border p-3 text-sm transition" />
                  </div>
                </div>

                <div className="bg-accent/5 p-6 rounded-2xl border border-accent/20">
                    <label className="block text-[10px] font-black text-accent uppercase tracking-[0.2em] mb-2">Selling Price (+10%)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-3.5 text-accent font-bold text-lg">₱</span>
                      <input type="number" required value={editingProduct.sellingPrice} onChange={e => updateSellingPrice(Number(e.target.value))} className="w-full rounded-xl border-accent/30 shadow-sm focus:border-accent focus:ring-accent border p-4 pl-10 text-xl font-black text-accent transition bg-white" />
                    </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Media Asset Management</label>
                  <div className="bg-gray-50/80 p-6 rounded-3xl border border-gray-100 space-y-6">
                    <div className="flex flex-col gap-4">
                      <div className="relative group flex-1">
                        <input type="text" value={imageUrlInput} onChange={(e) => setImageUrlInput(e.target.value)} placeholder="Import via image URL..." className="w-full rounded-xl border-gray-200 shadow-sm focus:border-accent focus:ring-accent border p-3.5 pl-11 text-sm transition bg-white" />
                        <LinkIcon className="absolute left-4 top-4 text-gray-400" size={16} />
                        <button type="button" onClick={handleAddImageUrl} className="absolute right-2 top-2 px-4 py-1.5 bg-primary text-white rounded-lg hover:bg-black transition text-[10px] font-black uppercase tracking-widest">Add</button>
                      </div>
                      <div 
                        onDragOver={(e) => { e.preventDefault(); setIsDraggingOverZone(true); }} 
                        onDragLeave={() => setIsDraggingOverZone(false)} 
                        onDrop={handleZoneDrop} 
                        onClick={() => fileInputRef.current?.click()} 
                        className={`relative border-2 border-dashed rounded-2xl p-8 flex flex-col items-center gap-2 cursor-pointer transition-all ${isDraggingOverZone ? 'border-accent bg-accent/5 shadow-inner' : 'border-gray-300 bg-white hover:border-gray-400'}`}
                      >
                        <input 
                          ref={fileInputRef} 
                          type="file" 
                          multiple 
                          accept="image/*" 
                          className="hidden" 
                          onChange={handleImageUpload} 
                        />
                        {isUploading ? <Loader2 className="animate-spin text-accent" size={24} /> : <Upload className="text-gray-400" size={24} />}
                        <div className="text-center">
                          <p className="text-[10px] font-black uppercase tracking-widest text-gray-600">
                            {isUploading ? 'Adding Assets to Gallery...' : 'Click or Drag Multiple Assets to Upload'}
                          </p>
                          <p className="text-[9px] text-gray-400 mt-1 italic font-medium">Supports multiple JPG, PNG, WebP selections</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {editingProduct.images.map((img, idx) => (
                        <div key={`${img}-${idx}`} draggable onDragStart={(e) => onDragStart(e, idx)} onDragEnter={() => onDragEnter(idx)} onDragOver={(e) => e.preventDefault()} onDrop={() => onDrop(idx)} className={`relative aspect-square group rounded-xl overflow-hidden border-2 transition-all duration-300 ${dragOverIndex === idx && draggedIndex !== idx ? 'scale-110 border-accent z-10' : 'border-white'} ${idx === 0 ? 'ring-4 ring-accent/20 border-accent' : ''}`}>
                          <img src={img} className="w-full h-full object-cover select-none" alt={`Product ${idx}`} />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-2 transition-opacity duration-300">
                             <div className="flex gap-2">
                               {idx !== 0 && (
                                 <button type="button" onClick={() => setPrimaryImage(idx)} className="p-2 bg-white rounded-full text-gray-700 hover:text-accent shadow-lg transition"><Star size={16} /></button>
                               )}
                               <button type="button" onClick={() => removeImage(idx)} className="p-2 bg-white rounded-full text-red-600 shadow-lg transition"><Trash2 size={16} /></button>
                             </div>
                             <div className="flex items-center gap-1 cursor-grab active:cursor-grabbing p-1 px-2 bg-black/60 rounded-full">
                               <GripVertical size={12} className="text-white/60" />
                               <span className="text-[8px] font-black text-white uppercase tracking-tighter">Drag to Move</span>
                             </div>
                          </div>
                          {idx === 0 && (
                            <div className="absolute top-0 left-0 bg-accent text-white text-[8px] px-2 py-1 font-black uppercase tracking-widest rounded-br-lg shadow-lg">Primary</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-8 border-t border-gray-100 gap-4">
                  <button type="button" onClick={() => setEditingProduct(null)} className="px-8 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Discard</button>
                  <button type="submit" className="px-12 py-3.5 text-[10px] font-black text-white bg-primary rounded-xl hover:bg-black transition-all shadow-xl uppercase tracking-widest">Commit Changes</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};