import { TSchema, Type } from '@sinclair/typebox'
import { Nullable } from './base-model'

export type SiteConfig = {
  name: string;
  description: string;
  url: string;
  ogImage: string;
  mailSupport: string;
  links: {
    twitter: string;
    github: string;
  };
};
export type NavItem = {
  title: string;
  href: string;
  badge?: number;
  disabled?: boolean;
  external?: boolean;
  authorizeOnly?: UserRole;
  icon?: keyof typeof Icons;
};

export type MainNavItem = NavItem;

export type DocsConfig = {
  mainNav: MainNavItem[];
};
export type MarketingConfig = {
  mainNav: MainNavItem[];
};
export type SidebarNavItem = {
  title: string;
  items: NavItem[];
  authorizeOnly?: UserRole;
  icon?: keyof typeof Icons;
};

export type Cursor = string | null

export type SeekPage<T> = {
    next: Cursor
    previous: Cursor
    data: T[]
}

export const SeekPage = (t: TSchema): TSchema => Type.Object({
    data: Type.Array(t),
    next: Nullable(Type.String({ description: 'Cursor to the next page' })),
    previous: Nullable(Type.String({ description: 'Cursor to the previous page' })),
})
