const PREVIEW_IMAGES = {
  "preview-sellers": "/home-sellers.png",
  "preview-listings": "/home-listings.png",
  "preview-spreadsheets": "/home-spreadsheets.png",
};

export default function TilePreview({ kind }) {
  const src = PREVIEW_IMAGES[kind] || PREVIEW_IMAGES["preview-spreadsheets"];
  const previewClass = PREVIEW_IMAGES[kind] ? kind : "preview-spreadsheets";

  return (
    <div className={`tile-preview ${previewClass}`}>
      <img
        className={`${previewClass}-img`}
        src={src}
        alt=""
        loading="lazy"
      />
    </div>
  );
}
