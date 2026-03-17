export default function Pagination({ currentPage, onNext, onPrevious, totalPages }) {
  if (totalPages <= 1) return null;

  return (
    <nav className="pagination">
      <button type="button" disabled={currentPage <= 1} onClick={onPrevious}>
        Prev
      </button>
      <span>{currentPage} / {totalPages}</span>
      <button type="button" disabled={currentPage >= totalPages} onClick={onNext}>
        Next
      </button>
    </nav>
  );
}
