// interfaces/warehouse.ts
import { Timestamp } from "firebase/firestore";

export interface Warehouse {
  id: string;
  warehouse_id: string;
  warehouse_name: string;
  details: string;
  type: string;
  created_date: Timestamp;
  updated_date: Timestamp;
}