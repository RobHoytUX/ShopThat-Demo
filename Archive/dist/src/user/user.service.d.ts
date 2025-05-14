import { PrismaService } from '../prisma/prisma.service';
export declare class UserService {
    private prisma;
    constructor(prisma: PrismaService);
    findByUsername(username: string): Promise<{
        id: number;
        username: string;
        password: string;
    }>;
    createUser(username: string, password: string): Promise<{
        id: number;
        username: string;
        password: string;
    }>;
}
