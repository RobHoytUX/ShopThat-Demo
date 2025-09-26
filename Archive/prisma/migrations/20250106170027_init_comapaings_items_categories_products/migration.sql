-- CreateTable
CREATE TABLE "Comapaings" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "events" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "people" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "products" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "Comapaings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComapaingItems" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "image" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "type" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "ComapaingItems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Categories" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "image" TEXT,
    "parentCategoryId" TEXT,

    CONSTRAINT "Categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Products" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "image" TEXT,
    "usagesCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CampaingItemsToComapaings" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CampaingItemsToComapaings_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_CategoriesOnProducts" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CategoriesOnProducts_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_CampaingItemsToComapaings_B_index" ON "_CampaingItemsToComapaings"("B");

-- CreateIndex
CREATE INDEX "_CategoriesOnProducts_B_index" ON "_CategoriesOnProducts"("B");

-- AddForeignKey
ALTER TABLE "Categories" ADD CONSTRAINT "Categories_parentCategoryId_fkey" FOREIGN KEY ("parentCategoryId") REFERENCES "Categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CampaingItemsToComapaings" ADD CONSTRAINT "_CampaingItemsToComapaings_A_fkey" FOREIGN KEY ("A") REFERENCES "ComapaingItems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CampaingItemsToComapaings" ADD CONSTRAINT "_CampaingItemsToComapaings_B_fkey" FOREIGN KEY ("B") REFERENCES "Comapaings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CategoriesOnProducts" ADD CONSTRAINT "_CategoriesOnProducts_A_fkey" FOREIGN KEY ("A") REFERENCES "Categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CategoriesOnProducts" ADD CONSTRAINT "_CategoriesOnProducts_B_fkey" FOREIGN KEY ("B") REFERENCES "Products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
