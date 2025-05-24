import React from "react";

export default function FlexTable({
  datas,
  customHeader,
  customRow,
}: {
  datas: any[];
  customHeader?: React.ReactNode;
  customRow?: (data: any, index: number) => React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden border border-gray-200 dark:border-zinc-700">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
            <thead className="bg-gray-50 dark:bg-zinc-700 text-black dark:text-gray-200 border-b border-gray-200 dark:border-zinc-700">
            {customHeader}
            </thead>
          <tbody>
            {datas.length === 0 ? (
              <tr >
                <td 
                  colSpan={10} 
                  className="text-center p-4 text-gray-500 dark:text-gray-300"
                >
                  ไม่พบข้อมูล
                </td>
              </tr>
            ) : (
              datas.map((data, index) => (customRow ? customRow(data, index) : null))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}