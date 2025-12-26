import React, { useState, useEffect } from 'react';
import { db } from '../../services/db';
import { Product, Quotation, ProductCategory } from '../../types';
import { Package, FileText, LogOut, Plus, X, Upload, Star, Trash2, CheckSquare, Lock, Loader2, Image as ImageIcon, GripVertical, Link as LinkIcon } from 'lucide-react';

export const AdminDashboard: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<'products' | 'quotes' | 'settings'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [quotes, setQuotes] = useState<Quotation[]>([]);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  
  // Drag and Drop State
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  
  // Bulk Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !editingProduct) return;

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
      e.target.value = ''; 
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

  // --- Drag and Drop Handlers ---

  const onDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    // Visual feedback delay
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

  // --- Bulk Actions Logic ---

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
                className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-md hover:bg-accent-hover"
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
                <button onClick={() => setSelectedIds(new Set())} className="ml-auto text-sm text-gray-300 hover:text-white underline decoration-dotted">Cancel</button>
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
                        <button onClick={() => handleEditClick(product)} className="text-indigo-600 hover:text-indigo-900 mr-4">Edit</button>
                        {!product.isLocked && (
                          <button 
                            className="text-red-600 hover:text-red-900"
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
                    {editingProduct.isLocked ? 'Catalog Details' : 'Edit Product'}
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
                        <strong>Locked Entry:</strong> This is a core catalog product. Names and codes are fixed. You can manage prices and images.
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
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Stock Availability</label>
                    <select value={editingProduct.isActive ? 'active' : 'inactive'} onChange={e => setEditingProduct({...editingProduct, isActive: e.target.value === 'active'})} className="w-full rounded-md border-gray-200 shadow-sm focus:border-accent focus:ring-accent border p-2 text-sm transition">
                      <option value="active">Active (Visible)</option>
                      <option value="inactive">Disabled (Hidden)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Original Price</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-gray-400 text-sm">₱</span>
                      <input 
                        type="number" 
                        value={editingProduct.originalPrice} 
                        onChange={e => setEditingProduct({
                          ...editingProduct, 
                          originalPrice: Number(e.target.value), 
                          sellingPrice: Math.ceil(Number(e.target.value) * 1.1)
                        })} 
                        className="w-full rounded-md border-gray-200 shadow-sm focus:border-accent focus:ring-accent border p-2 pl-7 text-sm transition" 
                      />
                    </div>
                  </div>
                </div>

                <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Selling Price (Final +10%)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-accent font-bold text-sm">₱</span>
                      <input type="number" required value={editingProduct.sellingPrice} onChange={e => setEditingProduct({...editingProduct, sellingPrice: Number(e.target.value)})} className="w-full rounded-md border-gray-200 shadow-sm focus:border-accent focus:ring-accent border p-2 pl-7 text-sm font-bold text-accent transition" />
                    </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Product Description</label>
                  <textarea rows={2} disabled={editingProduct.isLocked} value={editingProduct.description || ''} onChange={e => setEditingProduct({...editingProduct, description: e.target.value})} className="w-full rounded-md border-gray-200 shadow-sm focus:border-accent focus:ring-accent disabled:bg-gray-50 border p-2 text-sm transition resize-none" placeholder="Features, materials, and other details..." />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">Image Gallery</label>
                    <span className="text-[10px] text-gray-400 italic">Upload multiples. Drag to reorder. 1st is Primary.</span>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div className="flex flex-col sm:flex-row gap-3 mb-6">
                      <div className="relative flex-1 group">
                        <span className="absolute left-3 top-2.5 text-gray-400 group-focus-within:text-accent transition-colors">
                           <LinkIcon size={14} />
                        </span>
                        <input 
                          type="text" 
                          value={imageUrlInput} 
                          onChange={(e) => setImageUrlInput(e.target.value)} 
                          placeholder="Paste image URL here..." 
                          className="w-full rounded-md border-gray-200 shadow-sm focus:border-accent focus:ring-accent border p-2 pl-9 text-sm pr-12 transition" 
                        />
                        <button 
                          type="button"
                          onClick={handleAddImageUrl} 
                          className="absolute right-2 top-1.5 px-3 py-1 bg-accent/10 text-accent rounded-md hover:bg-accent hover:text-white transition-all text-[10px] font-black uppercase"
                        >
                          Add URL
                        </button>
                      </div>
                      
                      <label className={`flex-shrink-0 cursor-pointer px-4 py-2 bg-white text-primary border border-gray-200 rounded-md hover:border-accent hover:text-accent transition-all flex items-center justify-center gap-2 font-bold text-xs shadow-sm active:scale-95 ${isUploading ? 'opacity-60 cursor-not-allowed' : ''}`}>
                        {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                        {isUploading ? 'UPLOADING...' : 'UPLOAD FILES'}
                        <input 
                          type="file" 
                          multiple 
                          accept="image/*" 
                          className="hidden" 
                          onChange={handleImageUpload} 
                          disabled={isUploading} 
                        />
                      </label>
                    </div>

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
                              ${draggedIndex === idx ? 'opacity-30 scale-90 grayscale bg-gray-200' : 'opacity-100 scale-100'} 
                              ${dragOverIndex === idx && draggedIndex !== idx ? 'border-accent border-dashed ring-4 ring-accent/10 scale-105 z-10' : ''}
                              ${idx === 0 ? 'border-accent ring-4 ring-accent/10 bg-accent/5' : 'border-white hover:border-gray-300'}
                            `}
                          >
                            <img src={img} alt="" className="w-full h-full object-cover select-none pointer-events-none" loading="lazy" />
                            
                            {/* Overlay Controls */}
                            <div className="absolute inset-0 bg-primary/60 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-3 pointer-events-none group-hover:pointer-events-auto backdrop-blur-[2px]">
                              <div className="flex gap-2">
                                {idx !== 0 && (
                                  <button type="button" onClick={() => setPrimaryImage(idx)} title="Make Primary" className="p-2 bg-white text-gray-700 rounded-full hover:text-accent hover:scale-110 shadow-lg transition-all active:scale-90">
                                    <Star size={16} />
                                  </button>
                                )}
                                <button type="button" onClick={() => removeImage(idx)} title="Delete Image" className="p-2 bg-white text-red-600 rounded-full hover:bg-red-50 hover:scale-110 shadow-lg transition-all active:scale-90">
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>

                            {/* Drag Handle Icon */}
                            <div className="absolute top-1.5 right-1.5 p-1 bg-black/40 backdrop-blur-md rounded-md opacity-0 group-hover:opacity-100 transition-opacity text-white pointer-events-none">
                              <GripVertical size={12} />
                            </div>

                            {/* Primary Badge */}
                            {idx === 0 && (
                              <div className="absolute top-0 left-0 bg-accent text-white text-[8px] px-1.5 py-0.5 font-black uppercase tracking-widest shadow-lg z-10 rounded-br-md">
                                Primary
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-xl bg-white/60">
                        <ImageIcon className="mx-auto text-gray-300 mb-2" size={32} />
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-tighter">No Media Selected</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end pt-8 border-t border-gray-100 gap-3">
                  <button type="button" onClick={() => setEditingProduct(null)} className="px-6 py-2.5 text-xs font-bold text-gray-500 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors uppercase tracking-widest">Cancel</button>
                  <button type="submit" className="px-8 py-2.5 text-xs font-black text-white bg-primary rounded-md hover:bg-black transition-all shadow-xl hover:-translate-y-0.5 active:translate-y-0 uppercase tracking-widest">Update Item</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};