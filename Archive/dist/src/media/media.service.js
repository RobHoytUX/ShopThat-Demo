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
exports.MediaService = void 0;
const common_1 = require("@nestjs/common");
const fs = require("fs");
const path = require("path");
const uuid_1 = require("uuid");
const prisma_service_1 = require("../prisma/prisma.service");
let MediaService = class MediaService {
    constructor(prisma) {
        this.prisma = prisma;
        this.uploadDir = path.join(__dirname, '..', '..', 'uploads');
        if (!fs.existsSync(this.uploadDir)) {
            fs.mkdirSync(this.uploadDir, { recursive: true });
        }
    }
    async create(file) {
        if (!file) {
            throw new common_1.BadRequestException('File is required');
        }
        const fileName = `${(0, uuid_1.v4)()}`;
        const filePath = path.join(this.uploadDir, fileName);
        fs.writeFileSync(filePath, file.buffer);
        const createdMedia = await this.prisma.media.create({
            data: {
                originalName: file.originalname,
                url: `/uploads/${fileName}`,
                isActive: true,
                external: false,
            },
        });
        return createdMedia;
    }
    async findAll() {
        return this.prisma.media.findMany();
    }
    async findOne(id) {
        const media = await this.prisma.media.findUnique({ where: { id } });
        if (!media)
            throw new common_1.NotFoundException(`Media with ID ${id} not found`);
        return media;
    }
    async getMediaFile(filePath) {
        const fullPath = path.join(this.uploadDir, filePath);
        if (!fs.existsSync(fullPath)) {
            throw new common_1.NotFoundException('File not found');
        }
        return fs.readFileSync(fullPath);
    }
    async update(id, updateMediaDto) {
        return this.prisma.media.update({
            where: { id },
            data: updateMediaDto,
        });
    }
    async remove(id) {
        const media = await this.findOne(id);
        if (!media)
            throw new common_1.NotFoundException(`Media with ID ${id} not found`);
        const fullPath = path.join(this.uploadDir, media.url.replace('/uploads/', ''));
        if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
        }
        return this.prisma.media.delete({ where: { id } });
    }
};
exports.MediaService = MediaService;
exports.MediaService = MediaService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], MediaService);
//# sourceMappingURL=media.service.js.map