import {
  Controller,
  DefaultValuePipe,
  Get,
  HttpException,
  HttpStatus,
  NotFoundException,
  ParseIntPipe,
  Query,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ORDERS_DATA } from './fake-dara.js';

@Controller('orders-api')
export class OrdersApiController {
  private readonly requestCountPage = new Map<number, number>();

  @Get()
  getOrders(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
  ) {
    const requestNumber = (this.requestCountPage.get(page) ?? 0) + 1;
    this.requestCountPage.set(page, requestNumber);

    if (page === 2 && requestNumber === 1) {
      throw new ServiceUnavailableException();
    }
    if (page === 2 && requestNumber === 2) {
      throw new HttpException(
        'Too Many Requests',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const result = ORDERS_DATA[page - 1];
    if (!result) {
      throw new NotFoundException(`Page ${page} does not exist`);
    }
    return result;
  }
}
