import { Logger } from '@nestjs/common';
import type { OrderPage } from './data/order.types.js';
import { type OrdersApiClient, OrdersApiError } from './orders-api.client.js';
import { OrdersService } from './orders.service.js';

const order = (id: string) => ({
  order_id: id,
  customer_name: 'Ana',
  amount: 10,
  source: 'web',
});

// Las páginas no son consecutivas a propósito: el servicio debe seguir next_page, no sumar 1
const PAGES: Record<number, OrderPage> = {
  1: { data: [order('A-1'), order('A-2')], next_page: 3 },
  3: { data: [order('A-3')], next_page: 7 },
  7: { data: [], next_page: null },
};

// API falsa en memoria: el servicio no sabe ni le importa si detrás hay HTTP
function fakeApi(pages: Record<number, OrderPage>, failOn?: number) {
  const requested: number[] = [];
  const api = {
    getPage: async (n: number) => {
      requested.push(n);
      if (n === failOn) throw new OrdersApiError('API caída', 503, n);
      return pages[n];
    },
  } as unknown as OrdersApiClient;
  return { api, requested };
}

describe('OrdersService.sincronizarPedidos', () => {
  beforeAll(() => Logger.overrideLogger(false));

  it('recorre las páginas siguiendo next_page hasta que es null', async () => {
    const { api, requested } = fakeApi(PAGES);

    const result = await new OrdersService(api).sincronizarPedidos();

    expect(requested).toEqual([1, 3, 7]);
    expect(result.processed).toBe(3);
  });

  it('si una página falla, propaga el error y ya no pide las siguientes', async () => {
    const { api, requested } = fakeApi(PAGES, 3);

    await expect(
      new OrdersService(api).sincronizarPedidos(),
    ).rejects.toBeInstanceOf(OrdersApiError);
    expect(requested).toEqual([1, 3]);
  });

  it('se detiene si la API regresa una página que ya recorrió', async () => {
    const { api } = fakeApi({ 1: { data: [], next_page: 1 } });

    await expect(new OrdersService(api).sincronizarPedidos()).rejects.toThrow(
      'Page 1 already visited',
    );
  });

  it('cuenta como fallido un pedido inválido sin detener la sincronización', async () => {
    const invalid = { ...order('O-2'), amount: null as unknown as number };
    const { api } = fakeApi({
      1: { data: [order('O-1'), invalid], next_page: 2 },
      2: { data: [order('O-3')], next_page: null },
    });

    const result = await new OrdersService(api).sincronizarPedidos();

    expect(result).toEqual({ processed: 2, omitted: 0, failed: 1 });
  });
});
