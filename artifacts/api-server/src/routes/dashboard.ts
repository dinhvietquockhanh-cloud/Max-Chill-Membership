import { Router, type IRouter } from "express";
import { GetDashboardResponse } from "@workspace/api-zod";
import { getMemberRecords } from "../lib/membership";

const router: IRouter = Router();

function bangkokMonth(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  return `${year}-${month}`;
}

router.get("/dashboard", async (_req, res): Promise<void> => {
  const members = await getMemberRecords();
  const currentMonth = bangkokMonth(new Date());
  const topByVisits = [...members]
    .sort((a, b) => b.visitCount - a.visitCount || a.fullName.localeCompare(b.fullName))
    .slice(0, 5)
    .map(({ id, fullName, phone, visitCount, totalSpend, tier }) => ({
      id,
      fullName,
      phone,
      visitCount,
      totalSpend,
      tier,
    }));
  const topBySpend = [...members]
    .sort((a, b) => b.totalSpend - a.totalSpend || a.fullName.localeCompare(b.fullName))
    .slice(0, 5)
    .map(({ id, fullName, phone, visitCount, totalSpend, tier }) => ({
      id,
      fullName,
      phone,
      visitCount,
      totalSpend,
      tier,
    }));

  res.json(
    GetDashboardResponse.parse({
      totalMembers: members.length,
      newMembers: members.filter((member) => bangkokMonth(member.joinedAt) === currentMonth)
        .length,
      returningMembers: members.filter((member) => member.visitCount > 1).length,
      silverMembers: members.filter((member) => member.tier === "Silver").length,
      goldMembers: members.filter((member) => member.tier === "Gold").length,
      pilotCapacity: { limit: 100, remaining: Math.max(0, 100 - members.length) },
      topByVisits,
      topBySpend,
    }),
  );
});

export default router;