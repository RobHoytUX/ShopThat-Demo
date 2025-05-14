import { PrismaService } from '../prisma/prisma.service';
import { CreateComapaingDto } from './dto/create-comapaings.dto';
import { UpdateComapaingDto } from './dto/update-comapaings.dto';
export declare class ComapaingsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(createComapaingsDto: CreateComapaingDto): Promise<{
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
    update(id: string, dto: UpdateComapaingDto): Promise<{
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
    findItemsByCampaign(id: string): Promise<({
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
    toggleActive(itemId: string, isActive: boolean): Promise<{
        id: string;
        type: string[];
        title: string;
        active: boolean;
        image: string | null;
    }>;
}
