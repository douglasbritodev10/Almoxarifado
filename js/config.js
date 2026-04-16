import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDJSNGTojGW9ssRRSXFIkFyTvX_L5Bk80U",
  authDomain: "almoxerifado-26175.firebaseapp.com",
  projectId: "almoxerifado-26175",
  storageBucket: "almoxerifado-26175.firebasestorage.app",
  messagingSenderId: "776192149646",
  appId: "1:776192149646:web:317a8535343e2f6e3fa1df"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
