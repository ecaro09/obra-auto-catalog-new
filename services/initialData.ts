
import { Product, ProductCategory } from '../types';

const calculateMarkup = (price: number) => Math.ceil(price * 1.10);

const getImgForCategory = (cat: ProductCategory) => {
  const images = {
    [ProductCategory.ExecutiveTable]: '1518455027359-f3f8164ba6bd',
    [ProductCategory.OfficeTable]: '1497215842964-222b4bef9726',
    [ProductCategory.ConferenceTable]: '1611269154421-4e27233ac5c7',
    [ProductCategory.Workstation]: '1497215842964-222b4bef9726',
    [ProductCategory.ReceptionDesk]: '1518455027359-f3f8164ba6bd',
    [ProductCategory.FilingCabinet]: '1522204523234-8729aa6e3d5f',
    [ProductCategory.MobilePedestal]: '1522204523234-8729aa6e3d5f',
    [ProductCategory.OfficeChair]: '1580480055273-228ff5388ef8',
    [ProductCategory.GangChair]: '1505330622279-bf7d7fc918f4',
    [ProductCategory.Sofa]: '1555041469-a586c61ea9bc',
    [ProductCategory.Locker]: '1522204523234-8729aa6e3d5f',
    [ProductCategory.StorageRack]: '1595514020176-23b93df2df73',
    [ProductCategory.HomeFurniture]: '1555041469-a586c61ea9bc',
    [ProductCategory.DiningFurniture]: '1555041469-a586c61ea9bc',
    [ProductCategory.OutdoorFurniture]: '1505330622279-bf7d7fc918f4',
    [ProductCategory.Other]: '1518455027359-f3f8164ba6bd'
  };
  return images[cat] || images[ProductCategory.Other];
};

const createProduct = (
  id: string,
  code: string,
  name: string,
  category: ProductCategory,
  price: number,
  dim: string,
  desc: string,
  features: string
): Product => {
  const imgId = getImgForCategory(category);
  return {
    id,
    code,
    name,
    category,
    originalPrice: price,
    sellingPrice: calculateMarkup(price),
    dimensions: dim,
    description: `${desc}. ${features}`,
    images: [
      `https://images.unsplash.com/photo-${imgId}?auto=format&fit=crop&q=80&w=800`,
      `https://images.unsplash.com/photo-${imgId}?auto=format&fit=crop&q=80&w=801`
    ],
    isLocked: true,
    isActive: true,
  };
};

