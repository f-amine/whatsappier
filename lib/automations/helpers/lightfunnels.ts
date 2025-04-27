import { prisma } from "@/lib/db";
import { NextApiRequest, NextApiResponse } from "next";

export type Opts = {
  data: {
    query: string;
    variables?: { [key: string]: any };
  };
  token: string | undefined;
};

export class LfError extends Error {
  constructor(errors: any) {
    super();
    this.errors = errors;
  }
  errors: { key: string }[];
}

export enum WebhookVersion {
  V1 = "v1",
  V2 = "v2"
}

export enum WebhookType {
  ORDER_CONFIRMED = "order/confirmed",
  ORDER_CREATED = "order/created",
  ORDER_FULFILLED = "order/fulfilled",
  ORDER_UPDATED = "order/updated"
}

export enum OrderFinancialStatus {
  PENDING = "pending",
  PAID = "paid",
  REFUNDED = "refunded",
  PARTIALLY_REFUNDED = "partially_refunded"
}

export enum OrderFulfillmentStatus {
  UNFULFILLED = "unfulfilled",
  FULFILLED = "fulfilled",
  PARTIAL = "partial"
}

export interface WebhookSettings {
  segments_uids?: string[];
}

export interface WebhookInput {
  type: WebhookType;
  url: string;
  version?: WebhookVersion;
  settings: WebhookSettings;
}

export interface WebhookResponse {
  id: string;
  type: WebhookType;
  url: string;
  settings: WebhookSettings;
}

export interface FunnelNode {
  id: string;
  _id: number;
  name: string;
  published: boolean;
  slug: string;
  created_at: string;
}

export interface FunnelEdge {
  node: FunnelNode;
  cursor: string;
}

export interface FunnelsResponse {
  edges: FunnelEdge[];
  pageInfo: PageInfo;
}

export interface OrderQueryOptions {
  first?: number;
  after?: string;
  orderBy?: string;
  orderDir?: "asc" | "desc";
  status?: string;
  financialStatus?: OrderFinancialStatus;
  fulfillmentStatus?: OrderFulfillmentStatus;
  createdAt?: string;
  productId?: string;
}



export interface PageInfo {
  endCursor: string;
  hasNextPage: boolean;
}

export interface OrdersResponse {
  edges: OrderEdge[];
  pageInfo: PageInfo;
}

export interface CustomerInfo {
  id: string;
  full_name: string;
  email?: string;
  phone?: string;
}

export interface Address {
  first_name: string;
  last_name: string;
  address1: string;
  address2?: string;
  city: string;
  province: string;
  country: string;
  zip: string;
  phone?: string;
}

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: string;
  _id: number;
  name: string;
  email: string;
  phone: string;
  total: number;
  subtotal: number;
  shipping: number;
  fulfillment_status: OrderFulfillmentStatus;
  financial_status: OrderFinancialStatus;
  customer: CustomerInfo;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  test: boolean;
  currency: string;
  notes?: string;
  tags?: string[];
  items?: OrderItem[];
  shipping_address?: Address;
  billing_address?: Address;
}

export interface UpdateOrderInput {
  notes?: string;
  archived?: boolean;
  email?: string;
  phone?: string;
  shipping_address?: Address;
  billing_address?: Address;
  sync_customer_details?: boolean;
  items?: string[];
  variants?: number[];
  custom?: Record<string, any>;
  tags?: string[];
}


export interface LightfunnelsOrderConfirmedNode {
    id: string;                     // "order_WFLOuLiQzbYAYwHmdRlJp"
    __typename?: "Order";
    _id: number;                    // 11238837
    account_id: string;
    name: string;                   // "1085" (Order Name/Number)
    total: number;
    subtotal: number;
    discount_value?: number;
    email: string;
    phone: string;
    archived_at: string | null;
    refunded_amount?: number;
    paid_by_customer?: number;
    net_payment?: number;
    original_total?: number;
    refundable?: number;
    created_at: string;
    cancelled_at: string | null;
    test: boolean;
    tags?: string[];
    shipping?: number;
    shipping_discount?: number;
    funnel_id?: string;
    store_id?: string | null;
    customer?: LightfunnelsCustomer;
    custom?: Record<string, any>;
    items?: LightfunnelsOrderItem[];
    payments?: LightfunnelsPayment[];
    shipping_address?: LightfunnelsAddress;
    billing_address?: LightfunnelsAddress;
    client_details?: LightfunnelsClientDetails;
    utm?: null | Record<string, any>;
    currency?: string;
    fulfillment_status?: OrderFulfillmentStatus | string;
    financial_status?: OrderFinancialStatus | string;
}

export interface LightfunnelsWebhookEventPayload {
    node: Record<string, any> | LightfunnelsOrderConfirmedNode; // Could use a union of all possible node types later
}

