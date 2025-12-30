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
  'Desktop': [
    { name: 'model', label: 'Model', type: 'text', placeholder: 'e.g., OptiPlex 7090' },
    { name: 'processor', label: 'Processor', type: 'text', placeholder: 'e.g., Core i7-12700' },
    { 
      name: 'ram', 
      label: 'RAM', 
      type: 'select', 
      options: ['8GB', '16GB', '32GB', '64GB', '128GB'] 
    },
    { name: 'gpu', label: 'GPU', type: 'text', placeholder: 'e.g., RTX 3060' },
    { 
      name: 'company', 
      label: 'Company/Brand', 
      type: 'select', 
      options: ['Dell', 'HP', 'Lenovo', 'Custom Built', 'Apple', 'Acer', 'ASUS', 'Other'] 
    },
  ],
  'Accessories': [
    { name: 'type', label: 'Type', type: 'text', placeholder: 'e.g., Mouse, Keyboard, Monitor, Phone' },
    { name: 'model', label: 'Model', type: 'text', placeholder: 'Enter model' },
    { 
      name: 'company', 
      label: 'Company/Brand', 
      type: 'select', 
      options: ['Logitech', 'Razer', 'Apple', 'Samsung', 'Dell', 'LG', 'Sony', 'Anker', 'Belkin', 'UGREEN', 'Other'] 
    },
    { 
      name: 'connectionType', 
      label: 'Connection Type', 
      type: 'select',
      options: ['Wired', 'Wireless', 'Bluetooth', 'USB-C', 'Lighting', 'Other']
    },
  ],
  'Furniture': [
    { name: 'type', label: 'Type', type: 'select', options: ['Chair', 'Desk', 'Table', 'Cabinet', 'Other'] },
    { name: 'color', label: 'Color', type: 'text', placeholder: 'e.g., Black, Wood' },
    { name: 'dimensions', label: 'Dimensions', type: 'text', placeholder: 'e.g., 120x60cm' },
    { name: 'brand', label: 'Brand', type: 'text', placeholder: 'e.g., IKEA, Herman Miller' },
  ],
  'Other': [
    { name: 'specifications', label: 'Specifications', type: 'textarea', placeholder: 'Enter detailed specifications' },
  ],
};
