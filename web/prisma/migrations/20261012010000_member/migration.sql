-- MotionViewer 를 Member 로 바꾸며 기존 열람자는 모두 등록(APPROVED) 상태로 보존한다.
ALTER TABLE "MotionViewer" RENAME TO "Member";
ALTER SEQUENCE "MotionViewer_id_seq" RENAME TO "Member_id_seq";
ALTER TABLE "Member" RENAME CONSTRAINT "MotionViewer_pkey" TO "Member_pkey";
ALTER INDEX "MotionViewer_email_key" RENAME TO "Member_email_key";
ALTER TABLE "Member" RENAME CONSTRAINT "MotionViewer_email_lower_chk" TO "Member_email_lower_chk";

CREATE TYPE "MemberStatus" AS ENUM ('PENDING', 'APPROVED');

ALTER TABLE "Member"
  ADD COLUMN "name" TEXT,
  ADD COLUMN "affiliation" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "status" "MemberStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "decidedBy" TEXT,
  ADD COLUMN "decidedAt" TIMESTAMP(3);

UPDATE "Member"
SET "status" = 'APPROVED',
    "name" = split_part("email", '@', 1),
    "affiliation" = COALESCE("note", ''),
    "decidedBy" = "addedBy",
    "decidedAt" = "createdAt";

ALTER TABLE "Member" ALTER COLUMN "name" SET NOT NULL;
ALTER TABLE "Member" DROP COLUMN "note", DROP COLUMN "addedBy";

CREATE INDEX "Member_status_createdAt_idx" ON "Member"("status", "createdAt");
