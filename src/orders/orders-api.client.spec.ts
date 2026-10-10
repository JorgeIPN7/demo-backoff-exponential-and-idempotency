import {
  type FetchFn,
  OrdersApiClient,
  OrdersApiError,
} from './orders-api.client.js';

const page = {
  data: [
    { order_id: 'O-001', customer_name: 'Ana', amount: 10.5, source: 'web' },
  ],
  next_page: 2,
};

function fakeFetch(status: number, body: unknown) {
  const urls: string[] = [];
  const fn: FetchFn = async (url) => {
    urls.push(url);
    return new Response(JSON.stringify(body), { status });
  };
  return { fn, urls };
}

describe('OrdersApiClient.getPage', () => {
  it('pide la página correcta y regresa data y next_page', async () => {
    const fetch = fakeFetch(200, page);
    const client = new OrdersApiClient('http://orders-api.test', fetch.fn);

    await expect(client.getPage(1)).resolves.toEqual(page);
    expect(fetch.urls).toEqual(['http://orders-api.test/orders?page=1']);
  });

  it('lanza OrdersApiError con el status y la página si la respuesta falla', async () => {
    const client = new OrdersApiClient(
      'http://orders-api.test',
      fakeFetch(404, {}).fn,
    );

    const error = await client.getPage(9).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(OrdersApiError);
    expect(error).toMatchObject({ status: 404, page: 9 });
  });
});
