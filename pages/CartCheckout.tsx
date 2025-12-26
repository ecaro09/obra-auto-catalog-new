import React, { useState } from 'react';
import { Trash2, FileText, ArrowRight, Printer } from 'lucide-react';
import { useCart } from '../App';
import { Quotation, CustomerDetails } from '../types';
import { db } from '../services/db';
import { generateQuotationPDF } from '../utils/pdfGenerator';

export const CartCheckout: React.FC = () => {
  const { items, removeFromCart, updateQuantity, clearCart } = useCart();
  const [step, setStep] = useState<'cart' | 'details' | 'success'>('cart');
  const [customer, setCustomer] = useState<CustomerDetails>({
    name: '', company: '', email: '', phone: '', address: ''
  });
  const [lastQuote, setLastQuote] = useState<Quotation | null>(null);

  const subtotal = items.reduce((sum, item) => sum + (item.sellingPrice * item.quantity), 0);

  const handleGenerateQuote = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Create Quote Object
    const newQuote: Quotation = {
      id: crypto.randomUUID(),
      number: `Q-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toISOString(),
      customer,
      items: [...items],
      subtotal,
      deliveryFee: 0, // Admin sets this later usually, or 0 for now
      discount: 0,
      grandTotal: subtotal,
      status: 'Draft'
    };

    db.quotations.add(newQuote);
    setLastQuote(newQuote);
    clearCart();
    setStep('success');
  };

  if (items.length === 0 && step === 'cart') {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-serif font-bold text-gray-900 mb-4">Your Cart is Empty</h2>
        <p className="text-gray-500 mb-8">Start adding furniture to your inquiry list.</p>
        <a href="/" className="inline-block px-6 py-3 bg-primary text-white rounded-md hover:bg-accent transition">
          Browse Catalog
        </a>
      </div>
    );
  }

  if (step === 'success' && lastQuote) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center bg-white mt-10 rounded-lg shadow-sm border border-gray-100">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <FileText className="text-green-600" size={32} />
        </div>
        <h2 className="text-3xl font-serif font-bold text-gray-900 mb-2">Quotation Generated!</h2>
        <p className="text-gray-500 mb-8">
          Reference Number: <span className="font-mono font-bold text-gray-900">{lastQuote.number}</span>
        </p>
        
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <button 
            onClick={() => generateQuotationPDF(lastQuote)}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-md hover:bg-gray-800 transition"
          >
            <Printer size={18} /> Download PDF
          </button>
          <a 
            href="/"
            className="flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition"
          >
            Back to Catalog
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="lg:grid lg:grid-cols-12 lg:gap-x-12 lg:items-start">
        
        {/* Left Column: Cart Items or Form */}
        <section className="lg:col-span-7">
          {step === 'cart' ? (
            <div className="bg-white shadow-sm rounded-lg border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-xl font-medium text-gray-900">Shopping Cart</h2>
              </div>
              <ul className="divide-y divide-gray-100">
                {items.map((item) => (
                  <li key={item.id} className="p-6 flex items-center">
                    <img 
                      src={item.images[0]} 
                      alt={item.name} 
                      className="w-20 h-20 object-cover rounded-md bg-gray-100"
                    />
                    <div className="ml-4 flex-1">
                      <h3 className="text-sm font-medium text-gray-900">{item.name}</h3>
                      <p className="text-sm text-gray-500">{item.code}</p>
                      <p className="mt-1 text-sm font-medium text-accent">₱{item.sellingPrice.toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <select
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.id, Number(e.target.value))}
                        className="rounded-md border-gray-200 py-1.5 text-base leading-5 font-medium text-gray-700 text-left shadow-sm focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent sm:text-sm"
                      >
                        {[1,2,3,4,5,10,20,50].map(n => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                      <button 
                        onClick={() => removeFromCart(item.id)}
                        className="text-gray-400 hover:text-red-500 transition"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="bg-white shadow-sm rounded-lg border border-gray-100 p-6">
              <h2 className="text-xl font-medium text-gray-900 mb-6">Contact Details</h2>
              <form id="quote-form" onSubmit={handleGenerateQuote} className="grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Full Name</label>
                  <input required type="text" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-accent focus:ring-accent sm:text-sm p-2 border" 
                    value={customer.name} onChange={e => setCustomer({...customer, name: e.target.value})}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Company (Optional)</label>
                  <input type="text" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-accent focus:ring-accent sm:text-sm p-2 border" 
                    value={customer.company} onChange={e => setCustomer({...customer, company: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input required type="email" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-accent focus:ring-accent sm:text-sm p-2 border" 
                    value={customer.email} onChange={e => setCustomer({...customer, email: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <input required type="tel" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-accent focus:ring-accent sm:text-sm p-2 border" 
                    value={customer.phone} onChange={e => setCustomer({...customer, phone: e.target.value})}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Delivery Address</label>
                  <textarea required rows={3} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-accent focus:ring-accent sm:text-sm p-2 border" 
                    value={customer.address} onChange={e => setCustomer({...customer, address: e.target.value})}
                  />
                </div>
              </form>
            </div>
          )}
        </section>

        {/* Right Column: Summary */}
        <section className="mt-16 bg-gray-50 rounded-lg px-4 py-6 sm:p-6 lg:col-span-5 lg:mt-0 lg:p-8 sticky top-24">
          <h2 className="text-lg font-medium text-gray-900">Order Summary</h2>
          <dl className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <dt className="text-sm text-gray-600">Subtotal</dt>
              <dd className="text-sm font-medium text-gray-900">₱{subtotal.toLocaleString()}</dd>
            </div>
            <div className="flex items-center justify-between border-t border-gray-200 pt-4">
              <dt className="text-base font-medium text-gray-900">Total (Estimate)</dt>
              <dd className="text-base font-medium text-gray-900">₱{subtotal.toLocaleString()}</dd>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              * Delivery fees and special discounts will be calculated in the final quotation document.
            </p>
          </dl>

          <div className="mt-6">
            {step === 'cart' ? (
              <button
                onClick={() => setStep('details')}
                className="w-full flex items-center justify-center rounded-md border border-transparent bg-primary px-4 py-3 text-base font-medium text-white shadow-sm hover:bg-gray-800 transition"
              >
                Proceed to Checkout <ArrowRight className="ml-2" size={18} />
              </button>
            ) : (
              <div className="flex flex-col gap-3">
                <button
                  type="submit"
                  form="quote-form"
                  className="w-full flex items-center justify-center rounded-md border border-transparent bg-accent px-4 py-3 text-base font-medium text-white shadow-sm hover:bg-accent-hover transition"
                >
                  Generate Quotation
                </button>
                <button
                  onClick={() => setStep('cart')}
                  className="w-full text-center text-sm text-gray-500 hover:text-gray-900"
                >
                  Back to Cart
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
