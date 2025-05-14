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
exports.ComapaingsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let ComapaingsService = class ComapaingsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(createComapaingsDto) {
        return this.prisma.comapaings.create({
            data: createComapaingsDto,
        });
    }
    async findAll() {
        return this.prisma.comapaings.findMany({
            include: {
                items: true,
            },
        });
    }
    async findOne(id) {
        return this.prisma.comapaings.findUnique({
            where: { id },
            include: {
                items: {
                    include: {
                        documents: true,
                    },
                },
            },
        });
    }
    async update(id, dto) {
        return this.prisma.comapaings.update({
            where: { id },
            data: dto,
        });
    }
    async remove(id) {
        return this.prisma.comapaings.delete({ where: { id } });
    }
    async findItemsByCampaign(id) {
        return this.prisma.comapaingItems.findMany({
            where: {
                campaings: {
                    some: { id },
                },
            },
            include: {
                campaings: true,
                documents: true,
            },
        });
    }
    async toggleActive(itemId, isActive) {
        return this.prisma.comapaingItems.update({
            where: { id: itemId },
            data: { active: isActive },
        });
    }
};
exports.ComapaingsService = ComapaingsService;
exports.ComapaingsService = ComapaingsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ComapaingsService);
//# sourceMappingURL=comapaings.service.js.map