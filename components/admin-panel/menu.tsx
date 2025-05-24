"use client";

import Link from "next/link";
import { Ellipsis } from "lucide-react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/app/contexts/AuthContext";

import { cn } from "@/lib/utils";
import { getMenuList } from "@/lib/menu-list";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CollapseMenuButton } from "@/components/admin-panel/collapse-menu-button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider
} from "@/components/ui/tooltip";

// Maps menu sections to permission module names
const menuModuleMap: Record<string, string> = {
  "Dashboard": "dashboard",
  "รายการขาย": "sales",
  "รายการซื้อ": "purchases",
  "สินค้า": "products",
  "ลูกค้า": "customers",
  "การเงิน": "finance",
  "บัญชี": "users",
  "ตั้งค่า": "settings"
};

interface MenuProps {
  isOpen: boolean | undefined;
}

export function Menu({ isOpen }: MenuProps) {
  const pathname = usePathname();
  const menuList = getMenuList(pathname);
  const { hasPermission } = useAuth();
  
  // Helper function to check multiple permissions
  const hasAllPermissions = (moduleKey: string, actions: string[]): boolean => {
    return actions.every(action => hasPermission(moduleKey, action as any));
  };
  
  // Check if user has permission for a menu item
  const hasMenuPermission = (label: string): boolean => {
    // Dashboard has no permission restrictions
    if (label === "Dashboard") return true;
    
    const moduleKey = menuModuleMap[label];
    if (!moduleKey) return true; // If no mapping exists, allow access by default
    
    // Settings requires ALL permissions
    if (label === "ตั้งค่า") {
      return hasAllPermissions(moduleKey, ['view', 'edit', 'create', 'delete']);
    }
    
    // Other modules just need view permission
    return hasPermission(moduleKey, 'view');
  };
  
  // Filter menus based on permissions
  const filterMenusByPermission = (menus: any[]) => {
    return menus.filter(menu => hasMenuPermission(menu.label));
  };

  return (
    <ScrollArea className="[&>div>div[style]]:!block">
      <nav className="mt-8 h-full w-full">
        <ul className="flex flex-col min-h-[calc(100vh-48px-36px-16px-32px)] lg:min-h-[calc(100vh-32px-40px-32px)] items-start space-y-1 px-2">
          {menuList.map(({ groupLabel, menus }, index) => {
            // Filter menus based on permissions
            const filteredMenus = filterMenusByPermission(menus);
            
            // Skip rendering this group if no menus are visible
            if (filteredMenus.length === 0) return null;
            
            return (
              <li className={cn("w-full", groupLabel ? "pt-5" : "")} key={index}>
                {(isOpen && groupLabel) || isOpen === undefined ? (
                  <p className="text-sm font-medium text-muted-foreground px-4 pb-2 max-w-[248px] truncate">
                    {groupLabel}
                  </p>
                ) : !isOpen && isOpen !== undefined && groupLabel ? (
                  <TooltipProvider>
                    <Tooltip delayDuration={100}>
                      <TooltipTrigger className="w-full">
                        <div className="w-full flex justify-center items-center">
                          <Ellipsis className="h-5 w-5" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>{groupLabel}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <p className="pb-2"></p>
                )}
                {filteredMenus.map(
                  ({ href, label, icon: Icon, active, submenus }, index) =>
                    !submenus || submenus.length === 0 ? (
                      <div className="w-full" key={index}>
                        <TooltipProvider disableHoverableContent>
                          <Tooltip delayDuration={100}>
                            <TooltipTrigger asChild>
                              <Button
                                variant={
                                  (active === undefined &&
                                    pathname.startsWith(href)) ||
                                  active
                                    ? "secondary"
                                    : "ghost"
                                }
                                className="w-full justify-start h-10 mb-1"
                                asChild
                              >
                                <Link href={href}>
                                  <span
                                    className={cn(isOpen === false ? "" : "mr-4")}
                                  >
                                    <Icon size={18} />
                                  </span>
                                  <p
                                    className={cn(
                                      "max-w-[200px] truncate",
                                      isOpen === false
                                        ? "-translate-x-96 opacity-0"
                                        : "translate-x-0 opacity-100"
                                    )}
                                  >
                                    {label}
                                  </p>
                                </Link>
                              </Button>
                            </TooltipTrigger>
                            {isOpen === false && (
                              <TooltipContent side="right">
                                {label}
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    ) : (
                      <div className="w-full" key={index}>
                        <CollapseMenuButton
                          icon={Icon}
                          label={label}
                          active={
                            active === undefined
                              ? pathname.startsWith(href)
                              : active
                          }
                          submenus={submenus}
                          isOpen={isOpen}
                        />
                      </div>
                    )
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    </ScrollArea>
  );
}
