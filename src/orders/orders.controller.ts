import {
  BadGatewayException,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import type { SyncResult } from './data/order.types.js';
import { OrdersApiError } from './orders-api.client.js';
import { OrdersService } from './orders.service.js';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

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
}
