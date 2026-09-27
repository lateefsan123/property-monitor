export function dubaiDateKey(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dubai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export function followUpAfterDays(days, now = new Date()) {
  if (!/^\d+$/.test(String(days)) || Number(days) > 365) throw new Error('Choose a whole number of days from 0 to 365.');
  const date = new Date(`${dubaiDateKey(now)}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + Number(days));
  return date.toISOString().slice(0, 10);
}

export function followUpPending(lead, now = new Date()) {
  return Boolean(lead?.next_follow_up_on && lead.next_follow_up_on > dubaiDateKey(now));
}

export function isSellerAttachment(path, userId, leadId) {
  return Boolean(leadId && typeof path === 'string' && path.startsWith(`${userId}/seller-attachments/${leadId}/`) && !path.includes('..'));
}
