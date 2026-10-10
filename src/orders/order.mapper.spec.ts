import type { OrderOrigen } from './data/order.types.js';
import { mapOrder } from './order.mapper.js';

const origin = (changes: Partial<OrderOrigen> = {}): OrderOrigen => ({
  order_id: 'O-001',
  customer_name: 'Ana López',
  amount: 199.99,
  source: 'web',
  ...changes,
});

describe('mapOrder', () => {
  it('mapea el esquema origen externo al interno', () => {
    expect(mapOrder(origin())).toEqual({
      id: 'O-001',
      cliente: 'Ana López',
      total_centavos: 19999,
      canal: 'web',
    });
  });

  it('convierte pesos a centavos enteros sin errores de punto flotante', () => {
    expect(mapOrder(origin({ amount: 19.99 })).total_centavos).toBe(1999);
    expect(mapOrder(origin({ amount: 1.1 })).total_centavos).toBe(110);
    expect(mapOrder(origin({ amount: 1250.5 })).total_centavos).toBe(125050);
    expect(mapOrder(origin({ amount: 4500 })).total_centavos).toBe(450000);
    expect(mapOrder(origin({ amount: 0 })).total_centavos).toBe(0);
  });

  it('rechaza montos inválidos', () => {
    expect(() =>
      mapOrder(origin({ amount: null as unknown as number })),
    ).toThrow('invalid amount');
    expect(() => mapOrder(origin({ amount: -10 }))).toThrow('invalid amount');
    expect(() =>
      mapOrder(origin({ amount: '100' as unknown as number })),
    ).toThrow('invalid amount');
  });

  it('rechaza pedidos sin campos obligatorios', () => {
    expect(() => mapOrder(origin({ order_id: '' }))).toThrow(
      'Incomplete order',
    );
    expect(() => mapOrder(origin({ customer_name: '' }))).toThrow(
      'Incomplete order',
    );
  });
});
