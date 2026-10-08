import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../integrations/supabase/types";

export declare const PRODUCT_IMAGE_MAX_BYTES: number;
export declare function validateProductImage(file: Pick<File, "type" | "size">): void;
export declare function createProductImagePath(
  productId: string,
  extension?: "webp" | "jpg",
): string;
export declare function compressProductImage(
  file: File,
  maxDimension?: number,
): Promise<{ blob: Blob; extension: "webp" | "jpg" }>;
export declare function uploadProductImage(
  client: SupabaseClient<Database>,
  productId: string,
  file: File,
): Promise<{ path: string; url: string }>;
export declare function productImagePathFromPublicUrl(
  value: string,
  storageBaseUrl?: string,
): string | null;
