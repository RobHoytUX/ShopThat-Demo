-- AlterTable
ALTER TABLE "Dashboard" ADD COLUMN     "comapaingId" TEXT,
ADD COLUMN     "type" TEXT;

-- CreateTable
CREATE TABLE "KeyWords" (
    "id" TEXT NOT NULL,
    "keyWord" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KeyWords_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Dashboard" ADD CONSTRAINT "Dashboard_comapaingId_fkey" FOREIGN KEY ("comapaingId") REFERENCES "Comapaings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
