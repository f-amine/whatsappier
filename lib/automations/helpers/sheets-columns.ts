// Google Sheets column definitions organized by category
export interface SheetColumnDefinition {
  field: string;
  displayName: string;
  category: string;
  defaultEnabled: boolean;
}

// Reusable column definitions for order data
export const ORDER_SHEET_COLUMNS: SheetColumnDefinition[] = [
  // Basic order info
  { field: 'date', displayName: 'Date', category: 'Basic Info', defaultEnabled: true },
  { field: 'orderNumber', displayName: 'Order Number', category: 'Basic Info', defaultEnabled: true },
  { field: 'orderId', displayName: 'Order ID', category: 'Basic Info', defaultEnabled: false },
  { field: 'internalId', displayName: 'Internal ID', category: 'Basic Info', defaultEnabled: false },
  { field: 'createdAt', displayName: 'Created At', category: 'Basic Info', defaultEnabled: false },
  { field: 'cancelledAt', displayName: 'Cancelled At', category: 'Basic Info', defaultEnabled: false },
  
  // Customer info
  { field: 'customerName', displayName: 'Customer Name', category: 'Customer Info', defaultEnabled: true },
  { field: 'customerEmail', displayName: 'Customer Email', category: 'Customer Info', defaultEnabled: true },
  { field: 'customerPhone', displayName: 'Customer Phone', category: 'Customer Info', defaultEnabled: true },
  { field: 'customerId', displayName: 'Customer ID', category: 'Customer Info', defaultEnabled: false },
  { field: 'customerLocation', displayName: 'Customer Location', category: 'Customer Info', defaultEnabled: false },
  
  // Financial information
  { field: 'currency', displayName: 'Currency', category: 'Financial', defaultEnabled: false },
  { field: 'subtotal', displayName: 'Subtotal', category: 'Financial', defaultEnabled: false },
  { field: 'shipping', displayName: 'Shipping', category: 'Financial', defaultEnabled: false },
  { field: 'discountValue', displayName: 'Discount Value', category: 'Financial', defaultEnabled: false },
  { field: 'totalAmount', displayName: 'Total Amount', category: 'Financial', defaultEnabled: true },
  { field: 'refundedAmount', displayName: 'Refunded Amount', category: 'Financial', defaultEnabled: false },
  { field: 'paidByCustomer', displayName: 'Paid By Customer', category: 'Financial', defaultEnabled: false },
  { field: 'netPayment', displayName: 'Net Payment', category: 'Financial', defaultEnabled: false },
  { field: 'originalTotal', displayName: 'Original Total', category: 'Financial', defaultEnabled: false },
  { field: 'refundable', displayName: 'Refundable', category: 'Financial', defaultEnabled: false },
  
  // Shipping address
  { field: 'shippingAddress', displayName: 'Shipping Address', category: 'Shipping', defaultEnabled: false },
  { field: 'shippingCountry', displayName: 'Shipping Country', category: 'Shipping', defaultEnabled: false },
  { field: 'shippingCity', displayName: 'Shipping City', category: 'Shipping', defaultEnabled: false },
  { field: 'shippingZip', displayName: 'Shipping ZIP', category: 'Shipping', defaultEnabled: false },
  { field: 'shippingState', displayName: 'Shipping State', category: 'Shipping', defaultEnabled: false },
  
  // Billing address
  { field: 'billingAddress', displayName: 'Billing Address', category: 'Billing', defaultEnabled: false },
  { field: 'billingCountry', displayName: 'Billing Country', category: 'Billing', defaultEnabled: false },
  { field: 'billingCity', displayName: 'Billing City', category: 'Billing', defaultEnabled: false },
  { field: 'billingZip', displayName: 'Billing ZIP', category: 'Billing', defaultEnabled: false },
  { field: 'billingState', displayName: 'Billing State', category: 'Billing', defaultEnabled: false },
  
  // Source info
  { field: 'ipAddress', displayName: 'IP Address', category: 'Source', defaultEnabled: false },
  { field: 'funnelId', displayName: 'Funnel ID', category: 'Source', defaultEnabled: false },
  { field: 'storeId', displayName: 'Store ID', category: 'Source', defaultEnabled: false },
  
  // Payment info
  { field: 'paymentMethod', displayName: 'Payment Method', category: 'Payment', defaultEnabled: false },
  { field: 'financialStatus', displayName: 'Financial Status', category: 'Payment', defaultEnabled: false },
  
  // Order status
  { field: 'fulfillmentStatus', displayName: 'Fulfillment Status', category: 'Status', defaultEnabled: false },
  { field: 'tags', displayName: 'Tags', category: 'Status', defaultEnabled: false },
  { field: 'status', displayName: 'Order Status', category: 'Status', defaultEnabled: true },
  
  // Items information
  { field: 'itemCount', displayName: 'Item Count', category: 'Items', defaultEnabled: false },
  { field: 'itemsSummary', displayName: 'Items Summary', category: 'Items', defaultEnabled: false },
  
  // Communication
  { field: 'replyText', displayName: 'Customer Reply Text', category: 'Communication', defaultEnabled: true },
];

// Helper function to get display name from field name
export function getColumnDisplayName(fieldName: string): string {
  const column = ORDER_SHEET_COLUMNS.find(col => col.field === fieldName);
  return column ? column.displayName : fieldName;
}

// Helper function to convert column definitions to form values
export function convertColumnsToFormValues(columns: SheetColumnDefinition[]): Array<{ field: string, enabled: boolean, category: string }> {
  return columns.map(col => ({
    field: col.field,
    enabled: col.defaultEnabled,
    category: col.category
  }));
}

// Helper function to group columns by category
export function getColumnsByCategory(columns: SheetColumnDefinition[]): Record<string, SheetColumnDefinition[]> {
  return columns.reduce((acc, column) => {
    if (!acc[column.category]) {
      acc[column.category] = [];
    }
    acc[column.category].push(column);
    return acc;
  }, {} as Record<string, SheetColumnDefinition[]>);
}
