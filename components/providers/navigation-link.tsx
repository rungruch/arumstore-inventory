'use client';

import Link from 'next/link';
import { ComponentProps } from 'react';
import { useNavigationLoading } from './navigation-loading-provider';

interface NavigationLinkProps extends Omit<ComponentProps<typeof Link>, 'onClick'> {
  showLoading?: boolean;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

export function NavigationLink({ 
  href, 
  children, 
  showLoading = true, 
  onClick,
  ...props 
}: NavigationLinkProps) {
  const { navigateTo } = useNavigationLoading();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Call original onClick if provided
    if (onClick) {
      onClick(e);
      if (e.defaultPrevented) return;
    }

    if (showLoading && href) {
      e.preventDefault();
      navigateTo(href.toString());
    }
  };

  return (
    <Link href={href} onClick={handleClick} {...props}>
      {children}
    </Link>
  );
}
