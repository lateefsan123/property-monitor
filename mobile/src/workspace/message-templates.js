import { supabase } from "../supabase";
import { randomUUID } from "expo-crypto";
import { createMessageTemplateServices } from "../../../shared/message-templates.js";
export const {
  MESSAGE_TEMPLATE_IMAGE_BUCKET,
  MESSAGE_TEMPLATE_IMAGE_MAX_BYTES,
  MESSAGE_TEMPLATE_IMAGE_TYPES,
  fetchMessageTemplates,
  addTemplateImagePreviews,
  saveMessageTemplate,
  setDefaultMessageTemplate,
  deleteMessageTemplate,
} = createMessageTemplateServices(supabase, randomUUID);

export const messageTemplatesOptions = userId => ({
  queryKey: ["seller-signal", "message-templates", userId],
  queryFn: () => fetchMessageTemplates(userId, { includeImagePreviews: false }),
  enabled: Boolean(userId),
  staleTime: 5 * 60_000,
});
