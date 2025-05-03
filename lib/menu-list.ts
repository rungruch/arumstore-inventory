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
              href: "/customers",
              label: "ผู้ติดต่อ"
            },
            {
              href: "/customers/groups",
              label: "กลุ่มลูกค้า"
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
          label: "Users",
          icon: Users
        },
        {
          href: "/account",
          label: "Account",
          icon: Settings
        }
      ]
    }
  ];
}
