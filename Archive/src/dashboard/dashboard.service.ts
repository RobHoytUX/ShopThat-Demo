// src/dashboard/dashboard.service.ts
import {Injectable, Logger} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
    constructor(private readonly prisma: PrismaService) {}

    async getWidgets() {
        const dashboard = await this.prisma.dashboard.findFirst({
            include: { widgets: true },
        });
        return dashboard?.widgets || [];
    }

    async findAllKeywords() {
        try {
            return await this.prisma.keyWords.findMany({ take: 10 });
        } catch (error) {
            // Use Nest's Logger or a custom logging solution
            Logger.error('Error fetching keywords', error.stack);
            throw error; // re-throw or handle as needed
        }
    }

    async findKeywordsByCampaignId(id: string) {
        try {
            return await this.prisma.keyWords.findMany({
                take: 10,
                include: {
                    related: true,  // This tells Prisma to fetch the related RelatedKeyWords for each KeyWords record
                },
            });
        } catch (error) {
            // Use Nest's Logger or a custom logging solution
            Logger.error('Error fetching keywords', error.stack);
            throw error; // re-throw or handle as needed
        }
    }

    async findKeywordById(id: string) {
        return this.prisma.keyWords.findUnique({
            where: {id},
        });
    }

    async toggleKeywordActiveById(id: string, active: boolean) {
        return this.prisma.keyWords.update({
            where: { id: id },
            data: { active },
        })
    }

    async findRelatedKeywordById(id: string) {
        return this.prisma.relatedKeyWords.findUnique({
            where: {id},
        });
    }

    async toggleRelatedKeywordActiveById(id: string, active: boolean) {
        return this.prisma.relatedKeyWords.update({
            where: { id: id },
            data: { active },
        })
    }

    async updateWidgetSortOrder(widgetId: string, sortOrder: number) {
        return this.prisma.widget.update({
            where: { id: widgetId },
            data: { sortOrder },
        });
    }

    async getDashboardById(id: string) {
        return this.prisma.dashboard.findUnique({
            where: { id },
            include: { widgets: true },
        });
    }
}
