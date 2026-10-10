import { Injectable, Logger } from '@nestjs/common';
import type { OrderOrigen, SyncResult } from './data/order.types.js';
import { mapOrder } from './order.mapper.js';
import { OrdersApiClient } from './orders-api.client.js';
import { OrdersStore } from './orders.store.js';

type OrderOutcome = keyof SyncResult;

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly ordersApi: OrdersApiClient,
    private readonly store: OrdersStore,
  ) {}

  async sincronizarPedidos(): Promise<SyncResult> {
    const result: SyncResult = { processed: 0, omitted: 0, failed: 0 };
    const visitedPages = new Set<number>();
    let page: number | null = 1;

    while (page !== null) {
      if (visitedPages.has(page)) {
        throw new Error(`Page ${page} already visited.`);
      }
      visitedPages.add(page);

      // Si la página falla después de los reintentos, el error sube: sin ella no se conoce next_page.
      // Lo ya guardado no se pierde y, como es idempotente, volver a correr no duplica nada.
      const { data, next_page } = await this.ordersApi.getPage(page);

      for (const origin of data) {
        result[this.processOrder(origin)]++;
      }

      page = next_page;
    }

    this.logger.log(`Sync finished: ${JSON.stringify(result)}`);
    return result;
  }

  private processOrder(origin: OrderOrigen): OrderOutcome {
    try {
      const order = mapOrder(origin);
      // Si el id ya existe, no se guarda de nuevo: cuenta como omitido
      return this.store.saveIfNotExists(order) ? 'processed' : 'omitted';
    } catch (error) {
      this.logger.warn(
        `Order ${origin?.order_id ?? '(no id)'} skipped: ${(error as Error).message}`,
      );
      return 'failed';
    }
  }
}
