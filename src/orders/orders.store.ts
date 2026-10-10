import { Injectable } from '@nestjs/common';
import type { Order } from './data/order.types.js';

@Injectable()
export class OrdersStore {
  private readonly orders = new Map<string, Order>();

  /**
   * Guarda el pedido solo si su id no existe todavía.
   * Regresa false cuando ya estaba, para contarlo como omitido.
   * En PostgreSQL sería un índice único + INSERT ... ON CONFLICT DO NOTHING.
   */
  saveIfNotExists(order: Order): boolean {
    if (this.orders.has(order.id)) {
      return false;
    }
    this.orders.set(order.id, order);
    return true;
  }

  findAll(): Order[] {
    return [...this.orders.values()];
  }
}
