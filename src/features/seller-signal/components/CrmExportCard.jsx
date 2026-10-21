import { useRef } from "react";
import "../../../styles/crm-export-card.css";

// The seller export browser extension (extensions/table-export) and its how-to
// video, both served from public/: agents collect sellers from their CRM and
// get a spreadsheet per building, which they then add here.
export const CRM_EXPORT_DOWNLOAD = "/downloads/repeat-ai-seller-export.zip";
export const CRM_EXPORT_VIDEO = "/video/seller-export-how-to.mp4";

export default function CrmExportCard() {
  const dialog = useRef(null);
  const video = useRef(null);
  function close() {
    video.current?.pause();
    dialog.current?.close();
  }
  return (
    <section className="crm-export" aria-labelledby="crm-export-title">
      <div className="crm-export-text">
        <h2 id="crm-export-title">Export sellers from your CRM</h2>
        <p>Get your sellers as spreadsheets, one for each building, then add them here.</p>
      </div>
      <div className="crm-export-actions">
        <a className="crm-export-get" href={CRM_EXPORT_DOWNLOAD} download>Get the extension</a>
        <button type="button" className="crm-export-watch" onClick={() => dialog.current?.showModal()}>Watch how it works</button>
      </div>
      <dialog ref={dialog} className="crm-export-dialog" aria-label="How to export sellers from your CRM" onClose={() => video.current?.pause()}
        onClick={(event) => { if (event.target === dialog.current) close(); }}>
        <video ref={video} src={CRM_EXPORT_VIDEO} controls playsInline preload="none" />
        <div className="crm-export-dialog-foot">
          <a className="crm-export-get" href={CRM_EXPORT_DOWNLOAD} download>Get the extension</a>
          <button type="button" className="crm-export-watch" onClick={close}>Close</button>
        </div>
      </dialog>
    </section>
  );
}
