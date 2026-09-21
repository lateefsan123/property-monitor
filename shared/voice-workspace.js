import { createAssistantMarket, marketResultCards } from './assistant-market.js';

// The model can read account data and PREPARE changes. Only the visible UI can
// execute a pending change; no approval capability is exposed as a model tool.
export function createVoiceWorkspace({ supabase, userId, fetchPriceDrops, onChanged = () => {} }) {
  let pending = null;
  const knownLeads = new Set();
  const market = createAssistantMarket({ supabase });
  async function identity(signal) {
    if (signal?.aborted) throw new Error('Conversation ended.');
    const { data, error } = await supabase.auth.getUser();
    if (error || !userId || data?.user?.id !== userId) throw new Error('Please sign in again.');
    return data.user;
  }
  async function result(query, signal) {
    const response = await (signal ? query.abortSignal(signal) : query);
    if (response.error) throw new Error(response.error.message);
    if (signal?.aborted) throw new Error('Conversation ended.');
    return response;
  }
  async function settings(signal) {
    const { data } = await result(supabase.from('seller_signal_automation_settings')
      .select('auto_whatsapp_enabled,monthly_reports_enabled').eq('user_id', userId).maybeSingle(), signal);
    return { auto_whatsapp_enabled: data?.auto_whatsapp_enabled !== false, monthly_reports_enabled: data?.monthly_reports_enabled === true };
  }
  async function read(name, args, signal) {
    const user = await identity(signal);
    if (['market_locations', 'market_sales', 'market_listings'].includes(name)) return market.read(name, args, signal);
    if (name === 'account_profile') return { title: 'Your account', items: [{ name: String(user.user_metadata?.full_name || user.user_metadata?.name || 'Repeat AI account').slice(0, 120), content: user.email || '' }] };
    if (name === 'find_leads') {
      const offset = Number(args.offset);
      if (!Number.isInteger(offset) || offset < 0 || offset > 100000) throw new Error('Invalid page.');
      const term = args.query.replace(/[^\p{L}\p{N}\s-]/gu, '').trim().slice(0, 100);
      let query = supabase.from('leads').select('id,name,building,unit,status,phone,sent_at', { count: 'exact' }).eq('user_id', userId);
      if (term) query = query.or(`name.ilike.%${term}%,building.ilike.%${term}%,phone.ilike.%${term}%`);
      if (args.status) query = query.ilike('status', args.status.replace(/[%_]/g, ''));
      const { data, count } = await result(query.order('id').range(offset, offset + 19), signal);
      for (const lead of data || []) knownLeads.add(String(lead.id));
      return { kind: 'leads', title: term ? `Leads matching “${term}”` : 'Your leads', items: data || [], total: count, offset, nextOffset: offset + 20 < count ? offset + 20 : null };
    }
    if (name === 'lead_details') {
      const lead = await getLead(args.lead_id, signal);
      return { kind: 'lead-detail', title: lead.name || 'Seller details', items: [lead] };
    }
    if (name === 'price_drops') {
      const all = await fetchPriceDrops(userId);
      if (signal?.aborted) throw new Error('Conversation ended.');
      const query = args.building.toLowerCase().trim();
      const items = all.filter(item => !query || String(item.buildingName || '').toLowerCase().includes(query));
      return { kind: 'price-drops', title: 'Price drops', note: 'From your saved listing alerts. Latest recorded changes, not a live market refresh.', total: items.length,
        items: items.slice(0, 20).map(item => ({ id: item.id, buildingName: item.buildingName, title: item.title, price: item.price, previousPrice: item.previousPrice, priceDelta: item.priceDelta, verifiedAt: item.verifiedAt })) };
    }
    if (name === 'workspace_spreadsheets') {
      const { data } = await result(supabase.from('lead_sources').select('id,label,building_name').eq('user_id', userId).order('sort_order').limit(50), signal);
      return { kind: 'spreadsheets', title: 'Your spreadsheets', note: 'First 50 imported sources. Search their sellers with find_leads.', items: data || [] };
    }
    if (name === 'message_templates') {
      const { data } = await result(supabase.from('seller_signal_message_templates').select('id,name,content,is_default').eq('user_id', userId).order('created_at', { ascending: false }).limit(20), signal);
      return { kind: 'templates', title: 'Message templates', note: 'Latest 20 templates.', items: data || [] };
    }
    if (name === 'automation_status') {
      const current = await settings(signal);
      return { kind: 'automation', title: 'Your automations', items: [
        { name: 'Seller follow-ups', status: current.auto_whatsapp_enabled ? 'Enabled' : 'Paused' },
        { name: 'Monthly reports', status: current.monthly_reports_enabled ? 'Enabled' : 'Paused' },
      ], note: 'Enabled means scheduled automation is allowed; it does not mean any message has been sent.' };
    }
    if (name === 'send_activity') {
      const { data } = await result(supabase.from('whatsapp_messages').select('id,lead_id,status,sent_at,queued_at').eq('user_id', userId).eq('direction', 'outbound').order('queued_at', { ascending: false }).limit(20), signal);
      return { kind: 'activity', title: 'Recent WhatsApp activity', note: 'Latest 20 outbound messages. Queued does not mean delivered.', items: data || [] };
    }
    throw new Error('Unsupported workspace lookup.');
  }
  async function getLead(id, signal) {
    if (!knownLeads.has(String(id))) throw new Error('Find the seller first and use the returned ID.');
    const { data } = await result(supabase.from('leads').select('id,name,building,unit,status,phone,notes').eq('user_id', userId).eq('id', id).single(), signal);
    if (!data) throw new Error('Seller no longer available.');
    return data;
  }
  async function prepareRecord(name, args, signal) {
    await identity(signal);
    if (pending) throw new Error('Review or dismiss the current change first.');
    if (name === 'prepare_template') {
      const title = args.name.trim(), content = args.content.trim();
      if (!title || title.length > 120 || !content || content.length > 6000 || !content.includes('{{transactions}}')) throw new Error('A name and template with {{transactions}} are required.');
      pending = { kind: 'template', name: title, content, expires: Date.now() + 120000 };
      return { kind: 'workspace', preview: { subject: `Create template “${title}”?`, body: content + '\n\nSaved as a new template. Your default template and broker image remain unchanged. No message is sent.' } };
    }
    if (!['prepare_lead_note', 'prepare_lead_status'].includes(name)) throw new Error('Unsupported change.');
    const lead = await getLead(args.lead_id, signal);
    const field = name === 'prepare_lead_note' ? 'notes' : 'status';
    let next;
    if (field === 'notes') {
      const note = args.note.trim();
      if (!note || note.length > 2000) throw new Error('Use a note between 1 and 2000 characters.');
      next = [lead.notes, note].filter(Boolean).join('\n\n');
      if (next.length > 16000) throw new Error('This seller’s notes are too long. Edit them in the seller screen.');
    } else {
      if (!['Prospect', 'Not Interested', 'Market Appraisal', 'For Sale Available'].includes(args.status)) throw new Error('Invalid seller status.');
      next = args.status;
    }
    pending = { kind: 'lead', id: lead.id, field, before: lead[field] ?? null, next, expires: Date.now() + 120000 };
    return { kind: 'workspace', preview: { subject: `${field === 'notes' ? 'Add note to' : 'Update status for'} ${lead.name || 'seller'}?`,
      body: `${[lead.building, lead.unit && `Unit ${lead.unit}`].filter(Boolean).join(' · ')}\n\n${field === 'notes' ? args.note.trim() + '\n\nExisting notes are kept.' : `${lead.status || 'No status'} → ${next}`}` } };
  }
  async function prepare(args, signal) {
    await identity(signal);
    if (pending) throw new Error('Review or dismiss the current change first.');
    if (!['followups', 'reports'].includes(args.automation) || !['enable', 'pause'].includes(args.action)) throw new Error('Invalid automation.');
    const before = await settings(signal);
    const field = args.automation === 'followups' ? 'auto_whatsapp_enabled' : 'monthly_reports_enabled';
    const enabled = args.action === 'enable';
    if (before[field] === enabled) return { unchanged: true, message: `This automation is already ${enabled ? 'enabled' : 'paused'}.` };
    if (field === 'auto_whatsapp_enabled' && enabled) {
      const { data } = await result(supabase.from('whatsapp_accounts').select('connection_status').eq('user_id', userId).eq('connection_status', 'connected').limit(1), signal);
      if (!data?.length) throw new Error('Connect WhatsApp in Settings before enabling follow-ups.');
    }
    pending = { field, enabled, before, expires: Date.now() + 120000 };
    return { kind: 'automation', preview: {
      subject: `${enabled ? 'Enable' : 'Pause'} ${args.automation === 'followups' ? 'seller follow-ups' : 'monthly reports'}?`,
      body: args.automation === 'followups' && enabled
        ? 'Allow the existing scheduler to send WhatsApp follow-ups to eligible sellers using your saved templates, timing and account limits. This applies to your account, not a selected subset. It does not send a batch immediately.'
        : 'Change this account’s existing scheduled automation. Already queued messages are not cancelled by this setting.',
    } };
  }
  async function confirm() {
    const change = pending;
    pending = null; // one shot, including an uncertain network outcome
    await identity();
    if (!change || change.expires < Date.now()) throw new Error('This approval expired. Ask again.');
    if (change.kind === 'template') {
      const { data } = await result(supabase.from('seller_signal_message_templates').insert({ user_id: userId, name: change.name, content: change.content, is_default: false, image_path: null }).select('id').single());
      if (!data?.id) throw new Error('Could not verify the saved template.');
      onChanged(); return { message: 'Template saved. Your default is unchanged. Nothing sent.' };
    }
    if (change.kind === 'lead') {
      let query = supabase.from('leads').update({ [change.field]: change.next }).eq('user_id', userId).eq('id', change.id);
      query = change.before === null ? query.is(change.field, null) : query.eq(change.field, change.before);
      const { data } = await result(query.select('id').maybeSingle());
      if (!data?.id) throw new Error('The seller changed or is unavailable. Review again.');
      onChanged(); return { message: change.field === 'notes' ? 'Note added. Existing notes kept.' : 'Seller status updated.' };
    }
    const current = await settings();
    if (JSON.stringify(current) !== JSON.stringify(change.before)) throw new Error('Settings changed. Review a fresh preview.');
    const next = { ...current, [change.field]: change.enabled };
    const { data } = await result(supabase.from('seller_signal_automation_settings').upsert({ user_id: userId, ...next }, { onConflict: 'user_id' })
      .select('auto_whatsapp_enabled,monthly_reports_enabled').single());
    if (data?.[change.field] !== change.enabled) throw new Error('Could not verify the change.');
    onChanged();
    return { message: `Automation ${change.enabled ? 'enabled' : 'paused'}. No immediate send was requested.` };
  }
  return { read, prepare, prepareRecord, confirm, discard: () => { pending = null; } };
}

