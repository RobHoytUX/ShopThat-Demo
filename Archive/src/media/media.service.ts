import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Express } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMediaDto } from './dto/create-media.dto';
import { UpdateMediaDto } from './dto/update-media.dto';

@Injectable()
export class MediaService {
  private readonly uploadDir = path.join(__dirname, '..', '..', 'uploads');

  constructor(private prisma: PrismaService) {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async create(file: Express.Multer.File): Promise<CreateMediaDto> {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const fileName = `${uuidv4()}`;
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

  async findOne(id: number) {
    const media = await this.prisma.media.findUnique({ where: { id } });
    if (!media) throw new NotFoundException(`Media with ID ${id} not found`);
    return media;
  }

  async getMediaFile(filePath: string): Promise<Buffer> {
    const fullPath = path.join(this.uploadDir, filePath);

    if (!fs.existsSync(fullPath)) {
      throw new NotFoundException('File not found');
    }

    return fs.readFileSync(fullPath);
  }

  async update(id: number, updateMediaDto: UpdateMediaDto) {
    return this.prisma.media.update({
      where: { id },
      data: updateMediaDto,
    });
  }

  async remove(id: number) {
    const media = await this.findOne(id);
    if (!media) throw new NotFoundException(`Media with ID ${id} not found`);

    const fullPath = path.join(
      this.uploadDir,
      media.url.replace('/uploads/', ''),
    );
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }

    return this.prisma.media.delete({ where: { id } });
  }
}
