-- BEGIN; 과 COMMIT; 사이에서 실행한다(한 문장이 실패하면 전부 되돌리기 위해).
-- 자동 실행하지 않는다. 이 마이그레이션 이전 코드로 되돌릴 때 수동으로 실행한 뒤
-- DELETE FROM "_prisma_migrations" WHERE migration_name = '20261012010000_member'; 도 실행한다.
-- PENDING 신청자는 예전 모델에 없는 개념이라 지운다.
DELETE FROM "Member" WHERE "status" = 'PENDING';
DROP INDEX "Member_status_createdAt_idx";
ALTER TABLE "Member" ADD COLUMN "note" TEXT, ADD COLUMN "addedBy" TEXT;
UPDATE "Member" SET "note" = NULLIF("affiliation", ''), "addedBy" = COALESCE("decidedBy", 'unknown');
ALTER TABLE "Member" ALTER COLUMN "addedBy" SET NOT NULL;
ALTER TABLE "Member" DROP COLUMN "name", DROP COLUMN "affiliation", DROP COLUMN "status", DROP COLUMN "decidedBy", DROP COLUMN "decidedAt";
DROP TYPE "MemberStatus";
ALTER TABLE "Member" RENAME CONSTRAINT "Member_email_lower_chk" TO "MotionViewer_email_lower_chk";
ALTER INDEX "Member_email_key" RENAME TO "MotionViewer_email_key";
ALTER TABLE "Member" RENAME CONSTRAINT "Member_pkey" TO "MotionViewer_pkey";
ALTER SEQUENCE "Member_id_seq" RENAME TO "MotionViewer_id_seq";
ALTER TABLE "Member" RENAME TO "MotionViewer";
