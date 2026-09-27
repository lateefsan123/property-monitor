export async function requestTemplateDraft(supabase, brief) {
  const { data, error } = await supabase.functions.invoke('generate-message-template', { body: { brief } });
  if (error) {
    const body = await error.context?.json?.().catch(() => null);
    throw new Error(body?.error || 'Could not generate a draft. Please try again later.');
  }
  if (!data?.draft?.content || !data?.draft?.name) throw new Error('No template draft was returned.');
  return data.draft;
}