// Updated Customer type
export interface LightfunnelsCustomer {
    id: string;                     // "cus_iANaHzip-fyT9fAKfA0DK"
    full_name: string;              // "Ina Baldwin"
    avatar?: string | null;         // "//www.gravatar.com/..." or null
    location?: string | null;       // "PL, Consequatur Consect" or null
    email?: string;                 // Often redundant with order email
    phone?: string;                 // Often redundant with order phone
}

export interface LightfunnelsOrderItem {
    __typename?: "VariantSnapshot"; // Optional
    product_id: string;             // "prod_VS8g247ProeScc6E13kPn"
    id: string;                     // "vars_oEAkf7GGMHTn0HbBJkuOh" (VariantSnapshot ID)
    _id?: number;                   // 13638521
    image?: string | null;          // null
    customer_files?: any[];         // [] - keep any or define if structure known
    title: string;                  // "hatim test prod " (Treat as item name)
    price: number;                  // 20
    quantity?: number;              // Assuming this exists - ADD based on need, not in sample
    variant_id: string;             // "var_n46n9diGJ-iunxKoiVSaL"
    fulfillment_status?: string;    // "none"
    carrier?: string | null;        // "" or null
    tracking_number?: string | null;// null
    tracking_link?: string | null;  // null
    refund_id?: string | null;      // null
    payment_id?: string | null;     // "pay_13WY-xoM4xXk2yxXhQoFj"
    removed_at?: string | null;     // null
    sku?: string | null;            // "QSDAZD12321"
    custom_options?: any[];         // [] - keep any or define if structure known
    options?: any[];                // [] - keep any or define if structure known
}

// Updated Payment type
export interface LightfunnelsPayment {
    id: string;                     // "pay_13WY-xoM4xXk2yxXhQoFj"
    _id?: number;                   // 10880026
    total: number;                  // 18
    sub_total?: number;             // 20 (optional based on naming variation)
    created_at: string;             // "a few seconds ago" (string, might need parsing)
    refunded?: number;              // 0
    refundable?: number;            // 0
    price_bundle_snapshot?: any[];  // [] - keep any or define if structure known
    discount_snapshot?: null | Record<string, any>; // null or object
    refunds?: any[];                // [] - keep any or define if structure known
    source?: {                      // Optional source object
        payment_gateway?: {         // Optional gateway object
            prototype?: {           // Optional prototype object
                key?: string;       // "cod" (Payment method key)
            };
        };
    };
    cookies?: Record<string, any>;  // {}
}

// Updated Address type
export interface LightfunnelsAddress {
    first_name?: string | null;     // "Ina" or null
    last_name?: string | null;      // "Baldwin" or null
    email?: string | null;          // "gili@mailinator.com" or null
    phone?: string | null;          // "+1 (268) 141-8533" or null
    line1?: string | null;          // "Qui numquam nulla ve" or null
    line2?: string | null;          // "Qui maxime voluptate" or null
    country?: string | null;        // "PL" or "MA" or null
    city?: string | null;           // "Consequatur Consect" or null
    area?: string | null;           // "" or null
    zip?: string | null;            // "62299" or null
    state?: string | null;          // "Qui rem est repellen" or null
}

// Client Details type
export interface LightfunnelsClientDetails {
    ip?: string | null;             // "105.158.102.93" or null
}


export interface WebhookPayload {
  id: string;
  _id: number;
  account_id: string;
  name: string;
  email: string;
  phone: string;
  total: number;
  subtotal: number;
  financial_status: OrderFinancialStatus;
  fulfillment_status: OrderFulfillmentStatus;
  customer: CustomerInfo;
  shipping_address?: Address;
  billing_address?: Address;
  items?: OrderItem[];
}

export type WebhookHandler = (
  payload: WebhookPayload,
  connection: any,
  req: NextApiRequest,
  res: NextApiResponse
) => Promise<void>;

export class LightFunnelsService {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  private async lf({ data }: Omit<Opts, "token">): Promise<any> {
    if (!this.token) {
      return Promise.reject(new Error("Token is required"));
    }
    if (!process.env.LF_URL) {
      return Promise.reject(new Error("LF_URL is not defined"));
    }
    return fetch(`${process.env.LF_URL}/api2`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((response) => {
        if (response.errors) {
          console.log(response.errors);
          const er = new LfError(response.errors);
          return Promise.reject(er);
        }
        return response;
      });
  }

  // Webhook Methods
  async createWebhook(webhook: WebhookInput): Promise<WebhookResponse> {
    const query = `
      mutation CreateWebhookMutation($node: WebhookInput!) {
        createWebhook(node: $node) {
          id
          type
          url
          settings
        }
      }
    `;

    const response = await this.lf({
      data: {
        query,
        variables: { node: webhook }
      }
    });

    return response.data.createWebhook;
  }

  async deleteWebhook(id: string): Promise<string> {
    const query = `
      mutation DeleteWebhookMutation($id: ID!) {
        deleteWebhook(id: $id)
      }
    `;

    const response = await this.lf({
      data: {
        query,
        variables: { id }
      }
    });

    return response.data.deleteWebhook;
  }

