import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC31_AfBl1LoccwIRjaN9rSkMFMAuOVPzw",
  authDomain: "okemos-ohs-clay-target-league.firebaseapp.com",
  projectId: "okemos-ohs-clay-target-league",
  storageBucket: "okemos-ohs-clay-target-league.firebasestorage.app",
  messagingSenderId: "616844283339",
  appId: "1:616844283339:web:940797dfd796cff5847a4e"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
