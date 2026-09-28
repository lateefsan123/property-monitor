import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useAssistantPreference(userId) {
  const client = useQueryClient();
  const key = ["workspace-preference", userId, "ask-repeat-visible"];
  const storageKey = `repeat-ai:${userId}:ask-repeat-visible`;
  const query = useQuery({
    queryKey: key,
    enabled: Boolean(userId),
    networkMode: "always",
    staleTime: Infinity,
    queryFn: () => window.localStorage.getItem(storageKey) !== "false",
  });
  const mutation = useMutation({
    networkMode: "always",
    mutationFn: async value => {
      window.localStorage.setItem(storageKey, String(value));
      return value;
    },
    onSuccess: value => client.setQueryData(key, value),
  });
  return { value: query.data ?? true, ready: !query.isPending, pending: query.isPending || mutation.isPending, set: mutation.mutate, error: query.error || mutation.error };
}
