import { Injectable, Logger } from '@nestjs/common';
import type { OrderOrigen, SyncResult } from './data/order.types.js';
import { mapOrder } from './order.mapper.js';
import { OrdersApiClient } from './orders-api.client.js';

type OrderOutcome = keyof SyncResult;

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(private readonly ordersApi: OrdersApiClient) {}

  async sincronizarPedidos(): Promise<SyncResult> {
    const result: SyncResult = { processed: 0, omitted: 0, failed: 0 };
    const visitedPages = new Set<number>();
    let page: number | null = 1;

    while (page !== null) {
      if (visitedPages.has(page)) {
        throw new Error(`Page ${page} already visited.`);
      }
      visitedPages.add(page);

      const { data, next_page } = await this.ordersApi.getPage(page);

      for (const origin of data) {
        result[this.processOrder(origin)]++;
      }

      page = next_page;
    }

    return result;
  }

  private processOrder(origin: OrderOrigen): OrderOutcome {
    try {
      mapOrder(origin);
      return 'processed';
    } catch (error) {
      this.logger.warn(
        `Order ${origin?.order_id ?? '(no id)'} skipped: ${(error as Error).message}`,
      );
      return 'failed';
    }
  }
}
