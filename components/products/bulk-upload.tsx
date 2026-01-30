"use client";

import * as React from "react";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { Zap, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import Papa from "papaparse";
import ExcelJS from "exceljs";

// --- CONFIG ---
const CLOUDINARY_UPLOAD_PRESET = "taskflow_preset";
const CLOUDINARY_CLOUD_NAME = "dvmpn8mjh";

// --- TYPES ---
interface SpecValue {
  name: string;
  value: string;
}
interface BulkRow {
  name: string;
  shortDescription?: string;
  sku?: string;
  regularPrice?: string | number;
  salePrice?: string | number;
  website?: string;
  category?: string;
  brand?: string;
  applications?: string;
  mainImage?: string;
  galleryImages?: string;
  technicalSpecs?: string;
}

// --- HELPER: Extracts string from Excel cells ---
const getCellValue = (cell: any): string => {
  if (cell === null || cell === undefined) return "";
  if (typeof cell === "object") {
    if ("text" in cell) return cell.text.toString();
    if ("hyperlink" in cell) return cell.hyperlink.toString();
    if ("richText" in cell && Array.isArray(cell.richText)) {
      return cell.richText.map((t: any) => t.text).join("");
    }
    return "";
  }
  return cell.toString();
};

// --- HELPER: Transform Google Drive URLs to direct-download ---
const transformGDriveUrl = (url: string): string => {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)\//);
  if (!match) return url; // fallback
  const fileId = match[1];
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
};

