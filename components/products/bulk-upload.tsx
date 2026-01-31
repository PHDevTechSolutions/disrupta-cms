"use client";

import * as React from "react";
import { useCallback, useState, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { db } from "@/lib/firebase";
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  getDocs,
  updateDoc,
  doc,
  arrayUnion 
} from "firebase/firestore";
import { Zap, Loader2, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Papa from "papaparse";
import ExcelJS from "exceljs";
import { cn } from "@/lib/utils";

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
    if ("richText" in cell && Array.isArray(cell.richText)) {
      return cell.richText.map((t: any) => t.text).join("");
    }
    return "";
  }
  return cell.toString();
};

const transformGDriveUrl = (url: string): string => {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)\//);
  return match ? `https://drive.google.com/uc?export=download&id=${match[1]}` : url;
};

export function BulkUploadSection({ onUploadComplete }: { onUploadComplete?: () => void }) {
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
      const data = await res.json();
      return data.secure_url;
    } catch (error) {
      return typeof fileOrUrl === "string" ? fileOrUrl : "";
    }
  };

  /**
   * CASE-INSENSITIVE MASTER SYNC
   * Compares lowercased strings to prevent casing duplicates.
   */
  const syncMasterField = async (collectionName: string, fieldName: string, value: string, websites: string[]) => {
    if (!value || !websites.length) return;
    const cleanValue = value.trim();
    const lowerValue = cleanValue.toLowerCase();

    // Fetch snapshot to check case-insensitively
    const snap = await getDocs(collection(db, collectionName));
    const existingDoc = snap.docs.find(d => d.data()[fieldName]?.toLowerCase() === lowerValue);

    if (existingDoc) {
      await updateDoc(doc(db, collectionName, existingDoc.id), {
        websites: arrayUnion(...websites),
        updatedAt: serverTimestamp()
      });
    } else {
      await addDoc(collection(db, collectionName), {
        [fieldName]: cleanValue,
        websites: websites,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  };

  const handleBulkUpload = async (file: File) => {
    setIsProcessing(true);
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      let rows: BulkRow[] = [];
      if (file.name.endsWith(".csv")) {
        rows = await new Promise((resolve, reject) => {
          Papa.parse<BulkRow>(file, { header: true, skipEmptyLines: true, complete: (res) => resolve(res.data), error: reject });
        });
      } else {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(await file.arrayBuffer());
        const worksheet = workbook.worksheets[0];
        rows = worksheet.getSheetValues().slice(2).filter(r => r !== undefined).map((r: any) => ({
          name: getCellValue(r[1]).trim(),
          shortDescription: getCellValue(r[2]),
          sku: getCellValue(r[3]),
          regularPrice: r[4],
          salePrice: r[5],
          website: getCellValue(r[6]),
          category: getCellValue(r[7]),
          brand: getCellValue(r[8]),
          applications: getCellValue(r[9]),
          mainImage: getCellValue(r[10]),
          galleryImages: getCellValue(r[11]),
          technicalSpecs: getCellValue(r[12]),
        } as BulkRow));
      }

      setProgress({ current: 0, total: rows.length });
      const bulkToast = toast.loading(`Starting sync...`);

      // Pre-fetch products for collision check
      const productSnap = await getDocs(collection(db, "products"));
      const existingProducts = productSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      for (const row of rows) {
        if (signal.aborted) break;
        if (!row.name) continue;

        const rowWebsites = row.website ? row.website.split("|").map(w => w.trim()).filter(Boolean) : [];
        const rowApps = row.applications ? row.applications.split("|").map(a => a.trim()).filter(Boolean) : [];

        // 1. CASE-INSENSITIVE PRODUCT DUPLICATE CHECK
        const isDuplicate = existingProducts.some((p: any) => {
          const nameMatch = p.name?.toLowerCase() === row.name.toLowerCase();
          const webMatch = rowWebsites.some(w => p.website?.includes(w));
          return nameMatch && webMatch;
        });

        if (isDuplicate) {
          setProgress(prev => ({ ...prev, current: prev.current + 1 }));
          continue;
        }

        // 2. Sync Master Fields
        await syncMasterField("brand_name", "title", row.brand || "", rowWebsites);
        await syncMasterField("categoriesmaintenance", "name", row.category || "", rowWebsites);
        for (const app of rowApps) await syncMasterField("applications", "title", app, rowWebsites);

        // 3. Technical Specs Parsing
        const productSpecs: SpecValue[] = [];
        if (row.technicalSpecs) {
          row.technicalSpecs.split("|").forEach(part => {
            const colonIndex = part.indexOf(":");
            if (colonIndex !== -1) {
              const sName = part.substring(0, colonIndex).trim();
              const sVal = part.substring(colonIndex + 1).trim();
              if (sName && sVal) {
                productSpecs.push({ name: sName, value: sVal });
                syncMasterField("specs", "name", sName, rowWebsites);
              }
            }
          });
        }

        const mainImg = await uploadToCloudinary(transformGDriveUrl(row.mainImage || ""));
        const galImgs = row.galleryImages ? await Promise.all(row.galleryImages.split("|").map(u => uploadToCloudinary(transformGDriveUrl(u.trim())))) : [];

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
          mainImage: mainImg,
          galleryImages: galImgs,
          technicalSpecs: productSpecs,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        setProgress(prev => {
          const next = prev.current + 1;
          toast.loading(`Synced ${next}/${rows.length}`, { id: bulkToast });
          return { ...prev, current: next };
        });
      }

      toast.success("Upload Complete", { id: bulkToast });
      if (onUploadComplete) onUploadComplete();
    } catch (err: any) {
      toast.error(err.message || "Bulk Upload Failed");
    } finally {
      setIsProcessing(false);
      abortControllerRef.current = null;
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => files[0] && !isProcessing && handleBulkUpload(files[0]),
    accept: { "text/csv": [".csv"], "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"] },
    multiple: false,
    disabled: isProcessing
  });

  return (
    <Card className="shadow-none border-none mb-4">
      <CardContent className="p-0">
        <div {...getRootProps()} className={cn(
          "relative border-2 border-dashed rounded-[24px] p-10 text-center transition-all",
          isDragActive ? "bg-green-50 border-green-500" : "bg-slate-50 border-slate-200 hover:border-blue-400",
          isProcessing && "opacity-50 cursor-wait"
        )}>
          <input {...getInputProps()} />
          {isProcessing ? (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-green-600" />
              <p className="text-sm font-black uppercase tracking-widest text-slate-600">Processing {progress.current}/{progress.total}</p>
              <Button variant="destructive" size="sm" className="rounded-full text-[10px] font-black" onClick={(e) => { e.stopPropagation(); abortControllerRef.current?.abort(); }}>CANCEL</Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="mx-auto w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-4"><Zap className="text-green-500" /></div>
              <p className="text-sm font-black uppercase tracking-tighter text-slate-700">Bulk Upload CSV/Excel</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Case-insensitive merge active</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}