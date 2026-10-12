-- CreateTable
CREATE TABLE "MotionViewer" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "note" TEXT,
    "addedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MotionViewer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MotionViewer_email_key" ON "MotionViewer"("email");


-- 앱이 소문자로 정규화해 저장하지만, 다른 경로로 들어온 대문자 이메일이 중복·조회 누락을 만들지 않게 DB 에서도 막는다.
ALTER TABLE "MotionViewer" ADD CONSTRAINT "MotionViewer_email_lower_chk" CHECK ("email" = lower("email"));
