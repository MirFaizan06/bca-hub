// firebaseAdmin.js
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

// Initialize once here
initializeApp();

export const db = getFirestore();
export const auth = getAuth();
