import { ProductsService } from './products.service';
export declare class ProductsController {
    private readonly productsService;
    constructor(productsService: ProductsService);
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
