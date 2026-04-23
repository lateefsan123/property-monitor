import Pagination from "../../seller-signal/components/Pagination";
import { BuildingRow, ListingHistoryRow } from "./ListingAlertsRows";

export default function ListingAlertsResults({
  alerts,
  count,
  countLabel,
  hasTrackedUnits,
  items,
  listingSafePage,
  listingTotalPages,
  listingVisibleEnd,
  listingVisibleStart,
  onNextPage,
  onOpenBuilding,
  onOpenListing,
  onOpenListingExternal,
  onPreviousPage,
  priceDropsByBuilding,
  selectedBuildingId,
  showEmpty,
  showRefreshingStrip,
  showSkeletonList,
  totalLiveListings,
  totalLiveListingsLabel,
  viewTab,
}) {
  return (
    <>
      <div className="la-results-bar">
        <span className="la-results-count">
          {viewTab === "listings" && totalLiveListings > count ? `${countLabel} loaded` : countLabel}
        </span>
        {viewTab === "listings" ? (
          <span className="la-results-meta">
            {totalLiveListings > 0 ? `${totalLiveListings} total live in ${totalLiveListingsLabel} - ` : ""}
            {count ? `Showing ${listingVisibleStart}-${listingVisibleEnd}` : "Showing 0"}
            {` - Page ${listingSafePage}/${listingTotalPages}`}
          </span>
        ) : null}
      </div>

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
        <div className="lead-table-wrap">
          <table className="lead-table">
            <thead>
              <tr>
                {viewTab === "buildings" ? (
                  <>
                    <th>Building</th>
                    <th>Listings</th>
                    <th>Price</th>
                    <th>Action</th>
                  </>
                ) : (
                  <>
                    <th style={{ width: 52 }}></th>
                    <th>Title</th>
                    <th>Building</th>
                    <th>Details</th>
                    <th>Price</th>
                    <th>Status</th>
                    <th>Link</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                if (viewTab === "buildings") {
                  const priceDropCount = priceDropsByBuilding.get(item.locationId) || 0;
                  return (
                    <BuildingRow
                      key={String(item.locationId || item.key || index)}
                      building={item}
                      isWatched={alerts.watchedSet?.has(item.locationId)}
                      watchDisabled={!alerts.watchedSet?.has(item.locationId) && alerts.stats.watchedBuildingCount >= alerts.watchLimit}
                      onToggleWatch={() => alerts.actions.toggleWatch(item)}
                      onPress={() => onOpenBuilding(item)}
                      priceDropCount={priceDropCount}
                    />
                  );
                }

                return (
                  <ListingHistoryRow
                    key={String(item.key || `${item.buildingKey || ""}-${item.id || index}`)}
                    listing={item}
                    onPress={() => onOpenListing(item)}
                    onOpenExternal={() => onOpenListingExternal(item.bayutUrl)}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
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