export const INITIAL_PRODUCTS: Product[] = [
  // Page 2: EXECUTIVE GLASS TOP TABLE
  createProduct('p1', '944EOT NKT-031 1.8M', 'Executive Glass Top Table', ProductCategory.ExecutiveTable, 32470, 'Front: L180xW80xH76cm', 'Modern contemporary design', 'Tempered glass, Stainless steel leg'),
  createProduct('p2', '944EOT NKT-031 1.6M', 'Executive Glass Top Table', ProductCategory.ExecutiveTable, 28560, 'Front: L160xW80xH76cm', 'Modern contemporary design', 'Tempered glass, Stainless steel leg'),
  
  // Page 3: EXECUTIVE GLASS TOP TABLE
  createProduct('p3', 'NKT-003 1.8M', 'Executive Glass Top Table', ProductCategory.ExecutiveTable, 26211, 'L180xW80xH76cm', '12mm thickness tempered glass', 'Mobile pedestal included'),
  createProduct('p4', 'NKT-003 1.6M', 'Executive Glass Top Table', ProductCategory.ExecutiveTable, 25542, 'L160xW80xH76cm', '12mm thickness tempered glass', 'Mobile pedestal included'),

  // Page 4: EXECUTIVE TABLE
  createProduct('p5', 'JA A03-20', 'Executive Table', ProductCategory.ExecutiveTable, 29364, 'Table: 1200cm x W80cm x H75cm', 'High-tech vacuum forming process', 'Combi-lock system'),

  // Page 5: EXECUTIVE TABLE
  createProduct('p6', 'JA A02-20', 'Executive Table', ProductCategory.ExecutiveTable, 24685, 'Table: L180cm x W80cm x H75cm', 'Exquisite leather processing', 'Push to open cabinet'),

  // Page 6: EXECUTIVE TABLE
  createProduct('p7', 'SH102-16', 'Executive Table', ProductCategory.ExecutiveTable, 23066, 'L160cm x W72cm x H75cm', 'Melamine finish', 'Combi-lock drawer'),
  createProduct('p8', 'SH102-18', 'Executive Table', ProductCategory.ExecutiveTable, 24197, 'L180cm x W72cm x H75cm', 'Melamine finish', 'Combi-lock drawer'),

  // Page 9: EXECUTIVE TABLE
  createProduct('p9', 'SQ 17162M', 'Executive Table', ProductCategory.ExecutiveTable, 24500, 'L200cm x W80cm x H76cm', 'Side drawers with safety lock', 'Grommet'),
  createProduct('p10', 'SQ 17161.8M', 'Executive Table', ProductCategory.ExecutiveTable, 23400, 'L180cm x W80cm x H76cm', 'Side drawers with safety lock', 'Grommet'),

  // Page 10: EXECUTIVE TABLE
  createProduct('p11', 'SQ 17811.8M', 'Executive Table', ProductCategory.ExecutiveTable, 18200, 'L180cm x W80cm x H76cm', 'Mobile Pedestal included', 'Keyboard tray'),
  
  // Page 12: EXECUTIVE TABLE
  createProduct('p12', '50,6116', 'Executive Table', ProductCategory.ExecutiveTable, 16750, 'L160cm x W80cm x H76cm', 'Melamine finish', 'Keyboard tray'),

  // Page 14: EXECUTIVE TABLE
  createProduct('p13', 'M12TR147 1.4M', 'Executive Table', ProductCategory.ExecutiveTable, 14110, 'L140cm x W70cm x H75cm', 'Metal frame in painting', 'Extension table'),
  createProduct('p14', 'M12TR147 2M', 'Executive Table', ProductCategory.ExecutiveTable, 17675, 'L200cm x W80cm x H75cm', 'Metal frame in painting', 'Extension table'),

  // Page 15: EXECUTIVE TABLE SET
  createProduct('p15', 'LPMA27 SET 1.6M', 'Executive Table Set', ProductCategory.ExecutiveTable, 17740, 'L160cm x W80cm x H75cm', 'Durable steel frame', 'Mobile pedestal'),

  // Page 18: L-TYPE OFFICE TABLE
  createProduct('p16', '50,7904', 'L-Type Office Table', ProductCategory.OfficeTable, 9600, 'Table: L140cm x W60cm x H75cm', 'System unit bin', 'Side drawers with combi-lock'),

  // Page 19: L-TYPE OFFICE TABLE
  createProduct('p17', 'OT1415', 'L-Type Office Table', ProductCategory.OfficeTable, 10700, 'L120cm x W60cm x H75cm', 'Side shelves', 'Wide leg room'),

  // Page 21: GLASS TOP OFFICE TABLE
  createProduct('p18', 'Nkt 001 1.4M', 'Glass Top Office Table', ProductCategory.OfficeTable, 10135, 'L140cm x W70cm x H75cm', '12mm tempered glass', 'Gang lock system'),

  // Page 22: FOLDABLE TABLE
  createProduct('p19', 'AM$7907', 'Foldable Table', ProductCategory.OfficeTable, 4975, 'L120cm x W60cm x H75cm', 'MDF board', 'Durable caster wheels'),

  // Page 24: JR. OFFICE TABLE
  createProduct('p20', 'OT 614', 'Jr. Office Table', ProductCategory.OfficeTable, 8250, 'L140cm x W70cm x H75cm', 'Melamine wood', 'Soft-close cabinet'),

  // Page 44: OFFICE METAL TABLE
  createProduct('p21', 'ODK1A', 'Office Metal Table', ProductCategory.OfficeTable, 12400, 'L120cm x W60cm x H75cm', 'MDF Table top', 'Powder-coated metal stand'),

  // Page 46: METAL RACK
  createProduct('p22', 'WLS-066', 'Metal Rack', ProductCategory.StorageRack, 5145, 'L90cm x W45cm x H183cm', 'Powder Coated finish', '120kg per shelf'),
  createProduct('p23', 'WLS-067', 'Metal Rack', ProductCategory.StorageRack, 6195, 'L120cm x W45cm x H183cm', 'Powder Coated finish', '120kg per shelf'),

  // Page 50: FILING CABINET
  createProduct('p24', 'DGD4', 'Filing Cabinet', ProductCategory.FilingCabinet, 8000, 'L62cm x W46xH134cm', 'Powder coating finish', 'Superior gang lock'),

  // Page 60: LOCKER CABINET
  createProduct('p25', '3L-B6', 'Locker Cabinet', ProductCategory.Locker, 13830, 'L90cm x W35xH185cm', '18 doors', 'High quality steel'),

  // Page 72: RECEPTION DESK
  createProduct('p26', 'JA-R01-24', 'Reception Desk / Counter Table', ProductCategory.ReceptionDesk, 21945, 'L240cm x W70xH105cm', 'LED light', 'Soft close drawer'),

  // Page 73: CONFERENCE TABLE
  createProduct('p27', 'JA-C02-24', 'Conference Table', ProductCategory.ConferenceTable, 32745, 'L240cm x W100xH75cm', 'Curved edges table top', 'Grommet'),

  // Page 78: WORKSTATION
  createProduct('p28', 'SQ-1707', 'Workstation', ProductCategory.Workstation, 25000, 'L240cm x W120xH75cm', 'Four seating capacity', 'Cabinet storage'),

  // Page 80: GANGCHAIR
  createProduct('p29', 'GC5STR 5-seater', 'Airport Gang Chair', ProductCategory.GangChair, 10970, 'L286cm x W68xH77cm', 'Steel arm and leg frame', 'Chrome plated'),

  // Page 83: OFFICE CHAIR
  createProduct('p30', 'YS946-6 B1K', 'Fabric Office Chair', ProductCategory.OfficeChair, 2670, 'L56cm x W46xH6cm', 'Upholstered in fabric', '360 swivel'),
  
  // Page 105: EXECUTIVE CHAIR
  createProduct('p31', '3009B', 'Jr. Executive Leatherette Chair', ProductCategory.OfficeChair, 6790, 'L56cm x W51xH104cm', 'Upholstered in leather', 'Padded armrest'),

  // Page 116: EXECUTIVE MESH CHAIR WITH FOOTREST
  createProduct('p32', '430FJNS3Y', 'Executive Mesh Chair with Footrest', ProductCategory.OfficeChair, 11735, 'L55cm x W51xH112cm', 'Reclining backrest', 'Foot rest'),

  // Page 151: SOFA BED
  createProduct('p33', 'DZ 603', 'Home Furniture - Sofa Bed', ProductCategory.Sofa, 11075, 'L196cm x W98xH19cm', 'Back & seat with fabric cover', 'Extendable function'),

  // Page 169: DINING SET
  createProduct('p34', 'TERRY', 'Home Furniture - Dining Set', ProductCategory.DiningFurniture, 62000, 'Table: L160xW90xH75cm', '6-seater', 'Marble top, Solid wood frame'),

  // Page 174: ADJUSTABLE DESK
  // Fixed: Added missing features argument (expected 8, got 7)
  createProduct('p35', 'SOFT-AMF-5526', 'Electric Adjustable Office Table', ProductCategory.OfficeTable, 12000, 'Adjustable Height', 'Digital control panel', 'Single motor'),

  // Page 177: MODERN EXECUTIVE
  createProduct('p36', 'OFF-A1816', 'L-type Executive Table', ProductCategory.ExecutiveTable, 22200, '160W x 80D x 75H cm', 'LED front accord design', 'Wire management'),

  // Page 193: STEEL LOCKER
  createProduct('p37', 'SFC-G108', '12 Door Steel Locker', ProductCategory.Locker, 9550, '185H x 90W x 40D cm', 'Acid washed phosphatized', 'Card holder'),

  // Page 200: STEEL RACK
  createProduct('p38', 'SFR-H08', '5 Layers Adjustable Steel Rack', ProductCategory.StorageRack, 5150, '1830H x 1200W x 457D mm', 'Steel powder coating', '5 adjustable shelves')
];
