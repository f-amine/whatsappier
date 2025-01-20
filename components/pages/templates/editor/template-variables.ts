export const templateCategories = [
    { value: "order_confirmation", label: "Order Confirmation", color: "blue" },
    { value: "shipping_update", label: "Shipping Update", color: "green" },
    { value: "abandoned_cart", label: "Abandoned Cart", color: "orange" },
    { value: "payment_received", label: "Payment Received", color: "green" },
    { value: "delivery_confirmation", label: "Delivery Confirmation", color: "blue" },
    { value: "feedback_request", label: "Feedback Request", color: "purple" },
    { value: "promotion", label: "Promotion", color: "pink" },
    { value: "welcome", label: "Welcome Message", color: "indigo" },
  ] as const
  
  export const availableVariables = [
    { 
      value: "customer_name", 
      label: "Customer Name",
      description: "The customer's full name",
      example: "John Doe"
    },
    { 
      value: "order_number", 
      label: "Order Number",
      description: "Unique order identifier",
      example: "#12345"
    },
    { 
      value: "order_status", 
      label: "Order Status",
      description: "Current status of the order",
      example: "Processing"
    },
    { 
      value: "tracking_number", 
      label: "Tracking Number",
      description: "Shipping tracking number",
      example: "TRK789456123"
    },
    { 
      value: "total_amount", 
      label: "Total Amount",
      description: "Order total amount",
      example: "$199.99"
    },
    { 
      value: "store_name", 
      label: "Store Name",
      description: "Your store name",
      example: "Fashion Store"
    },
    { 
      value: "delivery_date", 
      label: "Delivery Date",
      description: "Expected delivery date",
      example: "Tomorrow"
    },
    { 
      value: "product_name", 
      label: "Product Name",
      description: "Name of the product",
      example: "Blue T-Shirt"
    },
  ] as const
  
  export const sampleData = {
    customer_name: "John Doe",
    order_number: "#12345",
    order_status: "Processing",
    tracking_number: "TRK789456123",
    total_amount: "$199.99",
    store_name: "Fashion Store",
    delivery_date: "Tomorrow",
    product_name: "Blue T-Shirt",
  }
  
  export type TemplateCategory = (typeof templateCategories)[number]['value']
  export type TemplateVariable = (typeof availableVariables)[number]['value']