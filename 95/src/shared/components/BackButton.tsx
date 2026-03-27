import React from 'react';

interface BackButtonProps {
  href?: string;
  label?: string;
  onClick?: () => void;
}

export const BackButton: React.FC<BackButtonProps> = ({
  href = '../',
  label = '← Powrót',
  onClick,
}) => {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (onClick) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <a
      href={href}
      onClick={handleClick}
      className="back-button"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.5rem 1rem',
        color: 'inherit',
        textDecoration: 'none',
        borderRadius: '0.5rem',
        transition: 'opacity 0.2s',
      }}
    >
      {label}
    </a>
  );
};
