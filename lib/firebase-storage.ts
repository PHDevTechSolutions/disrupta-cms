import { storage } from "./firebase"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"

export async function uploadToFirebaseStorage(file: File, path: string): Promise<string> {
  try {
    // Validate PDF
    if (file.type !== "application/pdf") {
      throw new Error("Only PDF files are allowed")
    }

    // Create storage reference with timestamp to ensure uniqueness
    const fileName = `${Date.now()}-${file.name}`
    const storageRef = ref(storage, `${path}/${fileName}`)

    // Upload file
    const snapshot = await uploadBytes(storageRef, file)

    // Get download URL
    const downloadUrl = await getDownloadURL(snapshot.ref)

    return downloadUrl
  } catch (error) {
    console.error("Firebase Storage upload error:", error)
    throw error
  }
}
