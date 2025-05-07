-- AlterTable
ALTER TABLE "Comapaings" ADD COLUMN     "categoriesId" TEXT;

-- AddForeignKey
ALTER TABLE "Comapaings" ADD CONSTRAINT "Comapaings_categoriesId_fkey" FOREIGN KEY ("categoriesId") REFERENCES "Categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
