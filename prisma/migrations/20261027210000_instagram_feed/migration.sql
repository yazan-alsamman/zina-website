-- CreateEnum
CREATE TYPE "InstagramMediaType" AS ENUM ('IMAGE', 'VIDEO', 'CAROUSEL_ALBUM');

-- CreateTable
CREATE TABLE "InstagramPost" (
    "id" TEXT NOT NULL,
    "caption" TEXT,
    "mediaType" "InstagramMediaType" NOT NULL,
    "permalink" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "localImagePath" TEXT NOT NULL,
    "localVideoPosterPath" TEXT,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "likeCount" INTEGER,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "isManual" BOOLEAN NOT NULL DEFAULT false,
    "removedAt" TIMESTAMP(3),
    "assetId" TEXT,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InstagramPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "InstagramPost_isHidden_timestamp_idx" ON "InstagramPost"("isHidden", "timestamp");

-- CreateIndex
CREATE INDEX "InstagramPost_assetId_idx" ON "InstagramPost"("assetId");

-- AddForeignKey
ALTER TABLE "InstagramPost" ADD CONSTRAINT "InstagramPost_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

