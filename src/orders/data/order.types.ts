// Esquema del sistema externo - orders-api
export interface OrderOrigen {
  order_id: string;
  customer_name: string;
  amount: number;
  source: string;
}

export interface OrderPage {
  data: OrderOrigen[];
  next_page: number | null;
}

// Esquema interno
export interface Order {
  id: string;
  cliente: string;
  total_centavos: number;
  canal: string;
}

export interface SyncResult {
  processed: number;
  omitted: number;
  failed: number;
}
