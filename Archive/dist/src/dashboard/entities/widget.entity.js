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
exports.Widget = void 0;
const swagger_1 = require("@nestjs/swagger");
class Widget {
}
exports.Widget = Widget;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Widget title', example: 'Weather Widget', nullable: true }),
    __metadata("design:type", String)
], Widget.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Widget description', example: 'Shows the current weather', nullable: true }),
    __metadata("design:type", String)
], Widget.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Type of the widget', example: 'weather' }),
    __metadata("design:type", String)
], Widget.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Sort order of the widget', example: 1 }),
    __metadata("design:type", Number)
], Widget.prototype, "sortOrder", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Data associated with the widget',
        example: { location: 'New York', temperature: 22 },
    }),
    __metadata("design:type", Object)
], Widget.prototype, "data", void 0);
//# sourceMappingURL=widget.entity.js.map