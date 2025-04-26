"use client";
import { useState } from "react";

interface Product {
  id: number;
  name: string;
  quantity: number;
}

interface Template {
  id: number;
  name: string;
  products: Product[];
}

const ProductTemplatePage = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateName, setTemplateName] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [newProductName, setNewProductName] = useState("");
  const [newProductQuantity, setNewProductQuantity] = useState(1);

  const addProduct = () => {
    if (newProductName.trim() === "") return;
    setProducts([...products, { id: Date.now(), name: newProductName, quantity: newProductQuantity }]);
    setNewProductName("");
    setNewProductQuantity(1);
  };

  const saveTemplate = () => {
    if (templateName.trim() === "" || products.length === 0) return;
    setTemplates([...templates, { id: Date.now(), name: templateName, products }]);
    setTemplateName("");
    setProducts([]);
  };

  return (
    <div className="container mx-auto p-5 py-8">
      <h1 className="text-3xl font-semibold mb-4">mock Product Template Page</h1>
      
      {/* Template Creation */}
      <div className="bg-white p-4 shadow-md rounded-lg mb-6">
        <h2 className="text-xl font-medium mb-2">Create a New Template</h2>
        <input
          type="text"
          placeholder="Template Name"
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md mb-2"
        />
        
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="Product Name"
            value={newProductName}
            onChange={(e) => setNewProductName(e.target.value)}
            className="p-2 border border-gray-300 rounded-md"
          />
          <input
            type="number"
            onWheel={(e) => (e.target as HTMLInputElement).blur()}
            value={newProductQuantity}
            min="1"
            onChange={(e) => setNewProductQuantity(parseInt(e.target.value))}
            className="w-20 p-2 border border-gray-300 rounded-md"
          />
          <button onClick={addProduct} className="bg-blue-500 text-white px-4 py-2 rounded-md">Add Product</button>
        </div>
        
        <ul className="mb-4">
          {products.map((product) => (
            <li key={product.id} className="border p-2 rounded-md mb-1">
              {product.name} - {product.quantity}
            </li>
          ))}
        </ul>
        
        <button onClick={saveTemplate} className="bg-green-500 text-white px-6 py-2 rounded-md">Save Template</button>
      </div>
      
      {/* Saved Templates */}
      <div className="bg-white p-4 shadow-md rounded-lg">
        <h2 className="text-xl font-medium mb-2">Saved Templates</h2>
        {templates.length === 0 ? (
          <p>No templates created yet.</p>
        ) : (
          <ul>
            {templates.map((template) => (
              <li key={template.id} className="border p-2 rounded-md mb-2">
                <strong>{template.name}</strong>
                <ul className="ml-4">
                  {template.products.map((product) => (
                    <li key={product.id}>{product.name} - {product.quantity}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ProductTemplatePage;
