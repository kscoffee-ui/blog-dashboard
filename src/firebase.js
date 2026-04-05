import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBTsRmYeZe8pGcBvGRRLi1Rhey6AKojQRk",
  authDomain: "blog-dashboard-f267b.firebaseapp.com",
  projectId: "blog-dashboard-f267b"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app); // ←これ追加