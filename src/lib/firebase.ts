import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDpqz3EtS6VG-TbPKvMRj3p_DQqVuAVtCI",
  authDomain: "inventory-stok-barang-6eaa0.firebaseapp.com",
  projectId: "inventory-stok-barang-6eaa0",
  storageBucket: "inventory-stok-barang-6eaa0.firebasestorage.app",
  messagingSenderId: "709808836064",
  appId: "1:709808836064:web:da5c0053e766f0efd5af85",
  measurementId: "G-YDS4H2CBNK"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };