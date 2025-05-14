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
exports.DocumentsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const path = require("path");
const uuid_1 = require("uuid");
const fs = require("fs");
let DocumentsService = class DocumentsService {
    constructor(prisma) {
        this.prisma = prisma;
        this.uploadDir = path.join(__dirname, '..', '..', 'uploads', 'documents');
    }
    fileFilter(file) {
        const allowedMimeTypes = [
            'text/plain',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'application/pdf',
        ];
        if (!allowedMimeTypes.includes(file.mimetype)) {
            return false;
        }
        return true;
    }
    async create(file) {
        if (!file) {
            throw new common_1.BadRequestException('File is required');
        }
        if (!this.fileFilter(file)) {
            throw new common_1.BadRequestException('Invalid file type. Only .txt, .docx, .xlsx, .pptx, .pdf files are allowed');
        }
        const fileName = `${(0, uuid_1.v4)()}`;
        const filePath = path.join(this.uploadDir, fileName);
        if (!fs.existsSync(this.uploadDir)) {
            fs.mkdirSync(this.uploadDir, { recursive: true });
        }
        fs.writeFileSync(filePath, file.buffer);
        const createdDocument = await this.prisma.documents.create({
            data: {
                url: `/uploads/documents/${fileName}`,
                isActive: true,
                external: false,
            },
        });
        return createdDocument;
    }
    async findAll() {
        return this.prisma.documents.findMany();
    }
    async findOne(id) {
        return this.prisma.documents.findUnique({
            where: { id },
        });
    }
    async getDocumentFile(fileName) {
        const fullPath = path.join(this.uploadDir, fileName);
        if (!fs.existsSync(fullPath)) {
            throw new common_1.BadRequestException('Document not found');
        }
        const fileExtension = path.extname(fileName).toLowerCase();
        let contentType = 'application/octet-stream';
        switch (fileExtension) {
            case '.txt':
                contentType = 'text/plain';
                break;
            case '.doc':
            case '.docx':
                contentType =
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
                break;
            case '.xls':
            case '.xlsx':
                contentType =
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
                break;
            case '.ppt':
            case '.pptx':
                contentType =
                    'application/vnd.openxmlformats-officedocument.presentationml.presentation';
                break;
            case '.pdf':
                contentType = 'application/pdf';
                break;
            default:
                throw new common_1.BadRequestException('Unsupported file type');
        }
        const fileBuffer = fs.readFileSync(fullPath);
        return { fileBuffer, contentType };
    }
    async update(id, updateDocumentDto) {
        return this.prisma.documents.update({
            where: { id },
            data: updateDocumentDto,
        });
    }
    async remove(id) {
        return this.prisma.documents.delete({
            where: { id },
        });
    }
};
exports.DocumentsService = DocumentsService;
exports.DocumentsService = DocumentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DocumentsService);
//# sourceMappingURL=documents.service.js.map