import {
  BadGatewayException,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Get,
} from '@nestjs/common';
import type { Order, SyncResult } from './data/order.types.js';
import { OrdersApiError } from './orders-api.client.js';
import { OrdersService } from './orders.service.js';
import { OrdersStore } from './orders.store.js';

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly store: OrdersStore,
  ) {}

  @Post('sincronizar')
  @HttpCode(HttpStatus.OK)
  async sincronizar(): Promise<SyncResult> {
    try {
      return await this.ordersService.sincronizarPedidos();
    } catch (error) {
      if (error instanceof OrdersApiError) {
        throw new BadGatewayException(error.message);
      }
      throw error;
    }
  }

  @Get()
  findAll(): Order[] {
    return this.store.findAll();
  }
}
