import { useMutation, useQuery } from "@tanstack/react-query";
import { fetchBuildingAliases, upsertBuildingAlias } from "./services";
import { sellerBuildingAliasesQueryKey } from "./queryKeys";

const EMPTY_BUILDING_ALIASES = [];

export function useSellerSignalBuildingAliases(userId) {
  const buildingAliasesQuery = useQuery({
    queryKey: sellerBuildingAliasesQueryKey(userId),
    enabled: Boolean(userId),
    queryFn: () => fetchBuildingAliases(userId),
    staleTime: 5 * 60 * 1000,
  });

  const upsertBuildingAliasMutation = useMutation({
    mutationFn: ({ aliasName, canonicalName }) =>
      upsertBuildingAlias({ userId, aliasName, canonicalName }),
  });

  return {
    buildingAliases: buildingAliasesQuery.data || EMPTY_BUILDING_ALIASES,
    buildingAliasesQuery,
    upsertBuildingAliasMutation,
  };
}
