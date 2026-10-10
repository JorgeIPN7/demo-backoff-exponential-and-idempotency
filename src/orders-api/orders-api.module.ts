import { Module } from '@nestjs/common';
import { OrdersApiController } from './orders-api.controller.js';

@Module({
  controllers: [OrdersApiController]
})
export class OrdersApiModule {}
