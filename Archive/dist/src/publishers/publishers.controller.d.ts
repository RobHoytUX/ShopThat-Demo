import { PublishersService } from './publishers.service';
export declare class PublishersController {
    private readonly publishersService;
    constructor(publishersService: PublishersService);
    getTopUsedEntities(): Promise<{
        topArticles: {
            id: string;
            createdAt: Date;
            title: string;
            usagesCount: number;
            content: string;
            images: string[];
            events: string[];
            people: string[];
            products: string[];
            author: string;
            publisherId: string | null;
        }[];
        topKeywords: {
            id: string;
            title: string;
            usagesCount: number;
        }[];
        topPublishers: {
            id: string;
            title: string;
            description: string;
            logo: string | null;
            usagesCount: number;
        }[];
    }>;
    getAll(): Promise<{
        topArticles: {
            id: string;
            createdAt: Date;
            title: string;
            usagesCount: number;
            content: string;
            images: string[];
            events: string[];
            people: string[];
            products: string[];
            author: string;
            publisherId: string | null;
        }[];
        topKeywords: {
            id: string;
            title: string;
            usagesCount: number;
        }[];
        topPublishers: {
            id: string;
            title: string;
            description: string;
            logo: string | null;
            usagesCount: number;
        }[];
    }>;
}
