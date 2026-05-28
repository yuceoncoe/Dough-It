import React from 'react';

export type IconName = 
  | 'home'
  | 'calendar_today' // Calendar
  | 'check'
  | 'chevron_left'
  | 'chevron_right'
  | 'schedule' // Clock
  | 'visibility' // Eye
  | 'visibility_off' // EyeOff
  | 'lock'
  | 'progress_activity' // Loader2
  | 'login'
  | 'logout'
  | 'dark_mode' // Moon
  | 'brush' // Paintbrush
  | 'edit' // Pencil
  | 'add' // Plus
  | 'sync' // RefreshCw
  | 'settings'
  | 'auto_awesome' // Sparkles
  | 'star'
  | 'light_mode' // SunMedium
  | 'delete' // Trash2
  | 'person_add' // UserPlus
  | 'close' // X
  | 'bolt' // Zap
  | 'error_outline'; // AlertCircle

interface IconProps extends React.HTMLAttributes<HTMLSpanElement> {
  name: IconName | string;
  size?: number | string;
  className?: string;
}

export function Icon({ name, size = 24, className = '', style, ...props }: IconProps) {
  return (
    <span
      className={`material-symbols-rounded ${className}`}
      style={{
        fontSize: typeof size === 'number' ? `${size}px` : size,
        lineHeight: 1,
        ...style,
      }}
      aria-hidden="true"
      {...props}
    >
      {name}
    </span>
  );
}
