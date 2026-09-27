import { useSavedItems } from "../saved-items";

export function useListingFavorites(userId) {
  const { entries, toggle, remember } = useSavedItems(userId, "listings");
  return {
    entries,
    remember,
    favorites: new Set(Object.keys(entries).filter((id) => entries[id].favorite)),
    pinned: new Set(Object.keys(entries).filter((id) => entries[id].pinned)),
    toggleFavorite: (id, payload) => toggle(String(id), "favorite", payload),
    togglePin: (id, payload) => toggle(String(id), "pinned", payload),
  };
}
