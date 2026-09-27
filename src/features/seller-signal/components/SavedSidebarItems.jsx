import { useQuery } from "@tanstack/react-query";
import { IconBuildingEstate, IconUsers } from "@tabler/icons-react";
import { fetchUserLeads } from "../services";
import { sellerLeadsQueryKey } from "../queryKeys";
import { useSellerFavorites } from "../useSellerFavorites";
import { useListingFavorites } from "../../listing-alerts/useListingFavorites";
import { requestOpenListing } from "../../listing-alerts/open-listing-request";

export default function SavedSidebarItems({ userId, onOpenSeller, onNavigate }) {
  const { favoriteIds, pinnedIds } = useSellerFavorites(userId);
  const { entries } = useListingFavorites(userId);
  const { data } = useQuery({
    queryKey: sellerLeadsQueryKey(userId),
    queryFn: () => fetchUserLeads(userId),
    enabled: Boolean(userId) && (favoriteIds.size > 0 || pinnedIds.size > 0),
    staleTime: 2 * 60 * 1000,
  });
  const sellers = (data?.leads || []).filter((lead) => favoriteIds.has(String(lead.id)) || pinnedIds.has(String(lead.id)));
  const listings = Object.entries(entries).filter(([, entry]) => entry.payload);
  if (!sellers.length && !listings.length) return null;

  return (
    <div className="sidenav-group sidenav-group-favorites" aria-label="Saved sellers and listings">
      {sellers.map((lead) => (
        <button key={lead.id} type="button" className="sidenav-link sidenav-favorite accent-indigo"
          title={`Seller: ${lead.name || "Unnamed seller"}`} onClick={() => onOpenSeller(String(lead.id))}>
          <IconUsers size={20} stroke={1.8} aria-hidden="true" />
          <span className="sidenav-favorite-label">{lead.name || "Unnamed seller"}</span>
        </button>
      ))}
      {listings.map(([key, { payload }]) => {
        const building = key.startsWith("b:");
        const name = (building ? payload.buildingName || payload.name : payload.title || payload.buildingName) || "Saved listing";
        return (
          <button key={key} type="button" className="sidenav-link sidenav-favorite accent-rose"
            title={`${building ? "Building" : "Listing"}: ${name}`} onClick={() => {
              requestOpenListing(building ? payload.locationId : payload.key || `${payload.locationId}:${payload.id}`);
              onNavigate("listing-alerts");
            }}>
            <IconBuildingEstate size={20} stroke={1.8} aria-hidden="true" />
            <span className="sidenav-favorite-label">{name}</span>
          </button>
        );
      })}
    </div>
  );
}
