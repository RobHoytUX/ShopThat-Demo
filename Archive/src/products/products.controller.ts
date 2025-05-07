// src/products/products.controller.ts
import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ProductsService } from './products.service';

@ApiTags('Products')
@Controller('api')
export class ProductsController {
    constructor(private readonly productsService: ProductsService) {}

    @Get('top-products')
    @ApiOperation({ summary: 'Get top 10 Products by usagesCount' })
    @ApiResponse({
        status: 200,
        description: 'Returns an array of Products ordered by usagesCount (desc)',
    })
    async getTopProducts() {
        return this.productsService.getTopProducts();
    }

    @Get('products')
    @ApiOperation({ summary: 'Get all products' })
    @ApiResponse({
        status: 200,
        description: 'Returns an array of Products',
    })
    async findAll() {
        return this.productsService.findAll();
    }
}


