import { useSavedItems } from "../saved-items";

export function useSellerFavorites(userId) {
  const { entries, toggle } = useSavedItems(userId, "sellers");
  return {
    favoriteIds: new Set(Object.keys(entries).filter((id) => entries[id].favorite)),
    pinnedIds: new Set(Object.keys(entries).filter((id) => entries[id].pinned)),
    toggleFavorite: (id) => toggle(String(id), "favorite"),
    togglePin: (id) => toggle(String(id), "pinned"),
  };
}
