import { supabase } from "../../supabase";
import { createMessageTemplateServices } from "../../../shared/message-templates.js";
export const { MESSAGE_TEMPLATE_IMAGE_BUCKET, MESSAGE_TEMPLATE_IMAGE_MAX_BYTES, MESSAGE_TEMPLATE_IMAGE_TYPES, fetchMessageTemplates, saveMessageTemplate, setDefaultMessageTemplate, deleteMessageTemplate } = createMessageTemplateServices(supabase);
