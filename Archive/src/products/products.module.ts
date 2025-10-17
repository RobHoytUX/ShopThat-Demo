// src/products/products.module.ts
import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';

@Module({
    imports: [],
    controllers: [ProductsController],
    providers: [ProductsService, PrismaService],
})
export class ProductsModule {}
