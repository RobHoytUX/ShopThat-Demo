import { CategoriesService } from './categories.service';
export declare class CategoriesController {
    private readonly categoriesService;
    constructor(categoriesService: CategoriesService);
    getAllCategories(): Promise<({
        children: ({
            children: {
                id: string;
                title: string;
                description: string;
                image: string | null;
                parentCategoryId: string | null;
            }[];
        } & {
            id: string;
            title: string;
            description: string;
            image: string | null;
            parentCategoryId: string | null;
        })[];
    } & {
        id: string;
        title: string;
        description: string;
        image: string | null;
        parentCategoryId: string | null;
    })[]>;
    getCategory(id: string): Promise<{
        comapaings: {
            id: string;
            title: string;
            dashboardId: string | null;
            imageUrl: string | null;
            content: string;
            images: string[];
            events: string[];
            people: string[];
            products: string[];
            subTitle: string | null;
            categoriesId: string | null;
            publisherDashboardId: string | null;
        }[];
        products: {
            id: string;
            title: string;
            image: string | null;
            usagesCount: number;
            shortDescription: string | null;
            launchDate: Date;
            endDate: Date;
            salesAmount: string | null;
        }[];
        children: ({
            products: {
                id: string;
                title: string;
                image: string | null;
                usagesCount: number;
                shortDescription: string | null;
                launchDate: Date;
                endDate: Date;
                salesAmount: string | null;
            }[];
        } & {
            id: string;
            title: string;
            description: string;
            image: string | null;
            parentCategoryId: string | null;
        })[];
    } & {
        id: string;
        title: string;
        description: string;
        image: string | null;
        parentCategoryId: string | null;
    }>;
}
