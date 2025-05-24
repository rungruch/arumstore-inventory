'use client';

import Link from 'next/link';
import { ComponentProps } from 'react';
import { useNavigationLoading } from './navigation-loading-provider';

interface NavigationLinkProps extends ComponentProps<typeof Link> {
  showLoading?: boolean;
}

export function NavigationLink({ 
  href, 
  children, 
  showLoading = true, 
  onClick,
  ...props 
}: NavigationLinkProps) {
  const { navigate } = useNavigationLoading();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Call original onClick if provided
    if (onClick) {
      onClick(e);
      if (e.defaultPrevented) return;
    }

    // Only intercept internal navigation that should show loading
    if (showLoading && href) {
      const hrefString = href.toString();
      
      // Only for internal links (not external URLs, anchors, mailto, tel, etc.)
      if (hrefString.startsWith('/') && !hrefString.startsWith('/#')) {
        e.preventDefault();
        navigate(hrefString);
      }
    }
  };

  return (
    <Link href={href} onClick={handleClick} {...props}>
      {children}
    </Link>
  );
}
