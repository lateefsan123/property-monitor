import { useState } from 'react';
import { IconArrowDown, IconBuildingSkyscraper } from '@tabler/icons-react';
import { getBuildingImage } from '../building-images';
import { formatPriceRange } from '../formatters';

export default function BuildingListRow({ building, isWatched, onPress, priceDropCount, actions }) {
  const image = getBuildingImage(building.buildingName);
  const [failedImage, setFailedImage] = useState(null);
  const loadedCount = building?.listings?.length || 0;
  const countLine = isWatched
    ? loadedCount ? `${loadedCount} ${loadedCount === 1 ? 'listing' : 'listings'}` : 'No live listings'
    : building.fullPath || 'Bayut location';
  const priceLine = building.fetchError
    ? 'Live pricing unavailable'
    : building.lowestPrice != null || building.highestPrice != null
      ? formatPriceRange(building.lowestPrice, building.highestPrice) : 'Watch to load listings';
  return (
    <div className="la-building-row">
      <button type="button" className="la-building-open" onClick={onPress}>
        <span className="la-building-thumb" aria-hidden="true" title={image?.alt}>
          {image && failedImage !== image.src ? (
            <img src={image.src} alt="" width="64" height="64" loading="lazy" decoding="async"
              style={{ objectPosition: image.position }} onError={() => setFailedImage(image.src)} />
          ) : <IconBuildingSkyscraper size={24} stroke={1.8} />}
        </span>
        <span className="la-building-name">{building.buildingName}</span>
        <span className="la-building-count">{countLine}</span>
        <span className="la-building-price">{priceLine}</span>
        <span className="la-building-drops">
          {priceDropCount > 0 ? (
            <span className="la-drop-indicator">
              <IconArrowDown size={10} stroke={3} aria-hidden="true" />
              {priceDropCount} {priceDropCount === 1 ? 'drop' : 'drops'}
            </span>
          ) : null}
        </span>
      </button>
      {actions}
    </div>
  );
}
