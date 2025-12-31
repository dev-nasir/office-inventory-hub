export const INVENTORY_CATEGORIES = [
  'Laptop',
  'Mobile',
  'Data Device',
  'Charger',
  'Mouse',
  'LCD',
  'Type-C Connector',
  'VGA Cable',
  'HDMI Cable',
  'Power Cable',
  'SSD',
  'RAM',
  'Battery',
  'Keyboard',
  'Other',
];

export type InventoryCategory = (typeof INVENTORY_CATEGORIES)[number];
