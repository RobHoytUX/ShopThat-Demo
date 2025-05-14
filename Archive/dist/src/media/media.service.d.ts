import { PrismaService } from '../prisma/prisma.service';
import { CreateMediaDto } from './dto/create-media.dto';
import { UpdateMediaDto } from './dto/update-media.dto';
export declare class MediaService {
    private prisma;
    private readonly uploadDir;
    constructor(prisma: PrismaService);
    create(file: Express.Multer.File): Promise<CreateMediaDto>;
    findAll(): Promise<{
        id: number;
        url: string;
        isActive: boolean;
        external: boolean;
        originalName: string;
        uploadedAt: Date;
    }[]>;
    findOne(id: number): Promise<{
        id: number;
        url: string;
        isActive: boolean;
        external: boolean;
        originalName: string;
        uploadedAt: Date;
    }>;
    getMediaFile(filePath: string): Promise<Buffer>;
    update(id: number, updateMediaDto: UpdateMediaDto): Promise<{
        id: number;
        url: string;
        isActive: boolean;
        external: boolean;
        originalName: string;
        uploadedAt: Date;
    }>;
    remove(id: number): Promise<{
        id: number;
        url: string;
        isActive: boolean;
        external: boolean;
        originalName: string;
        uploadedAt: Date;
    }>;
}
