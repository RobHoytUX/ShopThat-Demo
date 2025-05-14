import { PrismaService } from '../prisma/prisma.service';
export declare class ProductsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getTopProducts(): Promise<{
        id: string;
        title: string;
        image: string | null;
        usagesCount: number;
        shortDescription: string | null;
        launchDate: Date;
        endDate: Date;
        salesAmount: string | null;
    }[]>;
    findAll(): Promise<{
        id: string;
        title: string;
        image: string | null;
        usagesCount: number;
        shortDescription: string | null;
        launchDate: Date;
        endDate: Date;
        salesAmount: string | null;
    }[]>;
}
