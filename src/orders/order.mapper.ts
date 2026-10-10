import type { Order, OrderOrigen } from './data/order.types.js';

export function mapOrder(origin: OrderOrigen): Order {
  const { order_id, customer_name, amount, source } = origin;

  if (!order_id || !customer_name || !source) {
    throw new Error(`Incomplete order: ${JSON.stringify(origin)}`);
  }
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0) {
    throw new Error(`Order ${order_id} has an invalid amount: ${amount}`);
  }

  return {
    id: String(order_id),
    cliente: customer_name.trim(),
    total_centavos: Math.round(amount * 100),
    canal: source,
  };
}
