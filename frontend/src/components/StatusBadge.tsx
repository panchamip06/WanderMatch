import React from 'react';

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const s = status.toLowerCase();

  let colorClasses = 'bg-gray-100 text-gray-800 border-gray-200';
  if (s === 'confirmed' || s === 'accepted') {
    colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  } else if (s === 'voting' || s === 'open') {
    colorClasses = 'bg-blue-50 text-blue-700 border-blue-200';
  } else if (s === 'common-ground' || s === 'proposing') {
    colorClasses = 'bg-purple-50 text-purple-700 border-purple-200';
  } else if (s === 'branching') {
    colorClasses = 'bg-amber-50 text-amber-700 border-amber-200';
  } else if (s === 'rejected' || s === 'expired') {
    colorClasses = 'bg-rose-50 text-rose-700 border-rose-200';
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${colorClasses}`}>
      {status}
    </span>
  );
};
