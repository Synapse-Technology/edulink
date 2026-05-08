import React from 'react';
import styled from 'styled-components';

const Wrap = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 16px;
`;

const Btn = styled.button<{ $active?: boolean }>`
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: ${p => (p.$active ? 'var(--accent-dim)' : 'var(--white)')};
  color: var(--navy);
  cursor: pointer;
`;

const Info = styled.span`
  color: var(--steel);
  font-size: 13px;
`;

interface Props {
  count: number;
  page?: number;
  pageSize?: number;
  next?: string | null;
  previous?: string | null;
  onPageChange: (page: number) => void;
}

export const PaginationControls: React.FC<Props> = ({ count, page = 1, pageSize = 10, next, previous, onPageChange }) => {
  const totalPages = Math.max(1, Math.ceil(count / pageSize));
  const hasPrevious = Boolean(previous) && page > 1;
  const hasNext = Boolean(next) && page < totalPages;

  const goPrev = () => {
    if (page > 1) onPageChange(page - 1);
  };

  const goNext = () => {
    if (page < totalPages) onPageChange(page + 1);
  };

  // Render simple pager with prev/next and current page
  return (
    <Wrap>
      <Info>{count} results</Info>
      <Btn onClick={goPrev} disabled={!hasPrevious} aria-label="Previous page">Prev</Btn>
      <Btn $active>{page} / {totalPages}</Btn>
      <Btn onClick={goNext} disabled={!hasNext} aria-label="Next page">Next</Btn>
    </Wrap>
  );
};

export default PaginationControls;
