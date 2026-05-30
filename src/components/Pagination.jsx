import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage,
  onItemsPerPageChange,
  itemsPerPageOptions = [5, 10, 20, 50],
}) => {
  if (totalPages <= 0) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      pageNumbers.push(1);

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      if (start > 2) {
        pageNumbers.push('...');
      }

      for (let i = start; i <= end; i++) {
        pageNumbers.push(i);
      }

      if (end < totalPages - 1) {
        pageNumbers.push('...');
      }

      pageNumbers.push(totalPages);
    }

    return pageNumbers;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-6 bg-white border-t border-gray-100 rounded-b-lg select-none">
      {/* Items Per Page Selector */}
      <div className="flex items-center gap-2">
        {onItemsPerPageChange && (
          <>
            <span className="text-xs sm:text-sm text-gray-500 font-medium">Show</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                onItemsPerPageChange(Number(e.target.value));
              }}
              className="h-8 border border-gray-200 rounded-lg text-xs bg-white px-2 py-1 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all font-semibold text-gray-700 cursor-pointer"
            >
              {itemsPerPageOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <span className="text-xs sm:text-sm text-gray-500 font-medium">entries</span>
          </>
        )}
      </div>

      {/* Item Range Info */}
      <div className="text-xs sm:text-sm text-gray-500 font-medium">
        Showing <span className="font-semibold text-gray-700">{totalItems === 0 ? 0 : startItem}</span> to{' '}
        <span className="font-semibold text-gray-700">{endItem}</span> of{' '}
        <span className="font-semibold text-gray-700">{totalItems}</span> entries
      </div>

      {/* Page Navigation Controls */}
      <div className="flex items-center gap-1 sm:gap-1.5">
        {/* First Page Button */}
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="h-8 w-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:text-green-600 hover:bg-green-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none transition-all duration-200"
          title="First Page"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>

        {/* Previous Page Button */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="h-8 w-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:text-green-600 hover:bg-green-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none transition-all duration-200"
          title="Previous Page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Page Number Buttons */}
        <div className="flex items-center gap-1">
          {getPageNumbers().map((page, index) => {
            if (page === '...') {
              return (
                <span
                  key={`ellipsis-${index}`}
                  className="h-8 w-8 flex items-center justify-center text-gray-400 text-sm font-medium"
                >
                  ...
                </span>
              );
            }

            return (
              <button
                key={`page-${page}`}
                onClick={() => onPageChange(page)}
                className={`h-8 w-8 flex items-center justify-center rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 ${
                  currentPage === page
                    ? 'bg-green-600 hover:bg-green-700 text-white shadow-sm shadow-green-100 scale-105'
                    : 'text-gray-600 hover:text-green-600 hover:bg-green-50 border border-gray-200'
                }`}
              >
                {page}
              </button>
            );
          })}
        </div>

        {/* Next Page Button */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="h-8 w-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:text-green-600 hover:bg-green-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none transition-all duration-200"
          title="Next Page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Last Page Button */}
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="h-8 w-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:text-green-600 hover:bg-green-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none transition-all duration-200"
          title="Last Page"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
