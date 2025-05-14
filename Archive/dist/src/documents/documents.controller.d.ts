import { DocumentsService } from './documents.service';
import { Response } from 'express';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
export declare class DocumentsController {
    private readonly documentsService;
    constructor(documentsService: DocumentsService);
    uploadDocument(file: Express.Multer.File): Promise<CreateDocumentDto>;
    findAll(): Promise<{
        id: number;
        url: string;
        isActive: boolean;
        external: boolean;
        createdAt: Date;
    }[]>;
    getDocument(fileName: string, res: Response): Promise<void>;
    findOne(id: string): Promise<{
        id: number;
        url: string;
        isActive: boolean;
        external: boolean;
        createdAt: Date;
    }>;
    update(id: string, updateDocumentDto: UpdateDocumentDto): Promise<{
        id: number;
        url: string;
        isActive: boolean;
        external: boolean;
        createdAt: Date;
    }>;
    remove(id: string): Promise<{
        id: number;
        url: string;
        isActive: boolean;
        external: boolean;
        createdAt: Date;
    }>;
}
