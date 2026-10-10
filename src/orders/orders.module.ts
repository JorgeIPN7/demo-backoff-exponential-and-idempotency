import { Module } from '@nestjs/common';
import { OrdersApiClient } from './orders-api.client.js';
import { OrdersService } from './orders.service.js';
import { OrdersController } from './orders.controller.js';
import { OrdersStore } from './orders.store.js';

@Module({
  providers: [
    OrdersService,
    OrdersStore,
    {
      // OrdersApiClient necesita la URL, así que lo construimos nosotros
      provide: OrdersApiClient,
      useFactory: () =>
        new OrdersApiClient(
          process.env.ORDERS_API_URL ??
            `http://localhost:${process.env.PORT ?? 3000}/external-api`,
        ),
    },
  ],
  controllers: [OrdersController],
})
export class OrdersModule {}
