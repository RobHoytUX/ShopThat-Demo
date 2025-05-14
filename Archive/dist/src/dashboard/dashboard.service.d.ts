import { PrismaService } from '../prisma/prisma.service';
export declare class DashboardService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getWidgets(): Promise<{
        id: string;
        data: import("@prisma/client/runtime/library").JsonValue;
        type: string;
        title: string | null;
        description: string | null;
        sortOrder: number;
        dashboardId: string;
    }[]>;
    findAllKeywords(): Promise<{
        id: string;
        createdAt: Date;
        active: boolean;
        keyWord: string;
    }[]>;
    findKeywordsByCampaignId(id: string): Promise<({
        related: {
            id: string;
            createdAt: Date;
            active: boolean;
            keyWord: string;
            keyWordsId: string | null;
        }[];
    } & {
        id: string;
        createdAt: Date;
        active: boolean;
        keyWord: string;
    })[]>;
    findKeywordById(id: string): Promise<{
        id: string;
        createdAt: Date;
        active: boolean;
        keyWord: string;
    }>;
    toggleKeywordActiveById(id: string, active: boolean): Promise<{
        id: string;
        createdAt: Date;
        active: boolean;
        keyWord: string;
    }>;
    findRelatedKeywordById(id: string): Promise<{
        id: string;
        createdAt: Date;
        active: boolean;
        keyWord: string;
        keyWordsId: string | null;
    }>;
    toggleRelatedKeywordActiveById(id: string, active: boolean): Promise<{
        id: string;
        createdAt: Date;
        active: boolean;
        keyWord: string;
        keyWordsId: string | null;
    }>;
    updateWidgetSortOrder(widgetId: string, sortOrder: number): Promise<{
        id: string;
        data: import("@prisma/client/runtime/library").JsonValue;
        type: string;
        title: string | null;
        description: string | null;
        sortOrder: number;
        dashboardId: string;
    }>;
    getDashboardById(id: string): Promise<{
        widgets: {
            id: string;
            data: import("@prisma/client/runtime/library").JsonValue;
            type: string;
            title: string | null;
            description: string | null;
            sortOrder: number;
            dashboardId: string;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        type: string | null;
    }>;
}
