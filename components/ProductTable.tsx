import { Timestamp } from "firebase/firestore";
import Image from "next/image";


export default function ProductTable({ products }: { products: any }) {

    const getTotalStock = (stocks: Record<string, number> | null | undefined): number => {
        if (!stocks || typeof stocks !== "object") return 0; // Return 0 if stocks is null or not an object

        return Object.values(stocks)
            .filter((value): value is number => typeof value === "number") // Ensure only numbers are summed
            .reduce((sum, value) => sum + value, 0);
    };

    const convertTimestampToDate = (timestamp: Timestamp): string => {
        if (!timestamp) return "Invalid date"; // Handle if timestamp is null or invalid

        const date = timestamp.toDate(); // Convert to JavaScript Date object
        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    };

    return (
        <div className="overflow-x-auto bg-white rounded-lg shadow-md p-4">
            <table className="w-full border-collapse">
                <thead>
                    <tr className="bg-gray-100 text-left">
                        <th className="p-2">#</th>
                        <th className="p-2">วันที่อัพเดต</th>
                        <th className="p-2">รหัส</th>
                        <th className="p-2">ชื่อสินค้า</th>
                        <th className="p-2">กลุ่มสินค้า</th>
                        <th className="p-2">ราคาซื้อ</th>
                        <th className="p-2">ราคาขาย</th>
                        <th className="p-2">คงเหลือ</th>
                        <th className="p-2">พร้อมขาย</th>
                    </tr>
                </thead>
                <tbody>
                    {products.map((product, index) => (
                        <tr key={product.id} className="border-b">
                            <td className="p-2">{index + 1}</td>
                            <td className="p-2">{convertTimestampToDate(product.updated_date)}</td>
                            <td className="p-2">{product.sku}</td>
                            <td className="p-2 flex items-center gap-2">
                                <Image
                                    src=""
                                    alt="Product"
                                    width={30}
                                    height={30}
                                    className="rounded-md"
                                />
                                <div>
                                    <div>{product.name}</div>
                                    <div className="text-sm text-gray-500">{product.description}</div>
                                </div>
                            </td>

                            <td className="p-2">{product.categories.join(', ')}</td>
                            <td className="p-2">{product.price.buy_price}</td>
                            <td className="p-2">{product.price.sell_price}</td>
                            <td className="p-2">{getTotalStock(product.stocks)} ชิ้น</td>
                            <td className="p-2">{getTotalStock(product.pending_stocks)} ชิ้น</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
