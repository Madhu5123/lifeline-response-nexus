
const CLOUDINARY_UPLOAD_PRESET = "lifeline_app";
const CLOUDINARY_CLOUD_NAME = "replace-with-your-cloudinary-name";

export interface UploadResponse {
  secure_url: string;
  public_id: string;
}

export async function uploadImageToCloudinary(file: File): Promise<UploadResponse> {
  if (!file) throw new Error("No file provided");
  
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  
  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );
    
    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    return {
      secure_url: data.secure_url,
      public_id: data.public_id,
    };
  } catch (error) {
    console.error("Error uploading to Cloudinary:", error);
    throw error;
  }
}
