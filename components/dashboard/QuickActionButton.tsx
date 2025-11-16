import React from 'react';
import { Button } from '@/components/ui/button';

interface QuickActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}

const QuickActionButton: React.FC<QuickActionButtonProps> = ({
  icon,
  label,
  onClick,
  disabled = false,
}) => {
  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      variant="outline"
      className="w-full justify-start"
    >
      <span className="mr-2">{icon}</span>
      {label}
    </Button>
  );
};

export default QuickActionButton;
