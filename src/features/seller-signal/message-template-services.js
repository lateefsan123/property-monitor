import { supabase } from "../../supabase";

export const MESSAGE_TEMPLATE_IMAGE_BUCKET = "seller-signal-template-images";
export const MESSAGE_TEMPLATE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const MESSAGE_TEMPLATE_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const TEMPLATE_SELECT_COLUMNS = "id, user_id, name, content, image_path, is_default, created_at, updated_at";
const TEMPLATE_IMAGE_PREVIEW_TTL_SECONDS = 60 * 60;

function getImageExtension(file) {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

function validateTemplateImage(file) {
  if (!file) return;
  if (!MESSAGE_TEMPLATE_IMAGE_TYPES.includes(file.type)) {
    throw new Error("Choose a JPG, PNG, or WebP image.");
  }
  if (file.size > MESSAGE_TEMPLATE_IMAGE_MAX_BYTES) {
    throw new Error("Template images must be 5 MB or smaller.");
  }
}

async function addTemplateImagePreviews(templates = []) {
  const paths = [...new Set(templates.map((template) => template.image_path).filter(Boolean))];
  if (!paths.length) return templates.map((template) => ({ ...template, image_url: null }));

  const { data, error } = await supabase.storage
    .from(MESSAGE_TEMPLATE_IMAGE_BUCKET)
    .createSignedUrls(paths, TEMPLATE_IMAGE_PREVIEW_TTL_SECONDS);
  if (error) throw new Error(error.message);

  const signedUrlByPath = new Map(
    (data || []).map((item) => [item.path, item.signedUrl || item.signedURL || null]),
  );
  return templates.map((template) => ({
    ...template,
    image_url: template.image_path ? signedUrlByPath.get(template.image_path) || null : null,
  }));
}

async function uploadTemplateImage(userId, file) {
  validateTemplateImage(file);
  const path = `${userId}/${crypto.randomUUID()}.${getImageExtension(file)}`;
  const { error } = await supabase.storage
    .from(MESSAGE_TEMPLATE_IMAGE_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });
  if (error) throw new Error(error.message);
  return path;
}

async function removeTemplateImage(path) {
  if (!path) return;
  const { error } = await supabase.storage
    .from(MESSAGE_TEMPLATE_IMAGE_BUCKET)
    .remove([path]);
  if (error) throw new Error(error.message);
}

export async function fetchMessageTemplates(userId) {
  if (!userId) return [];

  const { data, error } = await supabase
    .from("seller_signal_message_templates")
    .select(TEMPLATE_SELECT_COLUMNS)
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("updated_at", { ascending: false });

  if (error) {
    if (error.code === "42P01") return [];
    throw new Error(error.message);
  }

  return addTemplateImagePreviews(data || []);
}

export async function saveMessageTemplate({
  content,
  id,
  imageFile,
  imagePath,
  isDefault,
  name,
  removeImage,
  userId,
}) {
  if (!userId) throw new Error("Sign in to save a message template.");

  const cleanName = String(name || "").trim();
  const cleanContent = String(content || "").trim();
  if (!cleanName) throw new Error("Give this template a name.");
  if (!cleanContent.includes("{{transactions}}")) {
    throw new Error("Keep {{transactions}} in the template so every message includes the sale details.");
  }

  if (isDefault) {
    let clearQuery = supabase
      .from("seller_signal_message_templates")
      .update({ is_default: false })
      .eq("user_id", userId)
      .eq("is_default", true);
    if (id) clearQuery = clearQuery.neq("id", id);
    const { error: clearError } = await clearQuery;
    if (clearError && clearError.code !== "42P01") throw new Error(clearError.message);
  }

  let uploadedImagePath = null;
  let nextImagePath = removeImage ? null : imagePath || null;
  if (imageFile) {
    uploadedImagePath = await uploadTemplateImage(userId, imageFile);
    nextImagePath = uploadedImagePath;
  }

  const record = {
    user_id: userId,
    name: cleanName,
    content: cleanContent,
    image_path: nextImagePath,
    is_default: Boolean(isDefault),
  };
  const query = id
    ? supabase.from("seller_signal_message_templates").update(record).eq("id", id).eq("user_id", userId)
    : supabase.from("seller_signal_message_templates").insert(record);
  const { data, error } = await query
    .select(TEMPLATE_SELECT_COLUMNS)
    .single();

  if (error) {
    if (uploadedImagePath) {
      await removeTemplateImage(uploadedImagePath).catch(() => {});
    }
    throw new Error(error.message);
  }

  if (imagePath && imagePath !== nextImagePath) {
    await removeTemplateImage(imagePath).catch((cleanupError) => {
      console.warn("Could not remove the replaced template image", cleanupError);
    });
  }

  const [saved] = await addTemplateImagePreviews([data]);
  return saved;
}

export async function setDefaultMessageTemplate({ id, userId }) {
  const { error: clearError } = await supabase
    .from("seller_signal_message_templates")
    .update({ is_default: false })
    .eq("user_id", userId)
    .eq("is_default", true);
  if (clearError) throw new Error(clearError.message);

  const { data, error } = await supabase
    .from("seller_signal_message_templates")
    .update({ is_default: true })
    .eq("id", id)
    .eq("user_id", userId)
    .select(TEMPLATE_SELECT_COLUMNS)
    .single();

  if (error) throw new Error(error.message);
  const [saved] = await addTemplateImagePreviews([data]);
  return saved;
}

export async function deleteMessageTemplate({ id, userId }) {
  const { data, error } = await supabase
    .from("seller_signal_message_templates")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)
    .select("id, image_path, is_default")
    .single();

  if (error) throw new Error(error.message);
  if (data?.image_path) {
    await removeTemplateImage(data.image_path).catch((cleanupError) => {
      console.warn("Could not remove the deleted template image", cleanupError);
    });
  }
  return data;
}