const money = value => Number.isFinite(value) ? `AED ${value.toLocaleString('en-GB')}` : 'Price unavailable';
// A bounded, shared presentation contract: no raw JSON or internal IDs in cards.
export function voiceResultCards(result) {
  if (!result) return [];
  if (['market-locations', 'market-sales', 'market-listings'].includes(result.kind)) return marketResultCards(result);
  if (result.rows) return result.rows.slice(0, 20).map((row, i) => ({ title: `Row ${i + 1}`, detail: row.join(' · ') }));
  return (result.items || []).slice(0, 20).map(item => {
    if (result.kind === 'price-drops') return { title: item.buildingName || item.title || 'Listing', detail: `${money(item.previousPrice)} → ${money(item.price)}`, meta: item.verifiedAt ? `Recorded ${new Date(item.verifiedAt).toLocaleDateString('en-GB')}` : 'Date unavailable' };
    if (['leads', 'lead-detail'].includes(result.kind)) return { title: item.name || 'Unnamed seller', detail: [item.building, item.unit && `Unit ${item.unit}`, item.status, item.notes].filter(Boolean).join(' · '), meta: item.phone || 'No phone saved' };
    return { title: item.name || item.label || item.building_name || item.subject || item.summary || 'Message', detail: item.content || item.snippet || item.preview || item.status || item.start || '', meta: item.from || item.sent_at || '' };
  }).map(item => ({ title: String(item.title), detail: typeof item.detail === 'string' ? item.detail : '', meta: typeof item.meta === 'string' ? item.meta : '' }));
}
