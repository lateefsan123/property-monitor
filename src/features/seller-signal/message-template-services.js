import { supabase } from "../../supabase";
import { createMessageTemplateServices } from "../../../shared/message-templates.js";
export const { MESSAGE_TEMPLATE_IMAGE_BUCKET, MESSAGE_TEMPLATE_IMAGE_MAX_BYTES, MESSAGE_TEMPLATE_IMAGE_TYPES, MESSAGE_TEMPLATE_MEDIA_TYPES, MESSAGE_TEMPLATE_VIDEO_MAX_BYTES, fetchMessageTemplates, saveMessageTemplate, setDefaultMessageTemplate, deleteMessageTemplate } = createMessageTemplateServices(supabase);
