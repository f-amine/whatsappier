'use client'

import { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"

interface OrangeGradientCardProps {
  children?: ReactNode
  className?: string
  variant?: 'default' | 'accent' | 'subtle'
  direction?: 'horizontal' | 'vertical' | 'radial'
  header?: ReactNode
  footer?: ReactNode
  cardClassName?: string
}

export function OrangeGradientCard({
  children,
  className,
  variant = 'default',
  direction = 'horizontal',
  header,
  footer,
  cardClassName
}: OrangeGradientCardProps) {
  // Enhanced variant definitions with more contrast between them
  const variants = {
    default: 'from-orange-500 to-amber-400',
    accent: 'from-orange-600 via-amber-500 to-yellow-400',
    subtle: 'from-orange-300/60 to-amber-200/60',
  }
  
  const sizes = {
    sm: 'h-auto min-h-32 w-full max-w-xs',
    md: 'h-auto min-h-64 w-full max-w-md',
    lg: 'h-auto min-h-96 w-full max-w-lg',
    full: 'h-full w-full'
  }
  
  const directions = {
    horizontal: 'bg-gradient-to-r',
    vertical: 'bg-gradient-to-b',
    radial: 'bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))]'
  }
  
  // Different opacity and blur based on variant
  const opacityAndBlur = {
    default: 'opacity-60 blur-[28px]',
    accent: 'opacity-80 blur-[32px]',
    subtle: 'opacity-40 blur-[24px]',
  }
  
  // Different backdrop blur based on variant
  const backdropBlur = {
    default: 'bg-background/60 backdrop-blur-sm',
    accent: 'bg-background/50 backdrop-blur-md',
    subtle: 'bg-background/70 backdrop-blur-sm',
  }
  
  // Different decorative elements based on variant
  const decorativeElements = variant === 'accent';
  
  return (
    <div className={cn("relative h-full", className)}>
      <div className={cn(
        'absolute -z-10 rounded-lg inset-0',
        directions[direction],
        variants[variant],
        opacityAndBlur[variant],
      )} />
      
      <Card className={cn(
        backdropBlur[variant],
        "border border-muted relative z-10 overflow-hidden h-full",
        cardClassName
      )}>
        {header && <CardHeader>{header}</CardHeader>}
        {children && <CardContent className="flex-grow">{children}</CardContent>}
        {footer && <CardFooter>{footer}</CardFooter>}
      
        {/* Decorative elements - only shown for accent variant */}
        {decorativeElements && (
          <>
            <div className="orange-gradient-highlight absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px" />
            <div className="orange-gradient-glow absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-1 rounded-full opacity-60" />
            <div className="orange-soft-blur absolute -top-20 left-1/2 -translate-x-1/2 w-40 h-40 rounded-full opacity-40" />
          </>
        )}
        
        {/* Subtle highlight for all variants */}
        <div className="orange-subtle-highlight absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px opacity-40" />
      </Card>
      
      <style jsx>{`
        .orange-gradient-highlight {
          background: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0) 0%,
            rgba(251, 146, 60, 0.8) 50%,
            rgba(255, 255, 255, 0) 100%
          );
        }
        
        .orange-gradient-glow {
          background: #fb923c;
          filter: blur(6px);
        }
        
        .orange-soft-blur {
          background: #fb923c;
          filter: blur(40px);
        }
        
        .orange-subtle-highlight {
          background: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0) 0%,
            rgba(251, 146, 60, 0.4) 50%,
            rgba(255, 255, 255, 0) 100%
          );
        }
      `}</style>
    </div>
  )
}
