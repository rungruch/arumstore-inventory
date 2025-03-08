import { Timestamp } from "firebase/firestore";

export default function FlexTable({
  datas,
  customHeader,
  customRow,
}: {
  datas: any;
  customHeader?: React.ReactNode;
  customRow?: (product: any, index: number) => React.ReactNode;
}) {
  const getTotalStock = (stocks: Record<string, number> | null | undefined): number => {
    if (!stocks || typeof stocks !== "object") return 0;
    return Object.values(stocks)
      .filter((value): value is number => typeof value === "number")
      .reduce((sum, value) => sum + value, 0);
  };

  const convertTimestampToDate = (timestamp: Timestamp): string => {
    if (!timestamp) return "Invalid date";
    const date = timestamp.toDate();
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="overflow-x-auto bg-white rounded-lg hover:shadow-lg transition-shadow duration-300">
      <table className="w-full border-collapse">
        <thead className="bg-gradient-to-r from-gray-800 to-gray-900 text-white">
          {/* Allow custom headers */}
          {customHeader ? customHeader : null}
        </thead>
        <tbody>
          {/* Allow custom row content */}
          {datas.map((data: any, index: number) =>
            customRow ? customRow(data, index) : null
          )}
        </tbody>
      </table>
    </div>
  );
}
