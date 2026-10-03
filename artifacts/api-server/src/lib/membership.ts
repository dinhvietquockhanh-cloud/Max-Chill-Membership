import { desc } from "drizzle-orm";
import { db, membersTable, visitsTable } from "@workspace/db";

export type MembershipTier = "Member" | "Silver" | "Gold";

export type MemberSummary = {
  id: number;
  fullName: string;
  phone: string;
  joinedAt: Date;
  birthday: string | null;
  notes: string | null;
  visitCount: number;
  lastVisitAt: Date | null;
  averagePartySize: number | null;
  totalSpend: number;
  tier: MembershipTier;
};

export type VisitRecord = {
  id: number;
  memberId: number;
  arrivedAt: Date;
  partySize: number;
  billAmount: number;
  note: string | null;
};

export type MemberRecord = MemberSummary & { visits: VisitRecord[] };

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function tierFor(visitCount: number, totalSpend: number): MembershipTier {
  if (visitCount >= 12 || totalSpend >= 10_000_000) return "Gold";
  if (visitCount >= 5 || totalSpend >= 3_000_000) return "Silver";
  return "Member";
}

export async function getMemberRecords(search = ""): Promise<MemberRecord[]> {
  const [members, visits] = await Promise.all([
    db.select().from(membersTable).orderBy(desc(membersTable.joinedAt)),
    db.select().from(visitsTable).orderBy(desc(visitsTable.arrivedAt), desc(visitsTable.id)),
  ]);

  const visitsByMember = new Map<number, VisitRecord[]>();
  for (const visit of visits) {
    const group = visitsByMember.get(visit.memberId) ?? [];
    group.push(visit);
    visitsByMember.set(visit.memberId, group);
  }

  const term = search.trim().toLocaleLowerCase();
  const normalizedTerm = normalizePhone(search);

  return members
    .filter((member) => {
      if (!term) return true;
      return (
        member.fullName.toLocaleLowerCase().includes(term) ||
        (normalizedTerm.length > 0 &&
          normalizePhone(member.phone).includes(normalizedTerm))
      );
    })
    .map((member) => {
      const memberVisits = visitsByMember.get(member.id) ?? [];
      const totalSpend = memberVisits.reduce((sum, visit) => sum + visit.billAmount, 0);
      const averagePartySize =
        memberVisits.length === 0
          ? null
          : Number(
              (
                memberVisits.reduce((sum, visit) => sum + visit.partySize, 0) /
                memberVisits.length
              ).toFixed(1),
            );

      return {
        id: member.id,
        fullName: member.fullName,
        phone: member.phone,
        joinedAt: member.joinedAt,
        birthday: member.birthday,
        notes: member.notes,
        visitCount: memberVisits.length,
        lastVisitAt: memberVisits[0]?.arrivedAt ?? null,
        averagePartySize,
        totalSpend,
        tier: tierFor(memberVisits.length, totalSpend),
        visits: memberVisits,
      };
    });
}

export async function getMemberRecord(memberId: number): Promise<MemberRecord | undefined> {
  const records = await getMemberRecords();
  return records.find((member) => member.id === memberId);
}