-- CreateTable
CREATE TABLE "RelatedKeyWords" (
    "id" TEXT NOT NULL,
    "keyWord" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "keyWordsId" TEXT,

    CONSTRAINT "RelatedKeyWords_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "RelatedKeyWords" ADD CONSTRAINT "RelatedKeyWords_keyWordsId_fkey" FOREIGN KEY ("keyWordsId") REFERENCES "KeyWords"("id") ON DELETE SET NULL ON UPDATE CASCADE;
