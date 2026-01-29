import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  className?: string;
  'aria-label'?: string;
}

export function BackButton({
  className = '',
  'aria-label': ariaLabel = "Retour à la page précédente",
}: BackButtonProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(-1);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={
        className ||
        'w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors'
      }
      aria-label={ariaLabel}
    >
      <ArrowLeft size={20} />
    </button>
  );
}
