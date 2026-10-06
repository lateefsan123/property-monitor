export const BROKER_INTRO = "Hi {name}, Lateef here from Repeat AI. I found your contact on the {agency} website. Repeat AI follows up with your sellers on WhatsApp using personalised messages and recent sales in their building. Here's a short demo: {demo_url}. I'm happy to help you get set up. If it's not for you, just let me know.";
export const BROKER_FOLLOWUP = "Hi {name}, just following up on Repeat AI. Would it help to see how it can keep you in touch with your sellers at {agency}? Happy to walk you through it or help you get set up. If you'd rather not hear from me, let me know and I'll leave it there.";

export function brokerPhone(value) {
  let phone = String(value || '').replace(/\D/g, '');
  if (phone.startsWith('00')) phone = phone.slice(2);
  if (phone.startsWith('9710')) phone = `971${phone.slice(4)}`;
  if (!/^[1-9]\d{7,14}$/.test(phone)) throw new Error('Use an international phone number, including its country code.');
  return phone;
}

export function renderBrokerMessage(template, contact, demoUrl) {
  const values = { name: contact.name, agency: contact.agency, demo_url: demoUrl };
  const text = String(template).replace(/\{([^}]+)\}/g, (_, key) => {
    if (!(key in values)) throw new Error(`Unknown message field: ${key}`);
    return String(values[key] || '').trim();
  }).trim();
  if (!contact.name?.trim() || !contact.agency?.trim()) throw new Error('Each broker needs a name and agency.');
  if (!text || text.length > 1024) throw new Error('Keep each personalised message between 1 and 1,024 characters.');
  return text;
}

export function prepareBrokerContacts(records, contacted = []) {
  const excluded = new Set(contacted.map(r => brokerPhone(r.phone)));
  const seen = new Set();
  return records.flatMap(record => {
    const phone = brokerPhone(record.phone);
    if (seen.has(phone) || excluded.has(phone)) return [];
    seen.add(phone);
    if (!record.name?.trim() || !record.agency?.trim()) throw new Error('Each broker needs a name and agency.');
    return [{ phone, name: record.name.trim(), agency: record.agency.trim(), source: String(record.source || '').trim() }];
  });
}

export function isBrokerOptOut(body) {
  return /\b(stop|unsubscribe|remove me|not interested|no thanks|don't (?:contact|message)|do not (?:contact|message))\b/i.test(String(body || ''));
}
