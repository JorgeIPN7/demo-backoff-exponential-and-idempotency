import { Module } from '@nestjs/common';
import { OrdersApiClient } from './orders-api.client.js';
import { OrdersService } from './orders.service.js';

@Module({
  providers: [
    OrdersService,
    {
      // OrdersApiClient necesita la URL, así que lo construimos nosotros
      provide: OrdersApiClient,
      useFactory: () =>
        new OrdersApiClient(
          process.env.ORDERS_API_URL ??
            `http://localhost:${process.env.PORT ?? 3000}`,
        ),
    },
  ],
})
export class OrdersModule {}
