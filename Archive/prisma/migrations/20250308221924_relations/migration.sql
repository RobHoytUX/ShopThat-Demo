/*
  Warnings:

  - You are about to drop the column `comapaingId` on the `Dashboard` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Dashboard" DROP CONSTRAINT "Dashboard_comapaingId_fkey";

-- AlterTable
ALTER TABLE "Comapaings" ADD COLUMN     "dashboardId" TEXT;

-- AlterTable
ALTER TABLE "Dashboard" DROP COLUMN "comapaingId";

-- AddForeignKey
ALTER TABLE "Comapaings" ADD CONSTRAINT "Comapaings_dashboardId_fkey" FOREIGN KEY ("dashboardId") REFERENCES "Dashboard"("id") ON DELETE SET NULL ON UPDATE CASCADE;
