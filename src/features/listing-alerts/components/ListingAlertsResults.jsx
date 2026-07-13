import Pagination from "../../seller-signal/components/Pagination";
import { useListingFavorites } from "../useListingFavorites";
import {
  BuildingCard,
  BuildingRow,
  ListingCard,
  ListingHistoryRow,
} from "./ListingAlertsRows";

export default function ListingAlertsResults({
  alerts,
  count,
  countLabel,
  hasTrackedUnits,
  items,
  layout = "list",
  listingSafePage,
  listingTotalPages,
  listingVisibleEnd,
  listingVisibleStart,
  onNextPage,
  onOpenBuilding,
  onOpenListing,
  onOpenListingExternal,
  onPreviousPage,
  onToggleWatchBuilding,
  priceDropsByBuilding,
  recentDropKeys,
  selectedBuildingId,
  showEmpty,
  showRefreshingStrip,
  showSkeletonList,
  totalLiveListings,
  viewTab,
}) {
  const hideBuildingName = Boolean(selectedBuildingId);
  const { favorites, pinned, toggleFavorite, togglePin } = useListingFavorites();

  return (
    <>
      {viewTab === "listings" ? (
        <div className="la-results-bar">
          <span className="la-results-count">
            {count < totalLiveListings ? `${countLabel} of ${totalLiveListings}` : countLabel}
          </span>
          {listingTotalPages > 1 ? (
            <span className="la-results-meta">
              {count ? `Showing ${listingVisibleStart}-${listingVisibleEnd}` : "Showing 0"}
              {` - Page ${listingSafePage}/${listingTotalPages}`}
            </span>
          ) : null}
        </div>
      ) : null}

      {showRefreshingStrip ? (
        <div className="la-refreshing-strip" role="status" aria-live="polite">
          <span className="la-refreshing-dot" />
          {!selectedBuildingId ? "Searching Bayut..." : "Refreshing listings..."}
        </div>
      ) : null}

      {showSkeletonList ? (
        <div className="la-list" aria-busy="true">
          {Array.from({ length: 6 }).map((_, index) => (
            <div className="la-list-item" key={`skeleton-${index}`}>
              <div className="skeleton-card">
                <div className="skeleton-card-row">
                  <div className="skeleton-avatar" />
                  <div className="skeleton-stack">
                    <div className="skeleton-bar tall medium" />
                    <div className="skeleton-bar short" />
                  </div>
                  <div className="skeleton-bar pill" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : showEmpty ? (
        <div className="la-empty">
          <div className="la-empty-title">
            {!selectedBuildingId ? "No buildings match" : "No listings match"}
          </div>
          <div className="la-empty-text">
            {!selectedBuildingId
              ? "Try a broader search term, or switch off the Watching filter."
              : hasTrackedUnits
                ? "Try another filter, or switch off Tracked only to browse more live units."
                : "No listings found for this building."}
          </div>
        </div>
      ) : (
        (() => {
          const gridClass = layout === "grid" ? "sheet-grid la-grid" : "sheet-list la-list-rows";

          function renderItem(item, index) {
            if (viewTab === "buildings") {
              const priceDropCount = priceDropsByBuilding.get(item.locationId) || 0;
              const favKey = `b:${item.locationId}`;
              const commonProps = {
                building: item,
                isWatched: alerts.watchedSet?.has(item.locationId),
                onPress: () => onOpenBuilding(item),
                onToggleWatch: () => onToggleWatchBuilding?.(item),
                priceDropCount,
                favorited: favorites.has(favKey),
                onToggleFavorite: () => toggleFavorite(favKey),
              };
              const key = String(item.locationId || item.key || index);
              return layout === "grid" ? (
                <BuildingCard key={key} {...commonProps} />
              ) : (
                <BuildingRow key={key} {...commonProps} />
              );
            }

            const favKey = `l:${item.id || item.key}`;
            const commonProps = {
              listing: item,
              hideBuildingName,
              onPress: () => onOpenListing(item),
              onOpenExternal: () => onOpenListingExternal(item.bayutUrl),
              favorited: favorites.has(favKey),
              pinned: pinned.has(favKey),
              onToggleFavorite: () => toggleFavorite(favKey),
              onTogglePin: () => togglePin(favKey),
            };
            const key = String(item.key || `${item.buildingKey || ""}-${item.id || index}`);
            return layout === "grid" ? (
              <ListingCard key={key} {...commonProps} />
            ) : (
              <ListingHistoryRow key={key} {...commonProps} />
            );
          }

          // Inside a building, lead with the recently-dropped listings under
          // their own heading; everything else keeps the same grid below.
          if (viewTab === "listings" && selectedBuildingId && recentDropKeys?.size) {
            const dropped = [];
            const rest = [];
            for (const item of items) {
              const itemKey = item.key || `${item.locationId}:${item.id}`;
              (recentDropKeys.has(itemKey) ? dropped : rest).push(item);
            }

            if (dropped.length) {
              return (
                <>
                  <div className="la-section-heading">
                    Dropped in price ({priceDropsByBuilding.get(selectedBuildingId) || dropped.length})
                  </div>
                  <div className={gridClass}>{dropped.map(renderItem)}</div>
                  {rest.length > 0 && (
                    <>
                      <div className="la-section-heading">All listings</div>
                      <div className={gridClass}>{rest.map(renderItem)}</div>
                    </>
                  )}
                </>
              );
            }
          }

          return <div className={gridClass}>{items.map(renderItem)}</div>;
        })()
      )}

      {viewTab === "listings" ? (
        <div className="la-pagination">
          <Pagination
            currentPage={listingSafePage}
            totalPages={listingTotalPages}
            onPrevious={onPreviousPage}
            onNext={onNextPage}
          />
        </div>
      ) : null}
    </>
  );
}
