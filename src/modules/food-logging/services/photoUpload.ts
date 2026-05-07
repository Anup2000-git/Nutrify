/**
 * Upload a captured/picked image to Supabase Storage under
 * the `food-photos` bucket, in the user's folder.
 */

import { decode } from "base64-arraybuffer";

import { supabase } from "@/src/lib/supabase";

const BUCKET = "food-photos";

function newPhotoId(): string {
  // Lightweight unique id: timestamp + random suffix.
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export type UploadedPhoto = {
  storagePath: string; // "{userId}/{photoId}.jpg"
  photoId: string;
};

export async function uploadFoodPhoto(input: {
  userId: string;
  localUri: string;
}): Promise<UploadedPhoto> {
  const photoId = newPhotoId();
  const storagePath = `${input.userId}/${photoId}.jpg`;

  // Read the local file as base64 (avoids Android blob upload issues).
  const { readAsStringAsync } = await import("expo-file-system/legacy");
  const base64 = await readAsStringAsync(input.localUri, {
    encoding: "base64",
  });

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, decode(base64), {
      contentType: "image/jpeg",
      upsert: false,
    });

  if (error) throw error;

  // Track in food_photos table for history + retry on analysis failure
  const { error: insertError } = await supabase.from("food_photos").insert({
    user_id: input.userId,
    storage_path: storagePath,
    mime_type: "image/jpeg",
    upload_status: "uploaded",
    ai_analysis_status: "pending",
  });
  if (insertError) {
    console.warn(
      "[photoUpload] food_photos insert failed",
      insertError.message,
    );
  }

  return { storagePath, photoId };
}

export async function getSignedPhotoUrl(
  storagePath: string,
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 600);
  if (error) {
    console.warn("[photoUpload] signed URL failed", error.message);
    return null;
  }
  return data?.signedUrl ?? null;
}
