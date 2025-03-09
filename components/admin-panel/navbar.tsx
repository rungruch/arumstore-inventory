"use client";

import { usePathname } from "next/navigation";
import { ModeToggle } from "@/components/mode-toggle";
import { UserNav } from "@/components/admin-panel/user-nav";
import { SheetMenu } from "@/components/admin-panel/sheet-menu";
import { getMenuList } from "@/lib/menu-list";

interface NavbarProps {}

export function Navbar({}: NavbarProps) {
  const pathname = usePathname(); // Get the current pathname
  const menuList = getMenuList(pathname); // Get the menu list dynamically based on the current route

  return (
    <header className="sticky top-0 z-10 w-full bg-background/95 shadow backdrop-blur supports-[backdrop-filter]:bg-background/60 dark:shadow-secondary">
      <div className="mx-4 sm:mx-8 flex h-14 items-center">
        <div className="flex items-center space-x-4 lg:space-x-0">
          {/* Sheet Menu */}
          <SheetMenu />
          {/* Current Page Title */}
          <h1 className="font-bold text-lg">
            {/* Display the first matching active menu or default to "G" */}
            {menuList
              .flatMap((group) => group.menus)
              .find((menu) =>
                menu.submenus
                  ? menu.submenus.some((submenu) => submenu.href === pathname)
                  : menu.href === pathname
              )?.label || "G"}
          </h1>
        </div>
        <div className="flex flex-1 items-center justify-end">
          <ModeToggle />
          <UserNav />
        </div>
      </div>
    </header>
  );
}
