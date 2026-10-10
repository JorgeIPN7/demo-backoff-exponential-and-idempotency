import { Injectable } from '@nestjs/common';
import { OrdersApiClient } from './orders-api.client.js';
import { SyncResult } from './data/order.types.js';

@Injectable()
export class OrdersService {
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

      result.processed += data.length;

      page = next_page;
    }

    return result;
  }
}
