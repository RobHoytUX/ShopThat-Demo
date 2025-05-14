import { Response } from 'express';
import { MediaService } from './media.service';
import { UpdateMediaDto } from './dto/update-media.dto';
import { CreateMediaDto } from './dto/create-media.dto';
export declare class MediaController {
    private readonly mediaService;
    constructor(mediaService: MediaService);
    uploadFile(file: Express.Multer.File): Promise<CreateMediaDto>;
    findAll(): Promise<{
        id: number;
        url: string;
        isActive: boolean;
        external: boolean;
        originalName: string;
        uploadedAt: Date;
    }[]>;
    getFile(url: string, res: Response): Promise<void>;
    findOne(id: string): Promise<{
        id: number;
        url: string;
        isActive: boolean;
        external: boolean;
        originalName: string;
        uploadedAt: Date;
    }>;
    update(id: string, updateMediaDto: UpdateMediaDto): Promise<{
        id: number;
        url: string;
        isActive: boolean;
        external: boolean;
        originalName: string;
        uploadedAt: Date;
    }>;
    remove(id: string): Promise<{
        id: number;
        url: string;
        isActive: boolean;
        external: boolean;
        originalName: string;
        uploadedAt: Date;
    }>;
}
