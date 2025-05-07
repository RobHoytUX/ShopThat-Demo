// src/products/products.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductsService {
    constructor(private readonly prisma: PrismaService) {}

    // Return top 10 products by usagesCount
    async getTopProducts() {
        return this.prisma.products.findMany({
            orderBy: { usagesCount: 'desc' },
            take: 10,
        });
    }

    async findAll() {
        return this.prisma.products.findMany();
    }
}
