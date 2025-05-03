"use client";

import { JSX, useState } from "react";
import { FaShoppingCart, FaChartBar, FaCog, FaUsers, FaBoxOpen } from "react-icons/fa";
import { MdOutlineShoppingCart, MdAttachMoney } from "react-icons/md";
import Link from "next/link";
import { usePathname } from "next/navigation"; // Import the usePathname hook

interface MenuItem {
  title: string;
  icon: JSX.Element;
  subMenu?: { title: string; path: string }[];
}

const menuItems: MenuItem[] = [
  {
    title: "Dashboard",
    icon: <FaChartBar />,
    subMenu: [
      { title: "ภาพรวม", path: "/dashboard"},
      { title: "ยอดขาย", path: "/dashboard/sales" },
      { title: "ยอดซื้อ", path: "/dashboard/purchases" },
      { title: "สินค้า", path: "/dashboard/products" },
      { title: "ลูกค้า", path: "/dashboard/customers" }
    ]
  },
  {
    title: "รายการซื้อ",
    icon: <MdOutlineShoppingCart />,
    subMenu: [
      { title: "สร้างรายการซื้อ", path: "/purchases/create" },
      { title: "ดูรายการซื้อ", path: "/purchases" }
    ]
  },
  {
    title: "รายการขาย",
    icon: <MdAttachMoney />,
    subMenu: [
      { title: "ดูรายการขาย", path: "/sales" },
      { title: "สร้างรายการขาย", path: "/sales/create" },
    ]
  },
  {
    title: "สินค้า",
    icon: <FaBoxOpen />,
    subMenu: [
      { title: "สินค้า", path: "/products" },
      { title: "เพิ่มสินค้า", path: "/products/add" },
      // { title: "กลุ่มสินค้า", path: "/products/template" },
      { title: "หมวดหมู่", path: "/products/categories" },
      { title: "คลังสินค้า", path: "/products/warehouse" },
      { title: "โอนสินค้า", path: "/products/addtransfer" }
    ]
  },
  {
    title: "ลูกค้า",
    icon: <FaUsers />,
    subMenu: [
      { title: "ผู้ติดต่อ", path: "/customers" },
      { title: "กลุ่มลูกค้า", path: "/customers/groups" }
    ]
  },
  {
    title: "การเงิน",
    icon: <FaShoppingCart />,
    subMenu: [
      { title: "ภาพรวม", path: "/finance" },
      { title: "กระเป๋าเงิน", path: "/finance/wallet" },
      { title: "รายได้อื่น", path: "/finance/other-income" },
      { title: "รายจ่ายอื่น", path: "/finance/other-outcome" }
    ]
  },
  {
    title: "ตั้งค่า",
    icon: <FaCog />,
    subMenu: [
      { title: "การตั้งค่า", path: "/settings" }
    ]
  }
];

const Sidebar: React.FC = () => {
  const pathname = usePathname(); // Get the current path
  const [expandedMenus, setExpandedMenus] = useState<{ [key: string]: boolean }>({});

  const toggleSubMenu = (title: string) => {
    setExpandedMenus((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  return (
    <div className="w-64 min-h-screen bg-gray-100 p-5 overflow-y-auto"> {/* Ensure sidebar covers full height and is scrollable */}
      <h1 className="text-xl font-bold mb-5">ARUM</h1>
      <ul>
        {menuItems.map((item) => (
          <li key={item.title}>
            <div
              className="flex items-center justify-between p-2 cursor-pointer text-gray-700 hover:bg-gray-200 rounded-lg"
              onClick={() => {
                if (item.subMenu) toggleSubMenu(item.title);
              }}
            >
              <div className="flex items-center space-x-3">
                <span className="text-lg">{item.icon}</span>
                <span>{item.title}</span>
              </div>
              {item.subMenu && (
                <span>{expandedMenus[item.title] ? "▼" : "►"}</span>
              )}
            </div>

            {item.subMenu && expandedMenus[item.title] && (
              <ul className="ml-5">
                {item.subMenu.map((sub) => (
                  <li
                    key={sub.title}
                    className={`p-2 cursor-pointer ${pathname === sub.path ? "text-blue-600 font-semibold" : "text-gray-700"} hover:bg-gray-200 rounded-lg`}
                  >
                    {/* Link now uses subMenu's path */}
                    <Link href={sub.path} passHref>
                      <div className="block w-full p-2 cursor-pointer rounded-lg">
                        {sub.title}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Sidebar;
