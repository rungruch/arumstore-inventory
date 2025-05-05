import AddProduct from "@/components/AddProduct";
import ProtectedRoute from "@/components/ProtectedRoute";
const addProductpage = () => {
  return (
  <>
  <ProtectedRoute module='products' action="create">
  <AddProduct></AddProduct>
  </ProtectedRoute>
  </>
  )
}
export default addProductpage