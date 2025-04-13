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
    <div className="bg-white dark:bg-gray-700 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
            <thead className="bg-gray-800 dark:bg-zinc-950 text-white dark:text-gray-300">
            {customHeader}
            </thead>
          <tbody className="dark:bg-zinc-700">
            {datas.length === 0 ? (
              <tr className="dark:bg-zinc-700">
                <td 
                  colSpan={6} 
                  className="text-center p-4 dark:text-gray-200"
                >
                  No data available
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