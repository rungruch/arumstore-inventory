"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, Dot, LucideIcon } from "lucide-react";
import { useAuth } from "@/app/contexts/AuthContext";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DropdownMenuArrow } from "@radix-ui/react-dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { usePathname } from "next/navigation";

// Maps submenu paths to permission module names
const submenuModuleMap: Record<string, {module: string, action: string}> = {
  "/users": { module: "users", action: "view" },
  "/finance": { module: "finance", action: "view" },
  "/finance/wallet": { module: "finance", action: "view" },
  "/finance/other-income": { module: "finance", action: "view" },
  "/finance/other-outcome": { module: "finance", action: "view" },
  "/products": { module: "products", action: "view" },
  "/products/categories": { module: "products", action: "view" },
  "/products/warehouse": { module: "products", action: "view" },
  "/contacts": { module: "customers", action: "view" },
  "/sales": { module: "sales", action: "view" },
  "/sales/create": { module: "sales", action: "create" },
  "/purchases": { module: "purchases", action: "view" },
  "/purchases/create": { module: "purchases", action: "create" },
  "/settings": { module: "settings", action: "view" },
};

type Submenu = {
  href: string;
  label: string;
  active?: boolean;
};

interface CollapseMenuButtonProps {
  icon: LucideIcon;
  label: string;
  active: boolean;
  submenus: Submenu[];
  isOpen: boolean | undefined;
}

export function CollapseMenuButton({
  icon: Icon,
  label,
  active,
  submenus,
  isOpen
}: CollapseMenuButtonProps) {
  const pathname = usePathname();
  const { hasPermission } = useAuth();
  
  // Filter submenus based on user permissions
  const filteredSubmenus = submenus.filter(submenu => {
    const mapping = submenuModuleMap[submenu.href];
    if (!mapping) return true; // If no mapping exists, allow access by default
    return hasPermission(mapping.module, mapping.action);
  });
  
  // If no submenus are visible after filtering, don't render anything
  if (filteredSubmenus.length === 0) return null;
  
  const isSubmenuActive = filteredSubmenus.some((submenu) =>
    submenu.active === undefined ? submenu.href === pathname : submenu.active
  );
  const [isCollapsed, setIsCollapsed] = useState<boolean>(isSubmenuActive);

  return isOpen ? (
    <Collapsible
      open={isCollapsed}
      onOpenChange={setIsCollapsed}
      className="w-full"
    >
      <CollapsibleTrigger
        className="[&[data-state=open]>div>div>svg]:rotate-180 mb-1"
        asChild
      >
        <Button
          variant={isSubmenuActive ? "secondary" : "ghost"}
          className="w-full justify-start h-10"
        >
          <div className="w-full items-center flex justify-between">
            <div className="flex items-center">
              <span className="mr-4">
                <Icon size={18} />
              </span>
              <p
                className={cn(
                  "max-w-[150px] truncate",
                  isOpen
                    ? "translate-x-0 opacity-100"
                    : "-translate-x-96 opacity-0"
                )}
              >
                {label}
              </p>
            </div>
            <div
              className={cn(
                "whitespace-nowrap",
                isOpen
                  ? "translate-x-0 opacity-100"
                  : "-translate-x-96 opacity-0"
              )}
            >
              <ChevronDown
                size={18}
                className="transition-transform duration-200"
              />
            </div>
          </div>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
        {filteredSubmenus.map(({ href, label, active }, index) => (
          <Button
            key={index}
            variant={
              (active === undefined && pathname === href) || active
                ? "secondary"
                : "ghost"
            }
            className="w-full justify-start h-10 mb-1"
            asChild
          >
            <Link href={href}>
              <span className="mr-4 ml-2">
                <Dot size={18} />
              </span>
              <p
                className={cn(
                  "max-w-[170px] truncate",
                  isOpen
                    ? "translate-x-0 opacity-100"
                    : "-translate-x-96 opacity-0"
                )}
              >
                {label}
              </p>
            </Link>
          </Button>
        ))}
      </CollapsibleContent>
    </Collapsible>
  ) : (
    <DropdownMenu>
      <TooltipProvider disableHoverableContent>
        <Tooltip delayDuration={100}>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant={isSubmenuActive ? "secondary" : "ghost"}
                className="w-full justify-start h-10 mb-1"
              >
                <div className="w-full items-center flex justify-between">
                  <div className="flex items-center">
                    <span className={cn(isOpen === false ? "" : "mr-4")}>
                      <Icon size={18} />
                    </span>
                    <p
                      className={cn(
                        "max-w-[200px] truncate",
                        isOpen === false ? "opacity-0" : "opacity-100"
                      )}
                    >
                      {label}
                    </p>
                  </div>
                </div>
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="right" align="start" alignOffset={2}>
            {label}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DropdownMenuContent side="right" sideOffset={25} align="start">
        <DropdownMenuLabel className="max-w-[190px] truncate">
          {label}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {filteredSubmenus.map(({ href, label, active }, index) => (
          <DropdownMenuItem key={index} asChild>
            <Link
              className={`cursor-pointer ${
                ((active === undefined && pathname === href) || active) &&
                "bg-secondary"
              }`}
              href={href}
            >
              <p className="max-w-[180px] truncate">{label}</p>
            </Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuArrow className="fill-border" />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
