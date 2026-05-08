import React from 'react';

interface StudentApplicationsSkeletonProps {
  isDarkMode?: boolean;
}

const StudentApplicationsSkeleton: React.FC<StudentApplicationsSkeletonProps> = ({
  isDarkMode = false,
}) => {
  const bg = isDarkMode ? '#222' : '#f3f3f3';
  const block = {
    height: 110,
    borderRadius: 12,
    background: bg,
    marginBottom: 16,
  } as React.CSSProperties;

  return (
    <div style={{ padding: 22 }}>
      {[1, 2, 3, 4].map((n) => (
        <div key={n} style={block} />
      ))}
    </div>
  );
};

export default StudentApplicationsSkeleton;
