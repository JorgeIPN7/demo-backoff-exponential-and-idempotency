// Logger por velocidad pero no lo usaría en producción y usar;ia Pino o Winston
import { Logger } from '@nestjs/common';
import type { OrderPage } from './data/order.types.js';

export type FetchFn = (url: string) => Promise<Response>;
export type WaitFn = (ms: number) => Promise<void>;

export interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 5,
  baseDelayMs: 500,
  maxDelayMs: 8_000,
};

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

const defaultWait: WaitFn = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export class OrdersApiClient {
  private readonly logger = new Logger(OrdersApiClient.name);

  constructor(
    private readonly baseUrl: string,
    private readonly fetchFn: FetchFn = (url) => fetch(url),
    private readonly retry: RetryOptions = DEFAULT_RETRY_OPTIONS,
    private readonly wait: WaitFn = defaultWait,
  ) {}

  async getPage(page: number): Promise<OrderPage> {
    const url = `${this.baseUrl}/orders?page=${page}`;
    const { maxAttempts } = this.retry;

    for (let attempt = 1; ; attempt++) {
      // Un error de red (sin respuesta) se trata como un 5xx: es temporal
      const response = await this.fetchFn(url).catch(() => null);
      const status = response?.status ?? 0;

      if (response?.ok) {
        return (await response.json()) as OrderPage;
      }

      const isRetryable = status === 0 || status === 429 || status >= 500;
      if (!isRetryable) {
        throw new OrdersApiError(
          `GET ${url} returned ${status} and not retrying`,
          status,
          page,
        );
      }

      if (attempt === maxAttempts) {
        throw new OrdersApiError(
          `GET ${url} failed ${maxAttempts} times (last status: ${status || 'no response'})`,
          status,
          page,
        );
      }

      const delay = this.computeDelay(
        attempt,
        response?.headers.get('retry-after'),
      );
      this.logger.warn(
        `GET ${url} returned ${status || 'no response'}; retry ${attempt}/${maxAttempts - 1} in ${Math.round(delay)} ms`,
      );
      await this.wait(delay);
    }
  }

  private computeDelay(attempt: number, retryAfter?: string | null): number {
    // Si la API dice cuánto esperar, se respeta
    const seconds = Number(retryAfter);
    if (retryAfter && Number.isFinite(seconds) && seconds >= 0) {
      return seconds * 1000;
    }

    // Backoff exponencial con tope
    const { baseDelayMs, maxDelayMs } = this.retry;
    const exponential = Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs);

    // Agrego un separador entre la mitad y el total, para que varios procesos no reintenten al mismo tiempo y en producción no se haga un DDoS a la API externa o un 429
    return exponential / 2 + Math.random() * (exponential / 2);
  }
}
