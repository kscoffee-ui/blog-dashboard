import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBTsRmYeZe8pGcBvGRRLi1Rhey6AKojQRk",
  authDomain: "blog-dashboard-f267b.firebaseapp.com",
  projectId: "blog-dashboard-f267b",
  storageBucket: "blog-dashboard-f267b.firebasestorage.app",
  messagingSenderId: "806855293683",
  appId: "1:806855293683:web:5041d6daacf97cf4a59586"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app); 