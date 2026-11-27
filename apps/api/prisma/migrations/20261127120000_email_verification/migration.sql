-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3);

-- Адреса пользователей, вошедших через Google, уже подтверждены.
UPDATE "User" SET "emailVerifiedAt" = CURRENT_TIMESTAMP WHERE "googleId" IS NOT NULL;
