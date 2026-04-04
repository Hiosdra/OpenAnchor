import React, { useState, useEffect, useRef } from 'react';
import { Icon } from './Icon';

interface DropdownProps {
  label: string;
  icon?: string;
  children: React.ReactNode;
  isNightMode: boolean;
  buttonClassName?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
  label,
  icon,
  children,
  isNightMode,
  buttonClassName = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuId = useRef(`dropdown-menu-${Math.random().toString(36).slice(2, 11)}`);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen]);

  const closeDropdown = () => setIsOpen(false);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-2 px-3 py-2.5 min-h-[44px] rounded-lg transition border ${buttonClassName || (isNightMode ? 'border-red-800 hover:bg-red-950 text-red-500' : 'bg-sky-600 border-sky-500 hover:bg-sky-500 text-white')}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={menuId.current}
        aria-label={label}
      >
        {icon && <Icon name={icon} className="w-5 h-5" aria-hidden="true" />}
        {label && <span className="hidden sm:inline">{label}</span>}
        <Icon name="ChevronDown" className="w-4 h-4" aria-hidden="true" />
      </button>
      {isOpen && (
        <div
          id={menuId.current}
          role="menu"
          className={`absolute right-0 mt-2 w-56 rounded-lg shadow-lg z-50 border ${isNightMode ? 'bg-zinc-900 border-red-900' : 'bg-white border-slate-200 text-slate-800'}`}
        >
          <div className="py-1">
            {React.Children.map(children, (child) =>
              React.isValidElement<{ closeDropdown?: () => void }>(child)
                ? React.cloneElement(child, { closeDropdown })
                : child,
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface DropdownItemProps {
  onClick?: () => void;
  icon: string;
  label: string;
  disabled?: boolean;
  isNightMode: boolean;
  closeDropdown?: () => void;
}

export const DropdownItem: React.FC<DropdownItemProps> = ({
  onClick,
  icon,
  label,
  disabled = false,
  isNightMode,
  closeDropdown,
}) => {
  const handleClick = () => {
    if (!disabled && onClick) {
      onClick();
      if (closeDropdown) closeDropdown();
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      role="menuitem"
      className={`w-full flex items-center space-x-2 px-4 py-2.5 text-left transition ${
        disabled
          ? isNightMode
            ? 'opacity-40 cursor-not-allowed text-red-700'
            : 'opacity-40 cursor-not-allowed text-slate-400'
          : isNightMode
            ? 'hover:bg-red-950 text-red-500'
            : 'hover:bg-slate-100 text-slate-800'
      }`}
    >
      <Icon name={icon} className="w-5 h-5" aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
};
