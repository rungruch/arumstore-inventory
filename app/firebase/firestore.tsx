// import { generateFakeRestaurantsAndReviews } from "@/src/lib/fakeRestaurants.js";

import {
	collection,
	onSnapshot,
	query,
	getDocs,
	doc,
	getDoc,
	updateDoc,
	orderBy,
	Timestamp,
	runTransaction,
	where,
	addDoc,
	getFirestore,
    limit,
    startAt, 
    startAfter,
    endAt,
    CollectionReference,
    getCountFromServer
} from "firebase/firestore";

// import { db } from "@/app/firebase/clientApp";

import { db } from "@/app/firebase/clientApp"

// export async function updateRestaurantImageReference(
// 	restaurantId,
// 	publicImageUrl
// ) {
// 	const restaurantRef = doc(collection(db, "restaurants"), restaurantId);
// 	if (restaurantRef) {
// 		await updateDoc(restaurantRef, { photo: publicImageUrl });
// 	}
// }

// const updateWithRating = async (
// 	transaction,
// 	docRef,
// 	newRatingDocument,
// 	review
// ) => {
// 	return;
// };

// export async function addReviewToRestaurant(db, restaurantId, review) {
// 	return;
// }

// function applyQueryFilters(q, { category, city, price, sort }) {
// 	return;
// }

// export async function getRestaurants(db = db, filters = {}) {
// 	return [];
// }

// export function getRestaurantsSnapshot(cb, filters = {}) {
// 	return;
// }

// export async function getRestaurantById(db, restaurantId) {
// 	if (!restaurantId) {
// 		console.log("Error: Invalid ID received: ", restaurantId);
// 		return;
// 	}
// 	const docRef = doc(db, "restaurants", restaurantId);
// 	const docSnap = await getDoc(docRef);
// 	return {
// 		...docSnap.data(),
// 		timestamp: docSnap.data().timestamp.toDate(),
// 	};
// }

// export function getRestaurantSnapshotById(restaurantId, cb) {
// 	return;
// }

// export async function getReviewsByRestaurantId(db, restaurantId) {
// 	if (!restaurantId) {
// 		console.log("Error: Invalid restaurantId received: ", restaurantId);
// 		return;
// 	}

// 	const q = query(
// 		collection(db, "restaurants", restaurantId, "ratings"),
// 		orderBy("timestamp", "desc")
// 	);

// 	const results = await getDocs(q);
// 	return results.docs.map(doc => {
// 		return {
// 			id: doc.id,
// 			...doc.data(),
// 			// Only plain objects can be passed to Client Components from Server Components
// 			timestamp: doc.data().timestamp.toDate(),
// 		};
// 	});
// }

// export function getReviewsSnapshotByRestaurantId(restaurantId, cb) {
// 	if (!restaurantId) {
// 		console.log("Error: Invalid restaurantId received: ", restaurantId);
// 		return;
// 	}

// 	const q = query(
// 		collection(db, "restaurants", restaurantId, "ratings"),
// 		orderBy("timestamp", "desc")
// 	);
// 	const unsubscribe = onSnapshot(q, querySnapshot => {
// 		const results = querySnapshot.docs.map(doc => {
// 			return {
// 				id: doc.id,
// 				...doc.data(),
// 				// Only plain objects can be passed to Client Components from Server Components
// 				timestamp: doc.data().timestamp.toDate(),
// 			};
// 		});
// 		cb(results);
// 	});
// 	return unsubscribe;
// }

// export async function addFakeRestaurantsAndReviews() {
// 	const data = await generateFakeRestaurantsAndReviews();
// 	for (const { restaurantData, ratingsData } of data) {
// 		try {
// 			const docRef = await addDoc(
// 				collection(db, "restaurants"),
// 				restaurantData
// 			);

// 			for (const ratingData of ratingsData) {
// 				await addDoc(
// 					collection(db, "restaurants", docRef.id, "ratings"),
// 					ratingData
// 				);
// 			}
// 		} catch (e) {
// 			console.log("There was an error adding the document");
// 			console.error("Error adding document: ", e);
// 		}
// 	}
// }


// export async function getRestaurantById(db, restaurantId) {
// 	if (!restaurantId) {
// 		console.log("Error: Invalid ID received: ", restaurantId);
// 		return;
// 	}
// 	const docRef = doc(db, "restaurants", restaurantId);
// 	const docSnap = await getDoc(docRef);
// 	return {
// 		...docSnap.data(),
// 		timestamp: docSnap.data().timestamp.toDate(),
// 	};
// }

export async function getProducts() {
    try {
        const q = query(
            collection(db, "products"),
        );
        
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));
    } catch (error) {
        console.error("Error fetching products: ", error);
        return [];
    }
}

export async function getProductCategoryPaginated(lastDoc = null, pageSize = 10) {
    try {
      let q = query(collection(db, "product_category"), orderBy("created_at", "desc"), limit(pageSize));
  
      // If there’s a last document (for next page), start after it
      if (lastDoc) {
        q = query(collection(db, "product_category"), orderBy("created_at", "desc"), startAfter(lastDoc), limit(pageSize));
      }
  
      const querySnapshot = await getDocs(q);
      const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1]; // Track last doc for pagination
  
      return {
        categories: querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
        lastDoc: lastVisible, // Store last document to fetch the next page
      };
    } catch (error) {
      console.error("Error fetching paginated categories:", error);
      return { categories: [], lastDoc: null };
    }
  }

  export async function getTotalCategoryCount() {
    try {
      const categoryCollection = collection(db, "product_category");
      const snapshot = await getCountFromServer(categoryCollection);
      return snapshot.data().count;
    } catch (error) {
      console.error("Error fetching category count:", error);
      return 0;
    }
  }


  export async function createProductCategory(categoryName: string) {
    try {
      // First check if a category with this name already exists
      const categoryQuery = query(
        collection(db, "product_category"),
        where("category_name", "==", categoryName)
      );
      
      const existingCategories = await getDocs(categoryQuery);
      
      if (!existingCategories.empty) {
        throw new Error(`หมวดหมู่ "${categoryName}" มีข้อมูลอยู่แล้ว`);
      }
      
      // If no existing category found, create a new one
      const newCategory = {
        category_name: categoryName,
        created_at: Timestamp.now(),
      };
  
      const docRef = await addDoc(collection(db, "product_category"), newCategory);
      return { id: docRef.id, ...newCategory };
    } catch (error) {
      throw error; // Re-throw the error to handle it in the calling function
    }
  }

function startsWith(
    collectionRef: CollectionReference,
    fieldName: string,
    term: string
) {
    return query(
        collectionRef,
        orderBy(fieldName),
        startAt(term),
        endAt(term + '~')
    );
}

export async function getProductCategoryByName(partialName: string) {
    try {
      // Execute the query
      const querySnapshot = await getDocs(
        startsWith(
            collection(db, 'product_category'),
            'category_name',
            partialName
        )
    );
  
      // Map the results into an array of category objects
      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error("Error fetching category by partial name:", error);
      throw error;
    }
}

// export async function getProducts(filters = {}) {
// 	let q = query(collection(db, "products"));

// 	q = applyQueryFilters(q, filters);
// 	const results = await getDocs(q);
// 	return results.docs.map(doc => {
// 			return {
// 					id: doc.id,
// 					...doc.data(),
// 					// Only plain objects can be passed to Client Components from Server Components
// 					timestamp: doc.data().timestamp.toDate(),
// 			};
// 	});
// }