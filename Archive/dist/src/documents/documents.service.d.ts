import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { PrismaService } from '../prisma/prisma.service';
export declare class DocumentsService {
    private prisma;
    private readonly uploadDir;
    constructor(prisma: PrismaService);
    private fileFilter;
    create(file: Express.Multer.File): Promise<CreateDocumentDto>;
    findAll(): Promise<{
        id: number;
        url: string;
        isActive: boolean;
        external: boolean;
        createdAt: Date;
    }[]>;
    findOne(id: number): Promise<{
        id: number;
        url: string;
        isActive: boolean;
        external: boolean;
        createdAt: Date;
    }>;
    getDocumentFile(fileName: string): Promise<{
        fileBuffer: Buffer;
        contentType: string;
    }>;
    update(id: number, updateDocumentDto: UpdateDocumentDto): Promise<{
        id: number;
        url: string;
        isActive: boolean;
        external: boolean;
        createdAt: Date;
    }>;
    remove(id: number): Promise<{
        id: number;
        url: string;
        isActive: boolean;
        external: boolean;
        createdAt: Date;
    }>;
}
