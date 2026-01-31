"use client";

import * as React from "react";
import { useCallback, useState, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { db } from "@/lib/firebase";
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  query, 
  where, 
  getDocs 
} from "firebase/firestore";
import { Zap, Loader2, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Papa from "papaparse";
import ExcelJS from "exceljs";

// --- CONFIG ---
const CLOUDINARY_UPLOAD_PRESET = "taskflow_preset";
const CLOUDINARY_CLOUD_NAME = "dvmpn8mjh";

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

const transformGDriveUrl = (url: string): string => {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)\//);
  if (!match) return url;
  const fileId = match[1];
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
};

export function BulkUploadSection({
  onUploadComplete,
}: {
  onUploadComplete?: () => void;
}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const abortControllerRef = useRef<AbortController | null>(null);

  const uploadToCloudinary = async (fileOrUrl: string | File) => {
    if (!fileOrUrl) return "";
    if (typeof fileOrUrl === "string" && fileOrUrl.includes("res.cloudinary.com")) return fileOrUrl;
    try {
      const formData = new FormData();
      formData.append("file", fileOrUrl);
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, { method: "POST", body: formData });
      if (!res.ok) throw new Error("Cloudinary upload failed");
      const data = await res.json();
      return data.secure_url;
    } catch (error) {
      return typeof fileOrUrl === "string" ? fileOrUrl : "";
    }
  };

  // --- HELPER: Syncs Master Data (Brand, Cat, Spec Names) ---
  const syncMasterField = async (collectionName: string, fieldName: string, value: string, websites: string[]) => {
    if (!value) return;
    const cleanValue = value.trim();
    const q = query(collection(db, collectionName), where(fieldName, "==", cleanValue));
    const snap = await getDocs(q);
    
    if (snap.empty) {
      await addDoc(collection(db, collectionName), {
        [fieldName]: cleanValue,
        websites: websites,
        createdAt: serverTimestamp(),
      });
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      toast.error("Upload cancelled by user.");
    }
  };

  const handleBulkUpload = async (file: File) => {
    setIsProcessing(true);
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    let rows: BulkRow[] = [];
    try {
      if (file.name.endsWith(".csv")) {
        rows = await new Promise((resolve, reject) => {
          Papa.parse<BulkRow>(file, { header: true, skipEmptyLines: true, complete: (res) => resolve(res.data), error: reject });
        });
      } else {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(arrayBuffer);
        const worksheet = workbook.worksheets[0];
        rows = worksheet.getSheetValues().slice(2).filter((r): r is ExcelJS.RowValues => r !== undefined).map((row: ExcelJS.RowValues) => {
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

      if (!rows.length) throw new Error("File is empty");
      setProgress({ current: 0, total: rows.length });
      const bulkToast = toast.loading(`Processing 0/${rows.length} items...`);

      for (const row of rows) {
        if (signal.aborted) break;
        try {
          if (!row.name) continue;

          // 1. Array Parsing
          const rowWebsites = row.website ? row.website.split("|").map(w => w.trim()).filter(Boolean) : [];
          const rowApps = row.applications ? row.applications.split("|").map(a => a.trim()).filter(Boolean) : [];

          // 2. Duplicate Check
          const dupQuery = query(collection(db, "products"), where("name", "==", row.name));
          const dupSnap = await getDocs(dupQuery);
          const alreadyExists = dupSnap.docs.some(doc => (doc.data().website || []).some((w: string) => rowWebsites.includes(w)));

          if (alreadyExists) {
            setProgress(prev => ({ ...prev, current: prev.current + 1 }));
            continue; 
          }

          // 3. Sync Master Data (Tags/Specs)
          await syncMasterField("brand_name", "title", row.brand || "", rowWebsites);
          await syncMasterField("categoriesmaintenance", "name", row.category || "", rowWebsites);
          for (const app of rowApps) {
            await syncMasterField("applications", "title", app, rowWebsites);
          }

          // 4. Parse Technical Specs (e.g., "Lumens: 100lm | Wattage: 120W")
          const technicalSpecs: SpecValue[] = [];
          if (row.technicalSpecs) {
            const specParts = row.technicalSpecs.split("|");
            for (const part of specParts) {
              const [specName, specVal] = part.split(":").map(s => s.trim());
              if (specName && specVal) {
                technicalSpecs.push({ name: specName, value: specVal });
                // ONLY store the NAME in the master specs collection
                await syncMasterField("specs", "name", specName, rowWebsites);
              }
            }
          }

          // 5. Images
          const finalMainImage = await uploadToCloudinary(transformGDriveUrl(row.mainImage || ""));
          const galleryUrls = row.galleryImages 
            ? await Promise.all(row.galleryImages.split("|").map(u => uploadToCloudinary(transformGDriveUrl(u.trim()))))
            : [];

          // 6. Save Product
          await addDoc(collection(db, "products"), {
            name: row.name,
            shortDescription: row.shortDescription || "",
            sku: row.sku || "",
            regularPrice: Number(row.regularPrice) || 0,
            salePrice: Number(row.salePrice) || 0,
            website: rowWebsites,
            category: row.category || "",
            brand: row.brand || "",
            applications: rowApps,
            mainImage: finalMainImage,
            galleryImages: galleryUrls,
            technicalSpecs: technicalSpecs, // Stores [{name: "Lumens", value: "100lm"}]
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });

          setProgress(prev => {
            const next = prev.current + 1;
            toast.loading(`Synced ${next}/${rows.length} products...`, { id: bulkToast });
            return { ...prev, current: next };
          });

        } catch (rowErr) { console.error("Row Error:", rowErr); }
      }

      toast.success("Bulk process complete!", { id: bulkToast });
      if (onUploadComplete) onUploadComplete();
    } catch (err: any) {
      toast.error(err.message || "Failed bulk upload");
    } finally {
      setIsProcessing(false);
      abortControllerRef.current = null;
    }
  };

  const onDrop = useCallback((files: File[]) => {
    if (files[0] && !isProcessing) handleBulkUpload(files[0]);
  }, [isProcessing]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/csv": [".csv"], "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"] },
    multiple: false,
    disabled: isProcessing,
  });

  return (
    <Card className="shadow-none border-none mb-4">
      <CardContent className="p-0">
        <div
          {...getRootProps()}
          className={`relative border-2 border-dashed rounded-[24px] p-10 text-center transition-all ${
            isDragActive ? "bg-green-50 border-green-500" : "bg-slate-50 border-slate-200 hover:border-blue-400"
          } ${isProcessing ? "opacity-90 cursor-wait" : "cursor-pointer"}`}
        >
          <input {...getInputProps()} />
          {isProcessing ? (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-green-600" />
              <div className="space-y-1">
                <p className="text-sm font-black uppercase tracking-widest text-slate-600">Syncing {progress.current} / {progress.total}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Do not close this tab</p>
              </div>
              <Button type="button" variant="destructive" size="sm" className="mt-2 rounded-full uppercase text-[10px] font-black tracking-widest px-6" onClick={(e) => { e.stopPropagation(); handleCancel(); }}>
                <XCircle className="mr-2 h-4 w-4" /> Cancel Upload
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="mx-auto w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-4">
                <Zap className="text-green-500" size={24} />
              </div>
              <p className="text-sm font-black uppercase tracking-tighter text-slate-700">{isDragActive ? "Release to start" : "Bulk Upload CSV/Excel"}</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Duplicates will be automatically skipped</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}