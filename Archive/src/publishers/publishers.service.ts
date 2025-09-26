// src/publishers/publishers.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PublishersService {
    constructor(private readonly prisma: PrismaService) {}

    async getTopUsedEntities() {
        const [topArticles, topKeywords, topPublishers] = await Promise.all([
            this.prisma.article.findMany({
                orderBy: { usagesCount: 'desc' },
                take: 10,
            }),
            this.prisma.keyword.findMany({
                orderBy: { usagesCount: 'desc' },
                take: 10,
            }),
            this.prisma.publisher.findMany({
                orderBy: { usagesCount: 'desc' },
                take: 10,
            }),
        ]);

        return { topArticles, topKeywords, topPublishers };
    }

    async getAll() {
        const [topArticles, topKeywords, topPublishers] = await Promise.all([
            this.prisma.article.findMany({
                orderBy: { usagesCount: 'desc' },
                take: 10,
            }),
            this.prisma.keyword.findMany({
                orderBy: { usagesCount: 'desc' },
                take: 10,
            }),
            this.prisma.publisher.findMany({
                orderBy: { usagesCount: 'desc' },
                take: 10,
            }),
        ]);

        return { topArticles, topKeywords, topPublishers };
    }
}
