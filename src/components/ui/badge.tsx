import * as React from 'react'
import { cn } from '@/lib/utils'

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info'
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        {
          'border-transparent bg-primary text-primary-foreground shadow': variant === 'default',
          'border-transparent bg-secondary text-secondary-foreground': variant === 'secondary',
          'border-transparent bg-destructive text-destructive-foreground shadow': variant === 'destructive',
          'text-foreground': variant === 'outline',
          'border-transparent bg-green-500/15 text-green-700 dark:text-green-400': variant === 'success',
          'border-transparent bg-yellow-500/15 text-yellow-700 dark:text-yellow-400': variant === 'warning',
          'border-transparent bg-blue-500/15 text-blue-700 dark:text-blue-400': variant === 'info'
        },
        className
      )}
      {...props}
    />
  )
}

export { Badge }
