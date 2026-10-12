function checked({ data, error }) {
  if (error) throw new Error('Outreach storage unavailable');
  return data;
}
export function createOutreachStore(db) {
  return {
    async read(userId) { return checked(await db.from('email_outreach_state').select('revision,state').eq('user_id',userId).maybeSingle()); },
    async save(userId, revision, state) { return checked(await db.rpc('save_email_outreach_state',{p_user:userId,p_revision:revision,p_state:state})); },
    async due() { return checked(await db.from('email_outreach_state').select('user_id').eq('state->>status','active').limit(100)) || []; },
  };
}
