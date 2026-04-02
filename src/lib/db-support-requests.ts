import { type SupportRequest as PrismaSupportRequest } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { fromJson, toInputJson, toIsoString } from "@/lib/db-json";
import { SupportRequest, SupportRequestReply, SupportRequestStatus } from "@/lib/types";

export function serializeSupportRequest(row: PrismaSupportRequest): SupportRequest {
  return {
    _id: row.id,
    orderId: row.orderId,
    userId: row.userId,
    userEmail: row.userEmail,
    userName: row.userName,
    productId: row.productId,
    productName: row.productName,
    productVariant: row.productVariant ?? undefined,
    subject: row.subject,
    message: row.message,
    replies: fromJson<SupportRequestReply[]>(row.replies, []),
    lastReplyAt: toIsoString(row.lastReplyAt),
    replyCount: row.replyCount ?? undefined,
    status: row.status as SupportRequestStatus,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listSupportRequests() {
  const rows = await prisma.supportRequest.findMany({
    orderBy: { createdAt: "desc" },
    take: 60,
  });
  return rows.map(serializeSupportRequest);
}

export async function getSupportRequestById(id: string) {
  const row = await prisma.supportRequest.findUnique({ where: { id } });
  return row ? serializeSupportRequest(row) : null;
}

export async function createSupportRequest(input: Omit<SupportRequest, "_id">) {
  const row = await prisma.supportRequest.create({
    data: {
      orderId: input.orderId,
      userId: input.userId,
      userEmail: input.userEmail,
      userName: input.userName,
      productId: input.productId,
      productName: input.productName,
      productVariant: input.productVariant || null,
      subject: input.subject,
      message: input.message,
      replies: toInputJson(input.replies ?? []),
      replyCount: input.replyCount ?? 0,
      status: input.status,
      createdAt: new Date(input.createdAt),
      updatedAt: input.updatedAt ? new Date(input.updatedAt) : new Date(),
      lastReplyAt: input.lastReplyAt ? new Date(input.lastReplyAt) : null,
    },
  });
  return serializeSupportRequest(row);
}

export async function updateSupportRequestStatus(id: string, status: SupportRequestStatus) {
  const row = await prisma.supportRequest.update({
    where: { id },
    data: { status },
  });
  return serializeSupportRequest(row);
}

export async function appendSupportReply(id: string, reply: SupportRequestReply) {
  const current = await prisma.supportRequest.findUnique({ where: { id } });
  if (!current) return null;

  const replies = [...fromJson<SupportRequestReply[]>(current.replies, []), reply];
  const row = await prisma.supportRequest.update({
    where: { id },
    data: {
      replies: toInputJson(replies),
      replyCount: replies.length,
      lastReplyAt: new Date(reply.sentAt),
      status: current.status === "Yeni" ? "İnceleniyor" : current.status,
    },
  });

  return serializeSupportRequest(row);
}
