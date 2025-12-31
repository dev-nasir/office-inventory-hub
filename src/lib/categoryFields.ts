// Category-specific field definitions
export interface FieldDefinition {
  name: string;
  label: string;
  type: 'text' | 'select' | 'textarea';
  options?: string[];
  placeholder?: string;
}

export const categoryFields: Record<string, FieldDefinition[]> = {
  'Laptop': [
    { name: 'model', label: 'Model', type: 'text', placeholder: 'e.g., Dell XPS 15 / MacBook Pro 14"' },
    { 
      name: 'ram', 
      label: 'RAM', 
      type: 'select', 
      options: ['4GB', '8GB', '12GB', '16GB', '24GB', '32GB', '64GB', '128GB'] 
    },
    { 
      name: 'storage', 
      label: 'Storage', 
      type: 'select', 
      options: ['256GB SSD', '512GB SSD', '1TB SSD', '2TB SSD', '4TB SSD', '500GB HDD', '1TB HDD'] 
    },
    { name: 'serialNumber', label: 'Serial Number', type: 'text', placeholder: 'Enter serial number' },
    { 
      name: 'company', 
      label: 'Company/Brand', 
      type: 'select', 
      options: ['Dell', 'HP', 'Lenovo', 'Apple', 'Asus', 'Acer', 'Microsoft', 'Samsung', 'Toshiba', 'MSI', 'Huawei', 'Other']
    },
  ],
  'Mobile': [
    { name: 'model', label: 'Model', type: 'text', placeholder: 'e.g., iPhone 15, Samsung S23' },
    { name: 'imei', label: 'IMEI Number', type: 'text', placeholder: 'Enter IMEI' },
    { name: 'storage', label: 'Storage', type: 'select', options: ['64GB', '128GB', '256GB', '512GB', '1TB'] },
    { name: 'company', label: 'Brand', type: 'select', options: ['Apple', 'Samsung', 'Google', 'Xiaomi', 'Oppo', 'Vivo', 'Realme', 'Other'] },
  ],
  'Data Device': [
    { name: 'type', label: 'Device Type', type: 'select', options: ['SIM Data Device', 'WiFi Router', '4G Dongle', 'Switch', 'Access Point', 'Other'] },
    { name: 'company', label: 'Brand/Provider', type: 'select', options: ['Zong', 'Jazz', 'Warid', 'Ufone', 'Telenor', 'TP-Link', 'Huawei', 'D-Link', 'Cisco', 'Other'] },
    { name: 'serialNumber', label: 'Serial Number/MAC', type: 'text', placeholder: 'Enter SN or MAC' },
  ],
  'Charger': [
    { name: 'type', label: 'Charger Type', type: 'select', options: ['Laptop Adapter', 'Mobile Charger', 'Type-C', 'MagSafe', 'Other'] },
    { name: 'wattage', label: 'Wattage (W)', type: 'text', placeholder: 'e.g., 65W, 20W' },
    { name: 'company', label: 'Brand', type: 'text', placeholder: 'e.g., Apple, Dell, Anker' },
  ],
  'Mouse': [
    { name: 'type', label: 'Type', type: 'select', options: ['Wired', 'Wireless', 'Bluetooth'] },
    { name: 'company', label: 'Brand', type: 'select', options: ['Logitech', 'Dell', 'HP', 'Razer', 'A4Tech', 'Apple', 'Other'] },
  ],
  'LCD': [
    { name: 'size', label: 'Screen Size', type: 'text', placeholder: 'e.g., 24", 27", 32"' },
    { name: 'resolution', label: 'Resolution', type: 'select', options: ['FHD (1080p)', 'QHD (2K)', 'UHD (4K)', 'Other'] },
    { name: 'company', label: 'Brand', type: 'select', options: ['Dell', 'HP', 'Samsung', 'LG', 'ASUS', 'ViewSonic', 'Other'] },
    { name: 'serialNumber', label: 'Serial Number', type: 'text', placeholder: 'Enter serial number' },
  ],
  'Type-C Connector': [
    { name: 'type', label: 'Adapter Type', type: 'text', placeholder: 'e.g., Type-C to HDMI, Type-C Hub' },
    { name: 'company', label: 'Brand', type: 'text', placeholder: 'e.g., Ugreen, Baseus, Anker' },
  ],
  'VGA Cable': [
    { name: 'length', label: 'Length', type: 'text', placeholder: 'e.g., 1.5m, 3m, 5m' },
    { name: 'brand', label: 'Brand (Optional)', type: 'text' },
  ],
  'HDMI Cable': [
    { name: 'version', label: 'Version', type: 'select', options: ['HDMI 1.4', 'HDMI 2.0', 'HDMI 2.1', 'Other'] },
    { name: 'length', label: 'Length', type: 'text', placeholder: 'e.g., 1.5m, 3m, 5m' },
  ],
  'Power Cable': [
    { name: 'type', label: 'Plug Type', type: 'select', options: ['UK (3-pin)', 'EU (2-pin)', 'US', 'Other'] },
    { name: 'length', label: 'Length', type: 'text', placeholder: 'e.g., 1.5m' },
  ],
  'SSD': [
    { name: 'capacity', label: 'Capacity', type: 'select', options: ['128GB', '256GB', '512GB', '1TB', '2TB', 'Other'] },
    { name: 'interface', label: 'Interface', type: 'select', options: ['SATA', 'NVMe M.2', 'External USB', 'Other'] },
    { name: 'company', label: 'Brand', type: 'select', options: ['Samsung', 'Kingston', 'Crucial', 'Western Digital', 'Seagate', 'Transcend', 'Other'] },
  ],
  'RAM': [
    { name: 'capacity', label: 'Capacity', type: 'select', options: ['4GB', '8GB', '16GB', '32GB', 'Other'] },
    { name: 'type', label: 'RAM Type', type: 'select', options: ['DDR3', 'DDR4', 'DDR5', 'LPDDR4', 'Other'] },
    { name: 'company', label: 'Brand', type: 'select', options: ['Kingston', 'Crucial', 'Corsair', 'Samsung', 'SK Hynix', 'Other'] },
  ],
  'Battery': [
    { name: 'deviceModel', label: 'For Device Model', type: 'text', placeholder: 'e.g., Dell Latitude 5420' },
    { name: 'capacity', label: 'Capacity (mAh/Wh)', type: 'text', placeholder: 'e.g., 5000mAh' },
  ],
  'Keyboard': [
    { name: 'type', label: 'Type', type: 'select', options: ['Wired', 'Wireless', 'Bluetooth', 'Mechanical'] },
    { name: 'layout', label: 'Layout', type: 'select', options: ['US English', 'UK English', 'Other'] },
    { name: 'company', label: 'Brand', type: 'select', options: ['Logitech', 'Dell', 'HP', 'Razer', 'Keychron', 'Other'] },
  ],
  'Other': [
    { name: 'specifications', label: 'Specifications', type: 'textarea', placeholder: 'Enter detailed specifications' },
  ],
};
