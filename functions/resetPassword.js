import { onCall, HttpsError } from "firebase-functions/v2/https";
import { auth, db } from "./firebaseAdmin.js";

export const resetUserPassword = onCall({ cors: true }, async (req) => {
  const { rollNumber, securityAnswer, newPassword } = req.data;

  // Validate input
  if (!rollNumber || !securityAnswer || !newPassword) {
    throw new HttpsError("invalid-argument", "All fields are required");
  }

  const trimmedRoll = rollNumber.trim().toLowerCase();

  try {
    // 1. Get user document from Firestore
    const userRef = db.collection("users").doc(trimmedRoll);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      throw new HttpsError("not-found", "User not found");
    }

    const userData = userSnap.data();

    // 2. Verify security answer (case-insensitive)
    if (!userData.securityAnswer || 
        securityAnswer.trim().toLowerCase() !== userData.securityAnswer.toLowerCase()) {
      throw new HttpsError("permission-denied", "Incorrect security answer");
    }

    // 3. Get the user's email
    const email = `${trimmedRoll}@bca-hub.com`;
    
    // 4. Find the user in Firebase Auth
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(email);
    } catch (error) {
      if (error.code === "auth/user-not-found") {
        throw new HttpsError("not-found", "Auth user not found");
      }
      throw error;
    }

    // 5. Update the password
    await auth.updateUser(userRecord.uid, {
      password: newPassword
    });

    return { success: true, message: "Password reset successfully" };
  } catch (error) {
    console.error("resetUserPassword error:", error);
    throw new HttpsError("internal", error.message || "Password reset failed");
  }
});