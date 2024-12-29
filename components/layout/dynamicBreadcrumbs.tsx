'use client';

import { usePathname } from 'next/navigation';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import React from 'react';

function generateBreadcrumbs(pathname: string) {
  const paths = pathname.split('/').filter(Boolean);
  let currentPath = '';
  return [
    { href: '/', label: 'Whatsappier', isLast: paths.length === 0 },
    ...paths.map((path, index) => {
      currentPath += `/${path}`;
      return {
        href: currentPath,
        label: path.charAt(0).toUpperCase() + path.slice(1),
        isLast: index === paths.length - 1
      };
    })
  ];
}

export function BreadcrumbNavigation() {
  const pathname = usePathname();
  const breadcrumbs = generateBreadcrumbs(pathname);

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {breadcrumbs.map((crumb, index) => (
          <React.Fragment key={crumb.href}>
            <BreadcrumbItem>
              {crumb.isLast ? (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {index < breadcrumbs.length - 1 && (
              <BreadcrumbSeparator />
            )}
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
