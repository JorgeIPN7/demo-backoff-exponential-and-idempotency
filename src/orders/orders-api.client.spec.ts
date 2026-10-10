import { Logger } from '@nestjs/common';
import {
  type FetchFn,
  OrdersApiClient,
  OrdersApiError,
  type RetryOptions,
} from './orders-api.client.js';

const page = {
  data: [
    { order_id: 'O-001', customer_name: 'Ana', amount: 10.5, source: 'web' },
  ],
  next_page: 2,
};

// Respuesta falsa: el 200 trae la página; cualquier otro status, un body de error
function reply(status: number, headers: Record<string, string> = {}) {
  const body = status === 200 ? page : { error: status };
  return new Response(JSON.stringify(body), { status, headers });
}

// fetch falso: regresa las respuestas en orden y guarda las URLs que le pidieron
function fakeFetch(responses: Array<Response | Error>) {
  const urls: string[] = [];
  const fn: FetchFn = async (url) => {
    urls.push(url);
    const next = responses.shift();
    if (!next) throw new Error('No more fake responses');
    if (next instanceof Error) throw next;
    return next;
  };
  return { fn, urls };
}

const RETRY: RetryOptions = {
  maxAttempts: 5,
  baseDelayMs: 100,
  maxDelayMs: 10_000,
};

function createClient(responses: Array<Response | Error>) {
  const fetch = fakeFetch(responses);
  const delays: number[] = [];
  const client = new OrdersApiClient(
    'http://orders-api.test',
    fetch.fn,
    RETRY,
    async (ms) => {
      delays.push(ms); // no espera de verdad, solo registra cuánto habría esperado
    },
  );
  return { client, urls: fetch.urls, delays };
}

describe('OrdersApiClient.getPage', () => {
  beforeAll(() => Logger.overrideLogger(false));

  it('pide la página correcta y regresa data y next_page', async () => {
    const { client, urls } = createClient([reply(200)]);

    await expect(client.getPage(1)).resolves.toEqual(page);
    expect(urls).toEqual(['http://orders-api.test/orders?page=1']);
  });

  it('reintenta ante 503, 429 y errores de red hasta que responde', async () => {
    const { client, urls, delays } = createClient([
      reply(503),
      reply(429),
      new Error('ECONNRESET'),
      reply(200),
    ]);

    await expect(client.getPage(1)).resolves.toEqual(page);
    expect(urls).toHaveLength(4);
    expect(delays).toHaveLength(3);
  });

  it('respeta el header Retry-After', async () => {
    const { client, delays } = createClient([
      reply(429, { 'Retry-After': '2' }),
      reply(200),
    ]);

    await client.getPage(1);
    expect(delays).toEqual([2000]);
  });

  it('usa backoff exponencial con jitter y se rinde a los 5 intentos', async () => {
    const { client, urls, delays } = createClient([
      reply(500),
      reply(500),
      reply(500),
      reply(500),
      reply(500),
    ]);

    await expect(client.getPage(1)).rejects.toMatchObject({
      status: 500,
      page: 1,
    });
    expect(urls).toHaveLength(5);

    // Con base de 100 ms, cada espera queda entre la mitad y el total de 100, 200, 400 y 800
    const limits = [100, 200, 400, 800];
    expect(delays).toHaveLength(4);
    delays.forEach((delay, i) => {
      expect(delay).toBeGreaterThanOrEqual(limits[i] / 2);
      expect(delay).toBeLessThanOrEqual(limits[i]);
    });
  });

  it('falla de inmediato ante un 4xx que no es 429', async () => {
    const { client, urls } = createClient([reply(404)]);

    const error = await client.getPage(9).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(OrdersApiError);
    expect(error).toMatchObject({ status: 404, page: 9 });
    expect(urls).toHaveLength(1);
  });
});
