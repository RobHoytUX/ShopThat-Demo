import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { PrismaService } from '../prisma/prisma.service';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import { Express } from 'express';

@Injectable()
export class DocumentsService {
  private readonly uploadDir = path.join(
    __dirname,
    '..',
    '..',
    'uploads',
    'documents',
  );

  constructor(private prisma: PrismaService) {}

  private fileFilter(file: Express.Multer.File): boolean {
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

  async create(file: Express.Multer.File): Promise<CreateDocumentDto> {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    if (!this.fileFilter(file)) {
      throw new BadRequestException(
        'Invalid file type. Only .txt, .docx, .xlsx, .pptx, .pdf files are allowed',
      );
    }

    const fileName = `${uuidv4()}`;
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

  async findOne(id: number) {
    return this.prisma.documents.findUnique({
      where: { id },
    });
  }

  async getDocumentFile(
    fileName: string,
  ): Promise<{ fileBuffer: Buffer; contentType: string }> {
    const fullPath = path.join(this.uploadDir, fileName);

    if (!fs.existsSync(fullPath)) {
      throw new BadRequestException('Document not found');
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
        throw new BadRequestException('Unsupported file type');
    }

    const fileBuffer = fs.readFileSync(fullPath);

    return { fileBuffer, contentType };
  }

  async update(id: number, updateDocumentDto: UpdateDocumentDto) {
    return this.prisma.documents.update({
      where: { id },
      data: updateDocumentDto,
    });
  }

  async remove(id: number) {
    return this.prisma.documents.delete({
      where: { id },
    });
  }
}
