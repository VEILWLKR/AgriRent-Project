import React from 'react';
import { EquipmentCategory } from '../types';

interface CategoryIconProps {
  category: EquipmentCategory;
  className?: string;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ category, className = "w-5 h-5 stroke-[1.75]" }) => {
  switch (category) {
    case 'Tractors':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="6" cy="18" r="3" />
          <circle cx="17.5" cy="16.5" r="4.5" />
          <path d="M9 18h4" />
          <path d="M14 12V6a1 1 0 0 0-1-1H9L6 9v3" />
          <path d="M9 5v4" />
          <path d="M6 12h8" />
          <path d="M18 7h2v3" />
        </svg>
      );
    case 'Harvesters':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="7" cy="17" r="3" />
          <circle cx="17" cy="17" r="3" />
          <path d="M2 14h6l2-6h6l2 4h4" />
          <path d="M10 8h4" />
          <path d="M4 14l-2 3" />
          <path d="M22 17v-4" />
          <path d="M10 17h4" />
        </svg>
      );
    case 'Irrigation':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
          <path d="M12 9v5" />
          <path d="M9.5 11.5L12 9l2.5 2.5" />
        </svg>
      );
    case 'Tillers':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M3 8h18" />
          <path d="M5 8v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8" />
          <path d="M8 16l-2 5" />
          <path d="M12 16v5" />
          <path d="M16 16l2 5" />
          <circle cx="12" cy="5" r="2" />
        </svg>
      );
    case 'Planters':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="6" cy="18" r="2" />
          <circle cx="18" cy="18" r="2" />
          <path d="M6 16V9l6-4 6 4v7" />
          <path d="M12 5v13" />
          <path d="M8 12h8" />
        </svg>
      );
    case 'Trailers':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="8" cy="18" r="3" />
          <circle cx="16" cy="18" r="3" />
          <path d="M2 12h2v3h14v-3h4" />
          <path d="M4 12V7a1 1 0 0 1 1-1h13a1 1 0 0 1 1 1v5" />
          <path d="M11 18h2" />
        </svg>
      );
    case 'Ploughs':
    case 'Cultivators':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M4 5h7l2 5h7" /><path d="M11 5v5" /><path d="M13 10l-3 9" /><path d="M17 10l-1 9" /><path d="M6 19h13" /><circle cx="5" cy="19" r="2" />
        </svg>
      );
    case 'Sprayers':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M5 18h9a2 2 0 0 0 2-2V8H7a2 2 0 0 0-2 2z" /><path d="M9 8V5h7" /><path d="M16 5l4-2" /><path d="M19 7l3 1M19 10l3 2M19 13l2 3" /><circle cx="7" cy="20" r="2" /><circle cx="15" cy="20" r="2" />
        </svg>
      );
    case 'Seeders':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M4 7h16M6 7v8M18 7v8M4 15h16" /><path d="M8 15l-2 5M12 15v5M16 15l2 5" /><path d="M9 3h6l1 4H8z" /><circle cx="6" cy="21" r="1" /><circle cx="18" cy="21" r="1" />
        </svg>
      );
    case 'Threshers':
    case 'Shellers':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <rect x="4" y="6" width="14" height="12" rx="2" /><path d="M8 6V3h6v3M18 10h3v7h-3M7 18v3M14 18v3" /><path d="M8 11h6M8 14h4" />
        </svg>
      );
    case 'Balers':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="9" cy="15" r="5" /><path d="M14 11h5l2 4v4h-7M4 20h16M9 10V5h8l2 6" /><path d="M7 15h4M9 13v4" />
        </svg>
      );
    default:
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <rect x="3" y="3" width="18" height="18" rx="2" />
        </svg>
      );
  }
};
