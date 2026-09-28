const prisma = require("../config/prisma");

const REPLY_LIMIT = 500;

const personSelect = {
  id: true,
  email: true,
  staff: { select: { firstName: true, lastName: true } },
  company: { select: { name: true } },
  role: { select: { name: true } },
};

const threadRelations = {
  acceptedBy: { select: personSelect },
  replies: {
    orderBy: { createdAt: "asc" },
    select: { id: true, message: true, accepted: true, createdAt: true, author: { select: personSelect } },
  },
};

const noticeScope = (branchId) => ({ OR: [{ outletId: branchId }, { staff: { branchId } }] });

const fail = (message, status = 422) => Object.assign(new Error(message), { status });

function readReply(body) {
  const accept = body?.accept === true;
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (!accept && !message) throw fail("Write a reply!");
  if (message.length > REPLY_LIMIT) throw fail(`A reply must be ${REPLY_LIMIT} characters or less!`);
  return { accept, message: message || null };
}

async function addReply(reminderId, branchId, userId, body) {
  const { accept, message } = readReply(body);
  const reminder = await prisma.reminder.findFirst({
    where: { id: reminderId, status: "OPEN", ...noticeScope(branchId) },
    select: { id: true, acceptedAt: true },
  });
  if (!reminder) throw fail("Notice Not Found!", 404);
  if (accept && reminder.acceptedAt) throw fail("This notice is already accepted!", 409);

  await prisma.$transaction(async (tx) => {
    await tx.reminderReply.create({ data: { reminderId, authorId: userId, message, accepted: accept } });
    if (accept) await tx.reminder.update({ where: { id: reminderId }, data: { acceptedAt: new Date(), acceptedById: userId } });
  });
  return accept;
}

module.exports = { threadRelations, noticeScope, addReply };
