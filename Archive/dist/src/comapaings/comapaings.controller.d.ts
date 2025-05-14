import { ComapaingsService } from './comapaings.service';
import { CreateComapaingDto } from './dto/create-comapaings.dto';
import { UpdateComapaingDto } from './dto/update-comapaings.dto';
export declare class ComapaingsController {
    private readonly comapaingsService;
    constructor(comapaingsService: ComapaingsService);
    create(createComapaingDto: CreateComapaingDto): Promise<{
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
    }>;
    findAll(): Promise<({
        items: {
            id: string;
            type: string[];
            title: string;
            active: boolean;
            image: string | null;
        }[];
    } & {
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
    })[]>;
    findOne(id: string): Promise<{
        items: ({
            documents: {
                id: number;
                url: string;
                isActive: boolean;
                external: boolean;
                createdAt: Date;
            }[];
        } & {
            id: string;
            type: string[];
            title: string;
            active: boolean;
            image: string | null;
        })[];
    } & {
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
    }>;
    findItems(id: string): Promise<({
        documents: {
            id: number;
            url: string;
            isActive: boolean;
            external: boolean;
            createdAt: Date;
        }[];
        campaings: {
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
    } & {
        id: string;
        type: string[];
        title: string;
        active: boolean;
        image: string | null;
    })[]>;
    update(id: string, updateComapaingDto: UpdateComapaingDto): Promise<{
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
    }>;
    toggleItemActive(itemId: string, body: {
        active: boolean;
    }): Promise<{
        id: string;
        type: string[];
        title: string;
        active: boolean;
        image: string | null;
    }>;
    remove(id: string): Promise<{
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
    }>;
}
