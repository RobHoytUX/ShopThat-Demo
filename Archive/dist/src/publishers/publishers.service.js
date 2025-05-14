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
exports.PublishersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let PublishersService = class PublishersService {
    constructor(prisma) {
        this.prisma = prisma;
    }
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
};
exports.PublishersService = PublishersService;
exports.PublishersService = PublishersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PublishersService);
//# sourceMappingURL=publishers.service.js.map