import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DEFAULT_MESSAGE_TEMPLATE } from "./insight-utils";
import {
  deleteMessageTemplate,
  fetchMessageTemplates,
  saveMessageTemplate,
  setDefaultMessageTemplate,
} from "./message-template-services";
import { sellerMessageTemplatesQueryKey } from "./queryKeys";

const EMPTY_TEMPLATES = [];

export function useSellerSignalMessageTemplates(userId) {
  const queryClient = useQueryClient();
  const queryKey = sellerMessageTemplatesQueryKey(userId);
  const templatesQuery = useQuery({
    queryKey,
    enabled: Boolean(userId),
    queryFn: () => fetchMessageTemplates(userId),
    staleTime: 60 * 1000,
  });
  const templates = templatesQuery.data || EMPTY_TEMPLATES;
  const activeTemplate = templates.find((template) => template.is_default) || null;

  const saveMutation = useMutation({
    mutationFn: (template) => saveMessageTemplate({ ...template, userId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });
  const defaultMutation = useMutation({
    mutationFn: (id) => setDefaultMessageTemplate({ id, userId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => deleteMessageTemplate({ id, userId }),
    onSuccess: async (deleted) => {
      await queryClient.invalidateQueries({ queryKey });
      if (!deleted?.is_default) return;
      const refreshed = queryClient.getQueryData(queryKey) || [];
      if (refreshed[0]?.id) await setDefaultMessageTemplate({ id: refreshed[0].id, userId });
      await queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    activeTemplate,
    activeTemplateContent: activeTemplate?.content || DEFAULT_MESSAGE_TEMPLATE,
    deleteTemplate: (id) => deleteMutation.mutateAsync(id),
    error: templatesQuery.error,
    loading: templatesQuery.isPending,
    saving: saveMutation.isPending || defaultMutation.isPending || deleteMutation.isPending,
    saveTemplate: (template) => saveMutation.mutateAsync({
      ...template,
      isDefault: template.isDefault || templates.length === 0,
    }),
    setDefaultTemplate: (id) => defaultMutation.mutateAsync(id),
    templates,
  };
}
