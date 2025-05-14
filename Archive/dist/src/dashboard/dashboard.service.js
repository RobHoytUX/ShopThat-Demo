"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let DashboardService = class DashboardService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getWidgets() {
        const dashboard = await this.prisma.dashboard.findFirst({
            include: { widgets: true },
        });
        return dashboard?.widgets || [];
    }
    async findAllKeywords() {
        try {
            return await this.prisma.keyWords.findMany({ take: 10 });
        }
        catch (error) {
            common_1.Logger.error('Error fetching keywords', error.stack);
            throw error;
        }
    }
    async findKeywordsByCampaignId(id) {
        try {
            return await this.prisma.keyWords.findMany({
                take: 10,
                include: {
                    related: true,
                },
            });
        }
        catch (error) {
            common_1.Logger.error('Error fetching keywords', error.stack);
            throw error;
        }
    }
    async findKeywordById(id) {
        return this.prisma.keyWords.findUnique({
            where: { id },
        });
    }
    async toggleKeywordActiveById(id, active) {
        return this.prisma.keyWords.update({
            where: { id: id },
            data: { active },
        });
    }
    async findRelatedKeywordById(id) {
        return this.prisma.relatedKeyWords.findUnique({
            where: { id },
        });
    }
    async toggleRelatedKeywordActiveById(id, active) {
        return this.prisma.relatedKeyWords.update({
            where: { id: id },
            data: { active },
        });
    }
    async updateWidgetSortOrder(widgetId, sortOrder) {
        return this.prisma.widget.update({
            where: { id: widgetId },
            data: { sortOrder },
        });
    }
    async getDashboardById(id) {
        return this.prisma.dashboard.findUnique({
            where: { id },
            include: { widgets: true },
        });
    }
};
exports.DashboardService = DashboardService;
exports.DashboardService = DashboardService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DashboardService);
//# sourceMappingURL=dashboard.service.js.map