import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import {
  CreateMemberBody,
  CreateMemberResponse,
  CreateVisitBody,
  CreateVisitParams,
  CreateVisitResponse,
  GetMemberParams,
  GetMemberResponse,
  ListMemberVisitsParams,
  ListMemberVisitsResponse,
  ListMembersQueryParams,
  ListMembersResponse,
  UpdateMemberBody,
  UpdateMemberParams,
  UpdateMemberResponse,
} from "@workspace/api-zod";
import { db, membersTable, visitsTable } from "@workspace/db";
import { getMemberRecord, getMemberRecords, normalizePhone } from "../lib/membership";

const router: IRouter = Router();

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

function validPhone(phone: string): boolean {
  const normalized = normalizePhone(phone);
  return normalized.length >= 8 && normalized.length <= 15;
}

function toDateOnly(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  return value instanceof Date ? value.toISOString().slice(0, 10) : value.slice(0, 10);
}

router.get("/members", async (req, res): Promise<void> => {
  const parsed = ListMembersQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const records = await getMemberRecords(parsed.data.search ?? "");
  res.json(ListMembersResponse.parse(records));
});

router.post("/members", async (req, res): Promise<void> => {
  const parsed = CreateMemberBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  if (!validPhone(parsed.data.phone)) {
    res.status(400).json({ error: "Số điện thoại cần có từ 8 đến 15 chữ số." });
    return;
  }

  try {
    const [member] = await db
      .insert(membersTable)
      .values({
        fullName: parsed.data.fullName.trim(),
        phone: parsed.data.phone.trim(),
        phoneNormalized: normalizePhone(parsed.data.phone),
        joinedAt: new Date(parsed.data.joinedAt),
        birthday: toDateOnly(parsed.data.birthday),
        notes: parsed.data.notes?.trim() || null,
      })
      .returning();

    res.status(201).json(
      CreateMemberResponse.parse({
        ...member,
        visitCount: 0,
        lastVisitAt: null,
        averagePartySize: null,
        totalSpend: 0,
        tier: "Member",
      }),
    );
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      res.status(409).json({ error: "Số điện thoại này đã có thành viên." });
      return;
    }
    throw error;
  }
});

router.get("/members/:memberId", async (req, res): Promise<void> => {
  const params = GetMemberParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const member = await getMemberRecord(params.data.memberId);
  if (!member) {
    res.status(404).json({ error: "Không tìm thấy thành viên." });
    return;
  }
  res.json(GetMemberResponse.parse(member));
});

router.patch("/members/:memberId", async (req, res): Promise<void> => {
  const params = UpdateMemberParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateMemberBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  if (!validPhone(parsed.data.phone)) {
    res.status(400).json({ error: "Số điện thoại cần có từ 8 đến 15 chữ số." });
    return;
  }

  try {
    const [member] = await db
      .update(membersTable)
      .set({
        fullName: parsed.data.fullName.trim(),
        phone: parsed.data.phone.trim(),
        phoneNormalized: normalizePhone(parsed.data.phone),
        birthday: toDateOnly(parsed.data.birthday),
        notes: parsed.data.notes?.trim() || null,
      })
      .where(eq(membersTable.id, params.data.memberId))
      .returning();

    if (!member) {
      res.status(404).json({ error: "Không tìm thấy thành viên." });
      return;
    }
    const record = await getMemberRecord(member.id);
    res.json(UpdateMemberResponse.parse(record));
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      res.status(409).json({ error: "Số điện thoại này đã có thành viên." });
      return;
    }
    throw error;
  }
});

router.post("/members/:memberId/visits", async (req, res): Promise<void> => {
  const params = CreateVisitParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = CreateVisitBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existingMember] = await db
    .select({ id: membersTable.id })
    .from(membersTable)
    .where(eq(membersTable.id, params.data.memberId))
    .limit(1);
  if (!existingMember) {
    res.status(404).json({ error: "Không tìm thấy thành viên." });
    return;
  }

  const [visit] = await db
    .insert(visitsTable)
    .values({
      memberId: params.data.memberId,
      arrivedAt: new Date(parsed.data.arrivedAt),
      partySize: parsed.data.partySize,
      billAmount: parsed.data.billAmount,
      note: parsed.data.note?.trim() || null,
    })
    .returning();

  res.status(201).json(CreateVisitResponse.parse(visit));
});

router.get("/members/:memberId/visits", async (req, res): Promise<void> => {
  const params = ListMemberVisitsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [member] = await db
    .select({ id: membersTable.id })
    .from(membersTable)
    .where(eq(membersTable.id, params.data.memberId))
    .limit(1);
  if (!member) {
    res.status(404).json({ error: "Không tìm thấy thành viên." });
    return;
  }

  const visits = await db
    .select()
    .from(visitsTable)
    .where(eq(visitsTable.memberId, params.data.memberId))
    .orderBy(visitsTable.arrivedAt);
  res.json(ListMemberVisitsResponse.parse(visits.reverse()));
});

export default router;