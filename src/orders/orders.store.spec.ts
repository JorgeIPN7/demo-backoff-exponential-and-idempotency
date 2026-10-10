import type { Order } from './data/order.types.js';
import { OrdersStore } from './orders.store.js';

const order = (id: string, total_centavos = 1000): Order => ({
  id,
  cliente: 'Ana',
  total_centavos,
  canal: 'web',
});

describe('OrdersStore', () => {
  it('guarda un pedido nuevo y regresa true', () => {
    const store = new OrdersStore();

    expect(store.saveIfNotExists(order('O-1'))).toBe(true);
    expect(store.findAll()).toEqual([order('O-1')]);
  });

  it('no guarda un id repetido, regresa false y conserva el original', () => {
    const store = new OrdersStore();
    store.saveIfNotExists(order('O-1', 1000));

    expect(store.saveIfNotExists(order('O-1', 9999))).toBe(false);
    expect(store.findAll()).toEqual([order('O-1', 1000)]);
  });
});
