import { useState } from "react";
import { Button } from "@/components/ui/button";
import {Input} from "@heroui/input";

type Product = {
    id: string;
    name: string;
    unitPrice: number;
  };
  
  type ProductSearchModalProps = {
    onClose: () => void;
    onSelect: (product: Product) => void;
  };
  
  const mockProducts = [
    { id: "P001", name: "Product 1", unitPrice: 500 },
    { id: "P002", name: "Product 2", unitPrice: 300 },
  ];
  
  export function ProductSearchModal({
    onClose,
    onSelect,
  }: ProductSearchModalProps) {
    const [searchTerm, setSearchTerm] = useState("");
  
    const filteredProducts = mockProducts.filter((product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  
    return (
      <div style={{ backgroundColor: "#00000066" }} className="fixed inset-0 flex items-center justify-center">
        <div className="bg-white p-4 rounded-lg shadow-lg w-96">
          <h2 className="text-lg font-semibold mb-4">เลือกสินค้า</h2>
          <Input
            placeholder="ค้นหาสินค้า"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mb-4"
          />
          <ul className="space-y-2">
            {filteredProducts.map((product) => (
              <li
                key={product.id}
                className="flex items-center justify-between p-2 border rounded-md"
              >
                <span>{product.name}</span>
                <Button
                  variant="outline"
                  onClick={() => onSelect(product)}
                  className="text-blue-500"
                >
                  เลือก
                </Button>
              </li>
            ))}
          </ul>
          <Button onClick={onClose} className="mt-4">
            ปิด
          </Button>
        </div>
      </div>
    );
  }
  