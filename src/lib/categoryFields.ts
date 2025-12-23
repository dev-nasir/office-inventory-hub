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
    { name: 'model', label: 'Model', type: 'text', placeholder: 'e.g., Dell XPS 15' },
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
      options: ['128GB SSD', '256GB SSD', '512GB SSD', '1TB SSD', '2TB SSD', '4TB SSD', '500GB HDD', '1TB HDD'] 
    },
    { name: 'serialNumber', label: 'Serial Number', type: 'text', placeholder: 'Enter serial number' },
    { name: 'company', label: 'Company/Brand', type: 'text', placeholder: 'e.g., Dell, HP, Lenovo' },
  ],
  'MacBook': [
    { name: 'model', label: 'Model', type: 'text', placeholder: 'e.g., MacBook Pro 14"' },
    { 
      name: 'ram', 
      label: 'RAM', 
      type: 'select', 
      options: ['8GB', '16GB', '18GB', '24GB', '32GB', '36GB', '48GB', '64GB', '96GB', '128GB'] 
    },
    { 
      name: 'storage', 
      label: 'Storage', 
      type: 'select', 
      options: ['256GB SSD', '512GB SSD', '1TB SSD', '2TB SSD', '4TB SSD', '8TB SSD'] 
    },
    { name: 'serialNumber', label: 'Serial Number', type: 'text', placeholder: 'Enter serial number' },
    { name: 'company', label: 'Company/Brand', type: 'text', placeholder: 'Apple' },
  ],
  'Mobile': [
    { name: 'model', label: 'Model', type: 'text', placeholder: 'e.g., iPhone 14 Pro' },
    { 
      name: 'storage', 
      label: 'Storage', 
      type: 'select', 
      options: ['32GB', '64GB', '128GB', '256GB', '512GB', '1TB'] 
    },
    { name: 'serialNumber', label: 'Serial Number', type: 'text', placeholder: 'Enter serial number' },
    { name: 'company', label: 'Company/Brand', type: 'text', placeholder: 'e.g., Apple, Samsung' },
  ],
  'LED/LCD': [
    { name: 'size', label: 'Size', type: 'text', placeholder: 'e.g., 27 inch' },
    { name: 'resolution', label: 'Resolution', type: 'text', placeholder: 'e.g., 2560x1440' },
    { name: 'model', label: 'Model', type: 'text', placeholder: 'Enter model' },
    { name: 'company', label: 'Company/Brand', type: 'text', placeholder: 'e.g., Dell, LG, Samsung' },
  ],
  'Mouse': [
    { name: 'model', label: 'Model', type: 'text', placeholder: 'Enter model' },
    { 
      name: 'connectionType', 
      label: 'Connection Type', 
      type: 'select',
      options: ['Wired', 'Wireless', 'Bluetooth']
    },
    { name: 'company', label: 'Company/Brand', type: 'text', placeholder: 'e.g., Logitech, Razer' },
  ],
  'Keyboard': [
    { name: 'model', label: 'Model', type: 'text', placeholder: 'Enter model' },
    { 
      name: 'connectionType', 
      label: 'Connection Type', 
      type: 'select',
      options: ['Wired', 'Wireless', 'Bluetooth']
    },
    { name: 'company', label: 'Company/Brand', type: 'text', placeholder: 'e.g., Logitech, Corsair' },
  ],
  'Type-C Connector': [
    { name: 'length', label: 'Length', type: 'text', placeholder: 'e.g., 1m, 2m' },
    { 
      name: 'type', 
      label: 'Type', 
      type: 'select',
      options: ['USB-C to USB-C', 'USB-C to USB-A', 'USB-C to HDMI', 'USB-C to DisplayPort']
    },
    { name: 'company', label: 'Company/Brand', type: 'text', placeholder: 'e.g., Anker, Belkin' },
  ],
  'Data Device': [
    { 
      name: 'type', 
      label: 'Type', 
      type: 'select',
      options: ['USB Drive', 'External HDD', 'External SSD', 'SD Card']
    },
    { name: 'capacity', label: 'Capacity', type: 'text', placeholder: 'e.g., 1TB, 256GB' },
    { name: 'model', label: 'Model', type: 'text', placeholder: 'Enter model' },
    { name: 'company', label: 'Company/Brand', type: 'text', placeholder: 'e.g., SanDisk, Samsung' },
  ],
  'Other': [
    { name: 'specifications', label: 'Specifications', type: 'textarea', placeholder: 'Enter detailed specifications' },
  ],
};
