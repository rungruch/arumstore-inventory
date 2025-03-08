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
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Table header */}
        <table className="w-full border-collapse">
          <thead className="bg-gray-800 text-white">
            {customHeader}
          </thead>
        </table>
  
        {/* Scrollable rows */}
        <div className="max-h-[420px] overflow-y-auto">
          <table className="w-full border-collapse">
            <tbody>
              {datas.length === 0 ? (
                <tr>
                  <td colSpan={customHeader ? React.Children.count(customHeader) : 1} className="text-center p-4">
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
  