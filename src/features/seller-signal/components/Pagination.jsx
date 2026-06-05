import { IconArrowLeft, IconArrowRight } from "@tabler/icons-react";

export default function Pagination({ currentPage, onNext, onPrevious, totalPages }) {
  if (totalPages <= 1) return null;

  return (
    <nav className="pagination">
      <button type="button" disabled={currentPage <= 1} onClick={onPrevious}>
        <IconArrowLeft size={16} stroke={2} aria-hidden="true" />
        Prev
      </button>
      <span>{currentPage} / {totalPages}</span>
      <button type="button" disabled={currentPage >= totalPages} onClick={onNext}>
        Next
        <IconArrowRight size={16} stroke={2} aria-hidden="true" />
      </button>
    </nav>
  );
}
