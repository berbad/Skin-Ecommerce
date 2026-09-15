export type OrderItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
};
export type StoreOrder = {
  _id: string;
  createdAt: string;
  total: number;
  status: string;
  paymentStatus?: string;
  fulfillmentStatus?: string;
  items: OrderItem[];
  customerName?: string;
  customerEmail?: string;
  shippingAddress?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
};
