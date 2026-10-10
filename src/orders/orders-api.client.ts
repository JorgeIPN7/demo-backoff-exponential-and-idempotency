import type { OrderPage } from './data/order.types.js';

export type FetchFn = (url: string) => Promise<Response>;

export class OrdersApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly page: number,
  ) {
    super(message);
    this.name = 'OrdersApiError';
  }
}

export class OrdersApiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly fetchFn: FetchFn = (url) => fetch(url),
  ) {}

  async getPage(page: number): Promise<OrderPage> {
    const response = await this.fetchFn(`${this.baseUrl}/orders?page=${page}`);

    if (!response.ok) {
      throw new OrdersApiError(
        `GET /orders?page=${page} returned ${response.status}`,
        response.status,
        page,
      );
    }

    return (await response.json()) as OrderPage;
  }
}
