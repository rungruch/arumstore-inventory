"use client";

import { useState } from "react";
import { 
  deleteAllProducts, 
  deleteAllTransactions, 
  deleteAllWarehouses, 
  deleteAllCategories,
  deleteAllStats,
  resetAllData
} from "@/app/firebase/firestoreDebug";

interface OperationResult {
  operation: string;
  count: number;
  status: "success" | "error";
  error?: string;
}

export default function DebugPage() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showConfirmation, setShowConfirmation] = useState<string | null>(null);
  const [results, setResults] = useState<OperationResult[]>([]);
  const [password, setPassword] = useState<string>("");
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);

  // The password is hardcoded here - in a real app, use environment variables or better auth
  const debugPassword = "debugArumstore2024";

  const handleAuth = () => {
    if (password === debugPassword) {
      setIsAuthorized(true);
    } else {
      alert("Incorrect password");
    }
  }

  const confirmOperation = (operation: string) => {
    setShowConfirmation(operation);
  };

  const cancelOperation = () => {
    setShowConfirmation(null);
  };

  const addResult = (operation: string, count: number, status: "success" | "error", error?: string) => {
    setResults(prev => [
      { operation, count, status, error },
      ...prev
    ]);
  };

  const executeOperation = async (operation: string) => {
    setIsLoading(true);
    setShowConfirmation(null);
    
    try {
      let count = 0;
      
      switch (operation) {
        case "products":
          count = await deleteAllProducts();
          break;
        case "transactions":
          count = await deleteAllTransactions();
          break;
        case "warehouses":
          count = await deleteAllWarehouses();
          break;
        case "categories":
          count = await deleteAllCategories();
          break;
        case "stats":
          count = await deleteAllStats();
          break;
        case "all":
          const results = await resetAllData();
          count = Object.values(results).reduce((sum, val) => sum + val, 0);
          break;
        default:
          throw new Error("Unknown operation");
      }
      
      addResult(operation, count, "success");
    } catch (error) {
      console.error(`Error during ${operation} deletion:`, error);
      addResult(operation, 0, "error", error instanceof Error ? error.message : String(error));
    } finally {
      setIsLoading(false);
    }
  };

  const operations = [
    { key: "products", name: "Products" },
    { key: "transactions", name: "Transactions" },
    { key: "warehouses", name: "Warehouses" },
    { key: "categories", name: "Categories" },
    { key: "stats", name: "Stats Data" },
    { key: "all", name: "ALL DATA (DANGER!)" }
  ];

  if (!isAuthorized) {
    return (
      <div className="container mx-auto p-8">
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-md p-6 max-w-md mx-auto">
          <h1 className="text-2xl font-bold mb-6 text-red-600">Debug Tools - Authorization Required</h1>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Enter debug password</label>
            <input 
              type="password"
              className="w-full p-2 border rounded"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          
          <button
            onClick={handleAuth}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
          >
            Authenticate
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8">
      <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-6 text-red-600">Database Cleanup Tools</h1>
        
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong className="font-bold">Warning:</strong> These tools will permanently delete data from your database. This action cannot be undone!
              </p>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {operations.map(op => (
            <button
              key={op.key}
              onClick={() => confirmOperation(op.key)}
              disabled={isLoading || showConfirmation !== null}
              className={`p-4 rounded-lg text-white font-medium ${
                op.key === "all" 
                  ? "bg-red-600 hover:bg-red-700" 
                  : "bg-blue-600 hover:bg-blue-700"
              } ${(isLoading || showConfirmation !== null) && "opacity-50 cursor-not-allowed"}`}
            >
              Delete All {op.name}
            </button>
          ))}
        </div>
        
        {isLoading && (
          <div className="flex justify-center items-center py-6">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
            <span className="ml-2">Processing...</span>
          </div>
        )}
        
        {showConfirmation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-zinc-800 p-6 rounded-lg shadow-xl max-w-md w-full">
              <h2 className="text-xl font-bold mb-4">Confirm Deletion</h2>
              <p className="mb-6">
                Are you sure you want to delete all {operations.find(op => op.key === showConfirmation)?.name.toLowerCase()}? 
                This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={cancelOperation}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={() => executeOperation(showConfirmation)}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
        
        {results.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-bold mb-4">Operation Results</h2>
            <div className="border rounded-lg overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="py-2 px-4 text-left">Operation</th>
                    <th className="py-2 px-4 text-left">Status</th>
                    <th className="py-2 px-4 text-left">Items Deleted</th>
                    <th className="py-2 px-4 text-left">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                  {results.map((result, idx) => (
                    <tr key={idx} className={result.status === "error" ? "bg-red-50 dark:bg-red-900/20" : ""}>
                      <td className="py-3 px-4">
                        {operations.find(op => op.key === result.operation)?.name || result.operation}
                      </td>
                      <td className="py-3 px-4">
                        {result.status === "success" ? (
                          <span className="text-green-600 font-medium">Success</span>
                        ) : (
                          <span className="text-red-600 font-medium">Failed</span>
                        )}
                      </td>
                      <td className="py-3 px-4">{result.count}</td>
                      <td className="py-3 px-4">{result.error || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}