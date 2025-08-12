import React, { HTMLAttributes } from 'react';
import clsx from 'clsx';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md' | 'lg';
  rounded?: boolean;
  dot?: boolean;
  children: React.ReactNode;
}

const badgeVariants = {
  default: 'bg-gray-100 text-gray-800',
  primary: 'bg-primary-100 text-primary-800',
  secondary: 'bg-gray-100 text-gray-800',
  success: 'bg-green-100 text-green-800',
  warning: 'bg-yellow-100 text-yellow-800',
  error: 'bg-red-100 text-red-800',
  info: 'bg-blue-100 text-blue-800',
};

const badgeSizes = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
  lg: 'px-3 py-1.5 text-base',
};

const badgeDotVariants = {
  default: 'bg-gray-400',
  primary: 'bg-primary-600',
  secondary: 'bg-gray-400',
  success: 'bg-green-500',
  warning: 'bg-yellow-500',
  error: 'bg-red-500',
  info: 'bg-blue-500',
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  size = 'md',
  rounded = true,
  dot = false,
  className,
  children,
  ...props
}) => {
  return (
    <span
      className={clsx(
        // Base styles
        'inline-flex items-center font-medium',
        // Variant styles
        badgeVariants[variant],
        // Size styles
        badgeSizes[size],
        // Rounded styles
        rounded && 'rounded-full',
        !rounded && 'rounded-md',
        // Custom className
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={clsx(
            'w-2 h-2 rounded-full mr-1.5',
            badgeDotVariants[variant]
          )}
        />
      )}
      {children}
    </span>
  );
};

interface StatusBadgeProps extends Omit<BadgeProps, 'variant' | 'children'> {
  status: 'active' | 'inactive' | 'pending' | 'completed' | 'error' | 'warning' | 'success';
  children?: React.ReactNode;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  children,
  ...props
}) => {
  const statusVariantMap = {
    active: 'success' as const,
    inactive: 'default' as const,
    pending: 'warning' as const,
    completed: 'success' as const,
    error: 'error' as const,
    warning: 'warning' as const,
    success: 'success' as const,
  };

  const statusLabelMap = {
    active: 'Active',
    inactive: 'Inactive',
    pending: 'Pending',
    completed: 'Completed',
    error: 'Error',
    warning: 'Warning',
    success: 'Success',
  };

  return (
    <Badge
      variant={statusVariantMap[status]}
      dot
      {...props}
    >
      {children || statusLabelMap[status]}
    </Badge>
  );
};