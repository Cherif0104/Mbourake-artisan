import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface HomeButtonProps {
  className?: string;
}

export function HomeButton({ className = '' }: HomeButtonProps) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleClick = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/');
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={
        className ||
        'w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors'
      }
      aria-label="Retour à l'accueil"
    >
      <Home size={20} />
    </button>
  );
}

