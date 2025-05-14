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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const dashboard_service_1 = require("./dashboard.service");
let DashboardController = class DashboardController {
    constructor(dashboardService) {
        this.dashboardService = dashboardService;
    }
    async findAllKeywords() {
        return this.dashboardService.findAllKeywords();
    }
    async findKeywordsByCampaignId(id) {
        return this.dashboardService.findKeywordsByCampaignId(id);
    }
    async toggleKeywordActive(id) {
        const keyword = this.dashboardService.findKeywordById(id);
        keyword.then((kw) => {
            const active = kw?.active ?? true;
            return this.dashboardService.toggleKeywordActiveById(id, !active);
        }).catch(() => {
            const related = this.dashboardService.findRelatedKeywordById(id);
            related.then((kw) => {
                console.log(related);
                const active = kw?.active ?? true;
                return this.dashboardService.toggleRelatedKeywordActiveById(id, !active);
            }).catch(() => {
                return 200;
            });
        });
    }
    async getWidgets() {
        return this.dashboardService.getWidgets();
    }
    async updateWidgetSortOrder(id, sortOrder) {
        return this.dashboardService.updateWidgetSortOrder(id, sortOrder);
    }
    async getDashboardById(id) {
        return this.dashboardService.getDashboardById(id);
    }
};
exports.DashboardController = DashboardController;
__decorate([
    (0, common_1.Get)('keywords'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all keywords' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'The list of keywords',
        schema: {
            type: 'array',
            items: {
                properties: {
                    id: { type: 'string' },
                    keyWord: { type: 'string' },
                    active: { type: 'boolean' },
                },
            },
        },
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "findAllKeywords", null);
__decorate([
    (0, common_1.Get)('keywords-by-compaign-id/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get keywords by campagn ID' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'The list of keywords',
        schema: {
            type: 'array',
            items: {
                properties: {
                    id: { type: 'string' },
                    keyWord: { type: 'string' },
                    related: { type: 'array' },
                    active: { type: 'boolean' },
                },
            },
        },
    }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "findKeywordsByCampaignId", null);
__decorate([
    (0, common_1.Patch)('keywords/toggle/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Toggle keyword active status' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
    }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "toggleKeywordActive", null);
__decorate([
    (0, common_1.Get)('widgets'),
    (0, swagger_1.ApiOperation)({ summary: 'Get the full list of widgets' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'The list of widgets',
        schema: {
            type: 'array',
            items: {
                properties: {
                    id: { type: 'string' },
                    title: { type: 'string', nullable: true },
                    description: { type: 'string', nullable: true },
                    type: { type: 'string' },
                    sortOrder: { type: 'number' },
                    data: { type: 'object' },
                },
            },
        },
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getWidgets", null);
__decorate([
    (0, common_1.Patch)('widgets/:id/sort-order'),
    (0, swagger_1.ApiOperation)({ summary: 'Update the sortOrder of a specific widget' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'The updated widget',
        schema: {
            properties: {
                id: { type: 'string' },
                title: { type: 'string', nullable: true },
                description: { type: 'string', nullable: true },
                type: { type: 'string' },
                sortOrder: { type: 'number' },
                data: { type: 'object' },
            },
        },
    }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('sortOrder')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "updateWidgetSortOrder", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a single dashboard by ID' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'The requested dashboard, including its widgets',
        schema: {
            properties: {
                id: { type: 'string' },
                widgets: {
                    type: 'array',
                    items: {
                        properties: {
                            id: { type: 'string' },
                            title: { type: 'string', nullable: true },
                            description: { type: 'string', nullable: true },
                            type: { type: 'string' },
                            sortOrder: { type: 'number' },
                            data: { type: 'object' },
                        },
                    },
                },
            },
        },
    }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getDashboardById", null);
exports.DashboardController = DashboardController = __decorate([
    (0, swagger_1.ApiTags)('Dashboard'),
    (0, common_1.Controller)('api/dashboard'),
    __metadata("design:paramtypes", [dashboard_service_1.DashboardService])
], DashboardController);
//# sourceMappingURL=dashboard.controller.js.map