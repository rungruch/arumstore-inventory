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
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead className="bg-gray-800 text-white">
            {customHeader}
          </thead>
          <tbody>
            {datas.length === 0 ? (
              <tr>
                <td 
                  colSpan={6} 
                  className="text-center p-4"
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