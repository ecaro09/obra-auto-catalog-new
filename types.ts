export interface Product {
  id: string;
  code: string;
  name: string;
  category: string;
  originalPrice: number; // Base price from PDF
  sellingPrice: number; // originalPrice * 1.10 (calculated or stored)
  dimensions?: string;
  description?: string;
  images: string[];
  isLocked: boolean; // true if from PDF (restricts editing image/desc), false if manual
  isActive: boolean;
  stock?: number;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface CustomerDetails {
  name: string;
  company: string;
  email: string;
  phone: string;
  address: string;
}

export interface Quotation {
  id: string; // Unique Quote ID
  number: string; // Editable display number
  date: string;
  customer: CustomerDetails;
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  grandTotal: number;
  status: 'Draft' | 'Sent' | 'Approved' | 'Rejected';
}

export enum ProductCategory {
  ExecutiveTable = 'Executive Table',
  OfficeTable = 'Office Table',
  ConferenceTable = 'Conference Table',
  ReceptionDesk = 'Reception Desk',
  FilingCabinet = 'Filing Cabinet',
  MobilePedestal = 'Mobile Pedestal',
  OfficeChair = 'Office Chair',
  GangChair = 'Gang Chair',
  Sofa = 'Sofa',
  HomeFurniture = 'Home Furniture',
  Other = 'Other'
}
