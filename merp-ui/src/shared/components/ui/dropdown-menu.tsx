import React, { useState, useRef, useEffect } from 'react';

export const DropdownMenu = ({ children }: { children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative inline-block">
      {React.Children.map(children, (child) =>
        React.isValidElement(child)
          ? React.cloneElement(child as React.ReactElement<any>, { isOpen, setIsOpen })
          : child
      )}
    </div>
  );
};

interface DropdownMenuTriggerProps {
  asChild?: boolean;
  children: React.ReactNode;
  isOpen?: boolean;
  setIsOpen?: (open: boolean) => void;
}

export const DropdownMenuTrigger = ({
  asChild,
  children,
  isOpen,
  setIsOpen,
}: DropdownMenuTriggerProps) => {
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      onClick: () => setIsOpen?.(!isOpen),
    } as any);
  }

  return (
    <button onClick={() => setIsOpen?.(!isOpen)} className="p-0">
      {children}
    </button>
  );
};

interface DropdownMenuContentProps {
  align?: 'start' | 'end';
  children: React.ReactNode;
  isOpen?: boolean;
  setIsOpen?: (open: boolean) => void;
}

export const DropdownMenuContent = ({
  align = 'start',
  children,
  isOpen,
}: DropdownMenuContentProps) => {
  if (!isOpen) return null;

  return (
    <div
      className={`absolute z-50 min-w-[160px] rounded-md border border-gray-200 bg-white shadow-lg py-1 ${
        align === 'end' ? 'right-0' : 'left-0'
      }`}
    >
      {children}
    </div>
  );
};

interface DropdownMenuItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export const DropdownMenuItem = ({
  children,
  onClick,
  className,
}: DropdownMenuItemProps) => {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors ${className}`}
    >
      {children}
    </button>
  );
};
