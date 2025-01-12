'use client'

import Image from 'next/image'
import { Platform } from '@prisma/client'
import { HTMLAttributes } from 'react'

interface PlatformCardProps extends HTMLAttributes<HTMLDivElement> {
  platform: Platform
  info: {
    name: string
    logo: string
    description: string
  }
  onClick: () => void
}

export function PlatformCard({ platform, info, onClick }: PlatformCardProps) {
  return (
    <div
      onClick={onClick}
      className="border p-4 h-[150px] w-[150px] flex flex-col items-center justify-center hover:bg-accent hover:text-accent-foreground cursor-pointer rounded-lg transition-colors relative group"
    >
      <div className="w-[40px] h-[40px] flex items-center justify-center relative">
        <Image
          src={info.logo}
          alt={info.name}
          width={40}
          height={40}
          className="object-contain group-hover:scale-110 transition-transform"
          onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            const parent = target.parentElement;
            const fallback = parent?.querySelector('.fallback-icon');
            if (fallback instanceof HTMLElement) {
              fallback.style.display = 'block';
            }
          }}
        />
        <div className="fallback-icon hidden">
          <div className="bg-muted rounded-full p-2">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
        </div>
      </div>
      <div className="mt-2 text-center">
        <div className="font-medium">{info.name}</div>
        <div className="text-xs text-muted-foreground mt-1">
          {info.description}
        </div>
      </div>
    </div>
  )
}
