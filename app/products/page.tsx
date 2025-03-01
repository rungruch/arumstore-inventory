"use client";
import { getProducts } from "@/app/firebase/firestore";
import { getFirestore } from "firebase/firestore";
import { getAuthenticatedAppForUser } from "@/app/firebase/serverApp"
import { useState } from "react";
import ProductTable from "@/components/ProductTable";
// import { Button } from "@/components/ui/Button";

const restaurant = await getProducts()
console.log(restaurant)

export default function ProductsPage() {
  const [search, setSearch] = useState("");
  // const {firebaseServerApp} = await getAuthenticatedAppForUser()
  // const restaurant = await getProducts(getFirestore(firebaseServerApp))
  // console.log(restaurant)


  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-4">
        <input
          type="text"
          placeholder="ค้นหา"
          className="border p-2 rounded-md w-1/3"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {/* <Button>Add New Product</Button> */}
      </div>
      <ProductTable products={restaurant} />
    </div>
  );
}