  async listWebhooks(): Promise<WebhookResponse[]> {
    const query = `
      query WebhooksQuery {
        webhooks {
          id
          type
          url
          settings
        }
      }
    `;

    const response = await this.lf({
      data: {
        query
      }
    });

    return response.data.webhooks;
  }

  async createOrderConfirmationWebhook(
    callbackUrl: string, 
    accountId?: string
  ): Promise<WebhookResponse> {
    const url = accountId 
      ? callbackUrl.replace('{{account-id}}', accountId) 
      : callbackUrl;

    return this.createWebhook({
      type: WebhookType.ORDER_CONFIRMED,
      url,
      settings: {}
    });
  }

  async getFunnels(options: { first?: number; after?: string, query?: string } = {}): Promise<{ id: string; name: string }[]> {
    const { first = 10, after = "", query: queryFilter = "order_by:id published:true" } = options; // Default query

    const query = `
      query FunnelsQuery($first: Int, $after: String, $query: String!) {
        funnels(query: $query, after: $after, first: $first) {
          edges {
            node {
              id
              name
            }
            cursor
          }
          pageInfo {
            endCursor
            hasNextPage
          }
        }
      }
    `;

    const response = await this.lf({
      data: {
        query,
        variables: { first, after, query: queryFilter },
      },
    });

    // Defensive check for data structure
    if (!response || !response.data || !response.data.funnels || !response.data.funnels.edges) {
        console.error("Unexpected response structure from Lightfunnels Funnels API:", response);
        throw new Error("Invalid response structure received from Lightfunnels API.");
    }

    const funnelsData = response.data.funnels as FunnelsResponse;

    // Extract only id and name
    const funnelsList = funnelsData.edges.map(edge => ({
      id: edge.node.id,
      name: edge.node.name,
    }));

    return funnelsList;
  }

  // Order Methods
  private buildQueryString(options: OrderQueryOptions): string {
    const parts: string[] = [];
    
    if (options.orderBy) parts.push(`order_by:${options.orderBy}`);
    if (options.orderDir) parts.push(`order_dir:${options.orderDir}`);
    if (options.status) parts.push(`status:${options.status}`);
    if (options.financialStatus) parts.push(`financial_status:${options.financialStatus}`);
    if (options.fulfillmentStatus) parts.push(`fulfillment_status:${options.fulfillmentStatus}`);
    if (options.createdAt) parts.push(`created_at:${options.createdAt}`);
    if (options.productId) parts.push(`product_id:${options.productId}`);
    
    return parts.join(' ');
  }

  async getOrders(options: OrderQueryOptions = {}): Promise<OrdersResponse> {
    const { first = 25, after } = options;
    const queryString = this.buildQueryString(options) || "order_by:id order_dir:desc";
    
    const query = `
      query OrdersQuery($first: Int, $after: String, $query: String!) {
        orders(query: $query, after: $after, first: $first) {
          edges {
            node {
              id
              _id
              name
              email
              phone
              total
              subtotal
              shipping
              fulfillment_status
              financial_status
              customer {
                id
                full_name
                email
                phone
              }
              cancelled_at
              created_at
              updated_at
              test
              currency
              notes
              tags
            }
            cursor
          }
          pageInfo {
            endCursor
            hasNextPage
          }
        }
      }
    `;

    const response = await this.lf({
      data: {
        query,
        variables: { 
          first, 
          after, 
          query: queryString 
        }
      }
    });

    return response.data.orders;
  }

  async getOrderById(id: string): Promise<Order> {
    const query = `
      query OrderQuery($id: ID!) {
        node(id: $id) {
          ... on Order {
            id
            _id
            name
            email
            phone
            total
            subtotal
            shipping
            fulfillment_status
            financial_status
            customer {
              id
              full_name
              email
              phone
            }
            cancelled_at
            created_at
            updated_at
            test
            currency
            notes
            tags
            items {
              id
              name
              price
              quantity
            }
            shipping_address {
              first_name
              last_name
              address1
              address2
              city
              province
              country
              zip
              phone
            }
            billing_address {
              first_name
              last_name
              address1
              address2
              city
              province
              country
              zip
              phone
            }
          }
        }
      }
    `;

    const response = await this.lf({
      data: {
        query,
        variables: { id }
      }
    });

    return response.data.node;
  }

  async updateOrder(id: string, data: UpdateOrderInput): Promise<Order> {
    const query = `
      mutation UpdateOrderMutation($id: ID!, $node: InputOrder!) {
        updateOrder(id: $id, node: $node) {
          id
          _id
          name
          email
          notes
          tags
          updated_at
        }
      }
    `;

    const response = await this.lf({
      data: {
        query,
        variables: { 
          id,
          node: data
        }
      }
    });

    return response.data.updateOrder;
  }
}

