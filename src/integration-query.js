// Share the same account-scoped query between navigation prefetch and the panel.
export function integrationStatusOptions(userId, request) {
  return {
    queryKey: ["integration-connections", userId],
    queryFn: async ({ signal }) => {
      const result = await request({ action: "status" }, signal, userId);
      if (!Array.isArray(result.connections)) throw new Error("Could not load connections. Please retry.");
      return result.connections;
    },
    enabled: Boolean(userId),
    staleTime: 60_000,
    gcTime: 30 * 60_000,
  };
}
