-- AlterTable
ALTER TABLE "Reminder" ADD COLUMN     "acceptedAt" TIMESTAMP(3),
ADD COLUMN     "acceptedById" TEXT;

-- CreateTable
CREATE TABLE "ReminderReply" (
    "id" TEXT NOT NULL,
    "reminderId" TEXT NOT NULL,
    "authorId" TEXT,
    "message" TEXT,
    "accepted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReminderReply_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReminderReply_reminderId_createdAt_idx" ON "ReminderReply"("reminderId", "createdAt");

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_acceptedById_fkey" FOREIGN KEY ("acceptedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReminderReply" ADD CONSTRAINT "ReminderReply_reminderId_fkey" FOREIGN KEY ("reminderId") REFERENCES "Reminder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReminderReply" ADD CONSTRAINT "ReminderReply_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
