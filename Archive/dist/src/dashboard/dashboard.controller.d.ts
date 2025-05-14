import { DashboardService } from './dashboard.service';
export declare class DashboardController {
    private readonly dashboardService;
    constructor(dashboardService: DashboardService);
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
    toggleKeywordActive(id: string): Promise<void>;
    getWidgets(): Promise<{
        id: string;
        data: import("@prisma/client/runtime/library").JsonValue;
        type: string;
        title: string | null;
        description: string | null;
        sortOrder: number;
        dashboardId: string;
    }[]>;
    updateWidgetSortOrder(id: string, sortOrder: number): Promise<{
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
