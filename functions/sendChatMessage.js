import { onCall, HttpsError } from "firebase-functions/v2/https";
import { Timestamp } from "firebase-admin/firestore";
import { db, auth } from "./firebaseAdmin.js";

export const sendChatMessage = onCall({ cors: true }, async (req) => {
  if (!req.auth) {
    console.error("Unauthenticated user attempted to send a message.");
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const uid = req.auth.uid;
  const { text } = req.data;

  if (typeof text !== "string" || text.trim().length === 0) {
    throw new HttpsError("invalid-argument", "Message text cannot be empty.");
  }

  const wordCount = text.trim().split(/\s+/).length;
  if (wordCount > 500) {
    throw new HttpsError("invalid-argument", "Message cannot exceed 500 words.");
  }

  try {
    const userRecord = await auth.getUser(uid);

    const userQuery = await db
      .collection("users")
      .where("uid", "==", uid)
      .limit(1)
      .get();

    if (userQuery.empty) {
      throw new HttpsError("not-found", "User profile not found.");
    }

    const profile = userQuery.docs[0].data();

    const messageData = {
      text: text.trim(),
      createdAt: Timestamp.now(),
      uid: uid,
      email: userRecord.email || null,
      name: profile.name || null,
      rollNumber: profile.rollNumber || null,
      avatarURL: profile.pfpUrl || null,

    };

    await db.collection("chat_messages").add(messageData);
    return { success: true };
  } catch (error) {
    console.error("sendChatMessage error:", error);
    throw new HttpsError("internal", "Failed to send message. Please try again.");
  }
});
