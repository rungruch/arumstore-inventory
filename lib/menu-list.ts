import {
  Package,
  Tag,
  User2,
  Users,
  Settings,
  ShoppingCart,
  DollarSign,
  LayoutGrid,
  LucideIcon
} from "lucide-react";

type Submenu = {
  href: string;
  label: string;
  active?: boolean;
};

type Menu = {
  href: string;
  label: string;
  active?: boolean;
  icon: LucideIcon;
  submenus?: Submenu[];
};

type Group = {
  groupLabel: string;
  menus: Menu[];
};

export function getMenuList(pathname: string): Group[] {
  return [
    {
      groupLabel: "",
      menus: [
        {
          href: "",
          label: "Dashboard",
          icon: LayoutGrid,
          submenus: [{
            href: "/dashboard",
            label: "ภาพรวม"
          },
          {
            href: "/dashboard/sales",
            label: "ยอดขาย"
          },
          {
            href: "/dashboard/purchases",
            label: "ยอดซื้อ"
          },
          {
            href: "/dashboard/products",
            label: "สินค้า"
          },
          {
            href: "/dashboard/customers",
            label: "ลูกค้า"
          }
        ]
        }
      ]
    },
    {
      groupLabel: "Contents",
      menus: [
        {
          href: "",
          label: "รายการซื้อ",
          icon: ShoppingCart,
          submenus: [
            {
              href: "/purchases",
              label: "ดูรายการซื้อ"
            },
            {
              href: "/purchases/create",
              label: "สร้างรายการซื้อ"
            }
          ]
        },
        {
          href: "",
          label: "รายการขาย",
          icon: Package,
          submenus: [
            {
              href: "/sales",
              label: "ดูรายการขาย"
            },
            {
              href: "/sales/create",
              label: "สร้างรายการขาย"
            }
          ]
        },
        {
          href: "",
          label: "สินค้า",
          icon: Tag,
          submenus: [{
            href: "/products",
            label: "สินค้า"
          },
          {
            href: "/products/add",
            label: "เพิ่มสินค้า"
          },
          // {
          //   href: "/products/template",
          //   label: "กลุ่มสินค้า"
          // },
          {
            href: "/products/categories",
            label: "หมวดหมู่"
          },
          {
            href: "/products/warehouse",
            label: "คลังสินค้า"
          },
          {
            href: "/products/addtransfer",
            label: "โอนสินค้า"
          }

        ]
        },
        {
          href: "",
          label: "ลูกค้า",
          icon: User2,
          submenus: [
            {
              href: "/contacts",
              label: "ผู้ติดต่อ"
            }
          ]
        },
        {
          href: "",
          label: "การเงิน",
          icon: DollarSign,
          submenus: [
            {
              href: "/finance",
              label: "ภาพรวม"
            },
            {
              href: "/finance/wallet",
              label: "กระเป๋าเงิน"
            },
            {
              href: "/finance/other-income",
              label: "รายได้อื่น"
            },
            {
              href: "/finance/other-outcome",
              label: "รายจ่ายอื่น"
            }
          ]
        }
      ]
    },
    {
      groupLabel: "Settings",
      menus: [
        {
          href: "/users",
          label: "บัญชี",
          icon: Users
        },
        {
          href: "/settings",
          label: "ตั้งค่า",
          icon: Settings,
        },
        {
          href: "/admin/user-tracking",
          label: "การติดตามผู้ใช้",
          icon: Users
        }
      ]
    }
  ];
}

// Helper to extract permission modules and actions from menu-list
export function getPermissionModulesAndActions() {
  // Define standard actions for all modules
  const standardActions = ['view', 'create', 'edit', 'delete'];
  // Map menu labels to permission keys
  const menuToPermissionKey: Record<string, string> = {
    'รายการซื้อ': 'purchases',
    'รายการขาย': 'sales',
    'สินค้า': 'products',
    'ลูกค้า': 'customers',
    'การเงิน': 'finance',
    'บัญชี': 'users',
    'ตั้งค่า': 'settings',
    'Dashboard': 'dashboard',
    'การติดตามผู้ใช้': 'users',
  };
  const groups = getMenuList('');
  const modules: { key: string; label: string; actions: string[] }[] = [];
  groups.forEach(group => {
    group.menus.forEach(menu => {
      const key = menuToPermissionKey[menu.label] || menu.label.toLowerCase();
      if (!modules.find(m => m.key === key)) {
        modules.push({ key, label: menu.label, actions: standardActions });
      }
    });
  });
  return modules;
}
