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
exports.ComapaingsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const comapaings_service_1 = require("./comapaings.service");
const create_comapaings_dto_1 = require("./dto/create-comapaings.dto");
const update_comapaings_dto_1 = require("./dto/update-comapaings.dto");
let ComapaingsController = class ComapaingsController {
    constructor(comapaingsService) {
        this.comapaingsService = comapaingsService;
    }
    create(createComapaingDto) {
        return this.comapaingsService.create(createComapaingDto);
    }
    async findAll() {
        return this.comapaingsService.findAll();
    }
    findOne(id) {
        return this.comapaingsService.findOne(id);
    }
    findItems(id) {
        return this.comapaingsService.findItemsByCampaign(id);
    }
    update(id, updateComapaingDto) {
        return this.comapaingsService.update(id, updateComapaingDto);
    }
    toggleItemActive(itemId, body) {
        return this.comapaingsService.toggleActive(itemId, body.active);
    }
    remove(id) {
        return this.comapaingsService.remove(id);
    }
};
exports.ComapaingsController = ComapaingsController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new Comapaing' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Comapaing created successfully' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_comapaings_dto_1.CreateComapaingDto]),
    __metadata("design:returntype", void 0)
], ComapaingsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get all Comapaings with their ComapaingItems' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Returns an array of Comapaings and their items',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ComapaingsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a Comapaing by ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Returns a single Comapaing' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Comapaing not found' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ComapaingsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)(':id/items'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all ComapaingItems for a given Comapaing' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Returns an array of ComapaingItems',
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Comapaing not found' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ComapaingsController.prototype, "findItems", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update a Comapaing' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Comapaing updated successfully' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Comapaing not found' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_comapaings_dto_1.UpdateComapaingDto]),
    __metadata("design:returntype", void 0)
], ComapaingsController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)('items/:itemId/toggle'),
    (0, swagger_1.ApiOperation)({ summary: 'Toggle active status of a ComapaingItem' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'ComapaingItem active status updated successfully',
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'ComapaingItem not found' }),
    (0, swagger_1.ApiParam)({
        name: 'itemId',
        description: 'ID of the ComapaingItem to update',
    }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                active: {
                    type: 'boolean',
                    description: 'New active status of the CompaingItem (true/false)',
                    example: true,
                },
            },
        },
    }),
    __param(0, (0, common_1.Param)('itemId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ComapaingsController.prototype, "toggleItemActive", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a Comapaing' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Comapaing deleted successfully' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Comapaing not found' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ComapaingsController.prototype, "remove", null);
exports.ComapaingsController = ComapaingsController = __decorate([
    (0, swagger_1.ApiTags)('Comapaings'),
    (0, common_1.Controller)('api/campaings'),
    __metadata("design:paramtypes", [comapaings_service_1.ComapaingsService])
], ComapaingsController);
//# sourceMappingURL=comapaings.controller.js.map