import AsyncStorage from "@react-native-async-storage/async-storage";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useWorkspacePreference(userId, name, fallback) {
  const client = useQueryClient();
  const key = ["workspace-preference", userId, name];
  const storageKey = `repeat-ai:${userId}:${name}`;
  const query = useQuery({
    queryKey: key,
    enabled: Boolean(userId),
    queryFn: async () => {
      const value = await AsyncStorage.getItem(storageKey);
      if (!value) return fallback;
      try {
        return JSON.parse(value);
      } catch {
        return fallback;
      }
    },
  });
  const mutation = useMutation({
    mutationFn: async (value) => {
      await AsyncStorage.setItem(storageKey, JSON.stringify(value));
      return value;
    },
    onSuccess: (value) => client.setQueryData(key, value),
  });
  return {
    value: query.data ?? fallback,
    set: mutation.mutate,
    pending: mutation.isPending || query.isPending,
    error: query.error || mutation.error,
  };
}
