import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { splitLeadsBySentStatus } from "./selectors";
import { fetchUserLeads, fetchWhatsAppHomeActivity } from "./services";

const ACTIVITY_DAYS = 14;
const SENT_STATUSES = new Set(["sent", "delivered", "read"]);

function startOfLocalDay(value = new Date()) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function normalizeContactPhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return null;
  return digits.startsWith("0") ? `971${digits.slice(1)}` : digits;
}

function getMessageTime(row) {
  const value = row?.direction === "outbound"
    ? row.sent_at || row.queued_at || row.created_at
    : row.created_at || row.queued_at;
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

function buildWhatsAppMetrics(rows, days = ACTIVITY_DAYS) {
  const start = startOfLocalDay();
  start.setDate(start.getDate() - (days - 1));
  const series = Array.from({ length: days }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      count: 0,
      key: date.toDateString(),
      label: date.toLocaleDateString("en-GB", { weekday: "narrow" }),
    };
  });
  const dayByKey = new Map(series.map((day) => [day.key, day]));
  const contactedAt = new Map();
  const inboundByPhone = new Map();

  for (const row of rows || []) {
    const phone = normalizeContactPhone(row?.recipient_phone);
    const time = getMessageTime(row);
    if (!phone || time === null) continue;

    if (row.direction === "outbound" && SENT_STATUSES.has(row.status)) {
      const day = dayByKey.get(startOfLocalDay(new Date(time)).toDateString());
      if (day) day.count += 1;
      const current = contactedAt.get(phone);
      if (current === undefined || time < current) contactedAt.set(phone, time);
    } else if (row.direction === "inbound") {
      const times = inboundByPhone.get(phone) || [];
      times.push(time);
      inboundByPhone.set(phone, times);
    }
  }

  let repliedCount = 0;
  for (const [phone, firstContactAt] of contactedAt.entries()) {
    if ((inboundByPhone.get(phone) || []).some((receivedAt) => receivedAt >= firstContactAt)) {
      repliedCount += 1;
    }
  }

  const contactedCount = contactedAt.size;
  return {
    contactedCount,
    repliedCount,
    replyRate: contactedCount ? Math.round((repliedCount / contactedCount) * 100) : null,
    series,
  };
}

export function leadsQueryKey(userId) {
  return ["seller-signal", "leads", userId];
}

export function useHomeLeadSummary(userId) {
  const query = useQuery({
    queryKey: leadsQueryKey(userId),
    queryFn: () => fetchUserLeads(userId),
    enabled: Boolean(userId),
  });
  const activityQuery = useQuery({
    queryKey: ["seller-signal", "home-whatsapp-activity", userId, ACTIVITY_DAYS],
    queryFn: () => fetchWhatsAppHomeActivity(userId, ACTIVITY_DAYS),
    enabled: Boolean(userId),
    staleTime: 60 * 1000,
  });

  const leads = useMemo(() => query.data?.leads ?? [], [query.data?.leads]);
  const sentLeads = useMemo(() => query.data?.sentMap ?? {}, [query.data?.sentMap]);
  const sentHistory = useMemo(() => query.data?.sentHistory ?? [], [query.data?.sentHistory]);
  const whatsappMetrics = useMemo(
    () => buildWhatsAppMetrics(activityQuery.data ?? []),
    [activityQuery.data],
  );

  const { activeLeads, doneLeads } = useMemo(
    () => splitLeadsBySentStatus(leads, sentLeads),
    [leads, sentLeads],
  );

  const dueCount = useMemo(
    () => activeLeads.filter((lead) => lead.isDue).length,
    [activeLeads],
  );

  const scheduledCount = useMemo(
    () => activeLeads.filter((lead) => !lead.isDue && lead.nextDueDate).length,
    [activeLeads],
  );

  const urgentCount = useMemo(
    () => activeLeads.filter((lead) => lead.isDue && lead.overdueDays > 0).length,
    [activeLeads],
  );

  const upcomingFollowups = useMemo(
    () => activeLeads.slice(0, 2).map((lead) => ({
      building: lead.building,
      dueLabel: lead.dueLabel,
      id: lead.id,
      name: lead.name || lead.building || lead.phone || "Unnamed lead",
    })),
    [activeLeads],
  );

  const sentTodayCount = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    return sentHistory.filter((sentAt) => {
      const sentDate = new Date(sentAt);
      return !Number.isNaN(sentDate.getTime()) && sentDate >= startOfToday;
    }).length;
  }, [sentHistory]);

  const fallbackSentTrend = useMemo(() => {
    const days = Array.from({ length: 14 }, (_, index) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (13 - index));
      return { start: date.getTime(), count: 0 };
    });

    for (const sentAt of sentHistory) {
      const day = days.findIndex(({ start }, index) => {
        const nextStart = days[index + 1]?.start ?? start + 24 * 60 * 60 * 1000;
        return sentAt >= start && sentAt < nextStart;
      });
      if (day >= 0) days[day].count += 1;
    }

    return days.map(({ count }) => count);
  }, [sentHistory]);

  const hasWhatsAppSentData = whatsappMetrics.series.some((day) => day.count > 0);
  const sentTrend = hasWhatsAppSentData
    ? whatsappMetrics.series.map((day) => day.count)
    : fallbackSentTrend;
  const messageSeries = whatsappMetrics.series.map((day, index) => ({
    ...day,
    count: hasWhatsAppSentData ? day.count : fallbackSentTrend[index] || 0,
  }));

  return {
    activeCount: activeLeads.length,
    doneCount: doneLeads.length,
    dueCount,
    error: query.error?.message ?? null,
    hasLeads: leads.length > 0,
    loading: query.isPending && Boolean(userId),
    messageSeries,
    refetch: query.refetch,
    repliedCount: whatsappMetrics.repliedCount,
    replyLoading: activityQuery.isPending && Boolean(userId),
    replyRate: whatsappMetrics.replyRate,
    replySampleSize: whatsappMetrics.contactedCount,
    scheduledCount,
    sentTodayCount,
    sentTrend,
    upcomingFollowups,
    urgentCount,
  };
}