export function BulkUploadSection({
  onUploadComplete,
}: {
  onUploadComplete?: () => void;
}) {
  const [isProcessing, setIsProcessing] = useState(false);

  // --- SMART CLOUDINARY UPLOAD ---
  const uploadToCloudinary = async (fileOrUrl: string | File) => {
    if (!fileOrUrl) return "";

    // If it's a string, check if it's already a Cloudinary URL
    if (
      typeof fileOrUrl === "string" &&
      fileOrUrl.includes("res.cloudinary.com")
    ) {
      return fileOrUrl; // Skip upload
    }

    try {
      const formData = new FormData();
      formData.append("file", fileOrUrl);
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: "POST", body: formData },
      );

      if (!res.ok) throw new Error("Cloudinary upload failed");
      const data = await res.json();
      return data.secure_url;
    } catch (error) {
      console.error("Cloudinary Error:", error);
      return typeof fileOrUrl === "string" ? fileOrUrl : "";
    }
  };

  const handleBulkUpload = async (file: File) => {
    setIsProcessing(true);
    let rows: BulkRow[] = [];

    try {
      // 1. FILE PARSING (CSV vs XLSX)
      if (file.name.endsWith(".csv")) {
        rows = await new Promise((resolve, reject) => {
          Papa.parse<BulkRow>(file, {
            header: true,
            skipEmptyLines: true,
            complete: (res) => resolve(res.data),
            error: reject,
          });
        });
      } else {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(arrayBuffer);
        const worksheet = workbook.worksheets[0];

        rows = worksheet
          .getSheetValues()
          .slice(2) // Skip header
          .filter((r): r is ExcelJS.RowValues => r !== undefined)
          .map((row: ExcelJS.RowValues) => {
            const r = Array.isArray(row) ? row : Array.from(row as any);
            return {
              name: getCellValue(r[1]).trim(),
              shortDescription: getCellValue(r[2]).trim(),
              sku: getCellValue(r[3]).trim(),
              regularPrice: r[4],
              salePrice: r[5],
              website: getCellValue(r[6]).trim(),
              category: getCellValue(r[7]).trim(),
              brand: getCellValue(r[8]).trim(),
              applications: getCellValue(r[9]).trim(),
              mainImage: getCellValue(r[10]).trim(),
              galleryImages: getCellValue(r[11]).trim(),
              technicalSpecs: getCellValue(r[12]).trim(),
            } as BulkRow;
          });
      }

      if (!rows.length) {
        toast.error("No data found in file");
        setIsProcessing(false);
        return;
      }

      let processedCount = 0;
      const bulkToast = toast.loading(
        `Starting processing of ${rows.length} items...`,
      );

      // 2. DATA SYNC LOOP
      for (const row of rows) {
        try {
          // A. Upload Main Image (transform GDrive URLs)
          const mainImageUrl = row.mainImage
            ? transformGDriveUrl(row.mainImage)
            : "";
          const finalMainImage = await uploadToCloudinary(mainImageUrl);

          // B. Upload Gallery Images
          const galleryUrls: string[] = [];
          if (row.galleryImages) {
            const rawGallery = row.galleryImages
              .split("|")
              .map((u) => u.trim())
              .filter(Boolean)
              .map((u) => transformGDriveUrl(u)); // <-- transform here
            const uploadedGallery = await Promise.all(
              rawGallery.map((url) => uploadToCloudinary(url)),
            );
            galleryUrls.push(...uploadedGallery);
          }

          // C. Parse Technical Specs
          const technicalSpecs: SpecValue[] = [];
          if (row.technicalSpecs) {
            row.technicalSpecs.split("|").forEach((part) => {
              const cleanPart = part.trim();
              const colonIndex = cleanPart.indexOf(":");
              if (colonIndex !== -1) {
                technicalSpecs.push({
                  name: cleanPart.substring(0, colonIndex).trim(),
                  value: cleanPart.substring(colonIndex + 1).trim(),
                });
              }
            });
          }

          // D. Firestore Payload
          const payload = {
            name: row.name,
            shortDescription: row.shortDescription || "",
            sku: row.sku || "",
            regularPrice: Number(row.regularPrice) || 0,
            salePrice: Number(row.salePrice) || 0,
            website: row.website
              ? row.website
                  .split("|")
                  .map((w) => w.trim())
                  .filter(Boolean)
              : [],
            category: row.category || "",
            brand: row.brand || "",
            applications: row.applications
              ? row.applications
                  .split("|")
                  .map((a) => a.trim())
                  .filter(Boolean)
              : [],
            mainImage: finalMainImage,
            galleryImages: galleryUrls,
            technicalSpecs: technicalSpecs,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };

          await addDoc(collection(db, "products"), payload);
          processedCount++;
          toast.loading(`Synced ${processedCount}/${rows.length} products...`, {
            id: bulkToast,
          });
        } catch (rowErr) {
          console.error("Error on individual row:", rowErr);
        }
      }

      toast.success(`Bulk upload finished! ${processedCount} products added.`, {
        id: bulkToast,
      });
      if (onUploadComplete) onUploadComplete();
    } catch (err) {
      console.error("Bulk process error:", err);
      toast.error("Failed to complete bulk upload.");
    } finally {
      setIsProcessing(false);
    }
  };

  const onDrop = useCallback(
    (files: File[]) => {
      if (files[0] && !isProcessing) handleBulkUpload(files[0]);
    },
    [isProcessing],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
    },
    multiple: false,
    disabled: isProcessing,
  });

  return (
    <Card className="shadow-none border-none mb-4">
      <CardContent className="p-0">
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-[24px] p-10 text-center cursor-pointer transition-all ${
            isDragActive
              ? "bg-green-50 border-green-500"
              : "bg-slate-50 border-slate-200 hover:border-blue-400"
          } ${isProcessing ? "opacity-50 cursor-wait" : ""}`}
        >
          <input {...getInputProps()} />
          {isProcessing ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-10 w-10 animate-spin text-green-600" />
              <p className="text-sm font-black uppercase tracking-widest text-slate-600">
                Re-hosting Images & Syncing Firestore...
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="mx-auto w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-4">
                <Zap className="text-green-500" size={24} />
              </div>
              <p className="text-sm font-black uppercase tracking-tighter text-slate-700">
                {isDragActive
                  ? "Release to start upload"
                  : "Drag & Drop CSV/Excel"}
              </p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                External images (including Google Drive) will be automatically
                moved to Cloudinary
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
