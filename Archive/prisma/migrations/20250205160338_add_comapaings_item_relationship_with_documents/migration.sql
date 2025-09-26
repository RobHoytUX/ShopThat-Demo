-- CreateTable
CREATE TABLE "_ComapaingItemDocuments" (
    "A" TEXT NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_ComapaingItemDocuments_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_ComapaingItemDocuments_B_index" ON "_ComapaingItemDocuments"("B");

-- AddForeignKey
ALTER TABLE "_ComapaingItemDocuments" ADD CONSTRAINT "_ComapaingItemDocuments_A_fkey" FOREIGN KEY ("A") REFERENCES "ComapaingItems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ComapaingItemDocuments" ADD CONSTRAINT "_ComapaingItemDocuments_B_fkey" FOREIGN KEY ("B") REFERENCES "Documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
