"use client";

import * as React from "react";
import { useState, useEffect, useCallback, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  onSnapshot,
  updateDoc,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import {
  ImagePlus,
  X,
  Loader2,
  AlignLeft,
  Globe,
  Tag,
  Factory,
  LayoutGrid,
  Zap,
  Plus,
  Images,
  FileText,
} from "lucide-react";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

// --- TYPES ---
interface MasterItem {
  id: string;
  name: string;
  websites: string[];
  isTemp?: boolean;
}

interface PendingItem {
  type: "brand" | "category" | "application" | "spec";
  name: string;
  collection: string;
  field: string;
}

interface SpecValue {
  name: string;
  value: string;
}

const WEBSITE_OPTIONS = [
  "Ecoshift Corporation",
  "Disruptive Solutions Inc.",
  "Value Acquisitions Holdings",
];

export default function AddProductForm({
  editData,
  onFinished,
}: {
  editData?: any;
  onFinished?: () => void;
}) {
  const CLOUDINARY_UPLOAD_PRESET = "taskflow_preset";
  const CLOUDINARY_CLOUD_NAME = "dvmpn8mjh";

  const [isPublishing, setIsPublishing] = useState(false);
  
  // FORM STATE
  const [productName, setProductName] = useState("");
  const [shortDesc, setShortDesc] = useState("");
  const [sku, setSku] = useState("");
  const [regPrice, setRegPrice] = useState("");
  const [salePrice, setSalePrice] = useState("");

  // MASTER DATA STATE
  const [availableSpecs, setAvailableSpecs] = useState<MasterItem[]>([]);
  const [availableCats, setAvailableCats] = useState<MasterItem[]>([]);
  const [availableBrands, setAvailableBrands] = useState<MasterItem[]>([]);
  const [availableApps, setAvailableApps] = useState<MasterItem[]>([]);

  // NEW ITEM TRACKING
  const pendingItemsRef = useRef<PendingItem[]>([]);

  // SELECTIONS
  const [selectedWebs, setSelectedWebs] = useState<string[]>([]);
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedApps, setSelectedApps] = useState<string[]>([]);

  const [specValues, setSpecValues] = useState<Record<string, string>>({});

  // IMAGES
  const [mainImage, setMainImage] = useState<File | null>(null);
  const [galleryImages, setGalleryImages] = useState<File[]>([]);
  const [qrImage, setQrImage] = useState<File | null>(null);
  const [existingMainImage, setExistingMainImage] = useState("");
  const [existingGalleryImages, setExistingGalleryImages] = useState<string[]>([]);
  const [existingQrImage, setExistingQrImage] = useState("");

  // PDF CATALOG STATE
  const [catalogPdf, setCatalogPdf] = useState<File | null>(null);
  const [existingCatalogPdf, setExistingCatalogPdf] = useState("");

  // MODE LOGIC
  const isValueAcquisitions = selectedWebs.includes("Value Acquisitions Holdings");

  // --- 1. FETCH MASTER DATA ---
  useEffect(() => {
    if (selectedWebs.length === 0) {
      setAvailableSpecs([]);
      setAvailableCats([]);
      setAvailableBrands([]);
      setAvailableApps([]);
      return;
    }

    const qFilter = where("websites", "array-contains-any", selectedWebs);

    const unsubSpecs = onSnapshot(query(collection(db, "specs"), qFilter), (snap) => {
      setAvailableSpecs((prev) => mergeWithPending(prev, snap, "spec"));
    });

    const unsubCats = onSnapshot(query(collection(db, "categoriesmaintenance"), qFilter), (snap) => {
      setAvailableCats((prev) => mergeWithPending(prev, snap, "category", "title"));
    });

    const unsubBrands = onSnapshot(query(collection(db, "brand_name"), qFilter), (snap) => {
      setAvailableBrands((prev) => mergeWithPending(prev, snap, "brand", "title"));
    });

    const unsubApps = onSnapshot(query(collection(db, "applications"), qFilter), (snap) => {
      setAvailableApps((prev) => mergeWithPending(prev, snap, "application", "title"));
    });

    return () => {
      unsubSpecs();
      unsubCats();
      unsubBrands();
      unsubApps();
    };
  }, [selectedWebs]);

  const mergeWithPending = (prev: MasterItem[], snap: any, type: string, fieldKey = "name") => {
    const dbItems = snap.docs.map((d: any) => {
      const raw = d.data();
      return {
        id: d.id,
        name: raw[fieldKey] || raw.name || "Unnamed",
        websites: raw.websites || [],
      } as MasterItem;
    });

    const currentPending = pendingItemsRef.current
      .filter((p) => p.type === type)
      .map((p) => ({
        id: `temp-${p.name}`,
        name: p.name,
        websites: selectedWebs,
        isTemp: true,
      }));

    return [...dbItems, ...currentPending];
  };

  // --- 2. LOAD EDIT DATA ---
  useEffect(() => {
    if (editData) {
      setProductName(editData.name || "");
      setShortDesc(editData.shortDescription || "");
      setSku(editData.sku || "");
      setRegPrice(editData.regularPrice?.toString() || "");
      setSalePrice(editData.salePrice?.toString() || "");
      setSelectedWebs(Array.isArray(editData.website) ? editData.website : editData.website ? [editData.website] : []);
      setSelectedCats(editData.category ? [editData.category] : []);
      setSelectedBrands(editData.brand ? [editData.brand] : []);
      setSelectedApps(editData.applications || []);
      setExistingMainImage(editData.mainImage || "");
      setExistingGalleryImages(editData.galleryImages || []);
      setExistingQrImage(editData.qrCodeImage || "");
      setExistingCatalogPdf(editData.catalogPdf || "");

      if (editData.technicalSpecs) {
        const values: Record<string, string> = {};
        editData.technicalSpecs.forEach((s: SpecValue) => {
          values[s.name] = s.value;
        });
        setSpecValues(values);
      }
    }
  }, [editData]);

  // --- 3. HANDLERS ---

  const uploadToCloudinary = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    // Use 'auto' to support PDFs and images in one function
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`,
      { method: "POST", body: formData }
    );
    const data = await res.json();
    return data.secure_url;
  };

  const handleAddItem = (
    type: PendingItem["type"],
    name: string,
    collectionName: string,
    dbField: string
  ) => {
    if (!name.trim()) return;
    const cleanName = name.trim();
    let listToCheck: MasterItem[] = [];
    if (type === "brand") listToCheck = availableBrands;
    if (type === "category") listToCheck = availableCats;
    if (type === "application") listToCheck = availableApps;
    if (type === "spec") listToCheck = availableSpecs;

    const exists = listToCheck.some(
      (item) => item.name.toLowerCase() === cleanName.toLowerCase()
    );

    if (exists) {
      toast.error(`"${cleanName}" already exists.`);
      return;
    }

    pendingItemsRef.current.push({ type, name: cleanName, collection: collectionName, field: dbField });

    const newItem: MasterItem = { id: `temp-${cleanName}`, name: cleanName, websites: selectedWebs, isTemp: true };

    if (type === "brand") { setAvailableBrands(p => [...p, newItem]); setSelectedBrands(p => [...p, cleanName]); }
    else if (type === "category") { setAvailableCats(p => [...p, newItem]); setSelectedCats(p => [...p, cleanName]); }
    else if (type === "application") { setAvailableApps(p => [...p, newItem]); setSelectedApps(p => [...p, cleanName]); }
    else if (type === "spec") { setAvailableSpecs(p => [...p, newItem]); setSpecValues(p => ({ ...p, [cleanName]: "" })); }
  };

  const handlePublish = async () => {
    if (!productName || selectedWebs.length === 0)
      return toast.error("Please select at least one website and name!");

    setIsPublishing(true);
    const publishToast = toast.loading("Validating...");

    try {
      const dupQuery = query(collection(db, "products"), where("name", "==", productName));
      const dupSnap = await getDocs(dupQuery);
      const isDuplicate = dupSnap.docs.some((docSnap) => {
        if (editData && docSnap.id === editData.id) return false;
        return (docSnap.data().website || []).some((w: string) => selectedWebs.includes(w));
      });

      if (isDuplicate) {
        toast.dismiss(publishToast);
        toast.error("Product name exists on selected website.");
        setIsPublishing(false);
        return;
      }

      // SAVE PENDING TAGS
      if (pendingItemsRef.current.length > 0) {
        toast.loading("Saving new tags...", { id: publishToast });
        await Promise.all(pendingItemsRef.current.map((item) => {
          const payload: any = { websites: selectedWebs, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
          payload[item.field] = item.name;
          if (item.type === "application") { payload.isActive = true; payload.imageUrl = ""; payload.description = ""; }
          return addDoc(collection(db, item.collection), payload);
        }));
        pendingItemsRef.current = [];
      }

      // UPLOAD MEDIA
      toast.loading("Uploading media...", { id: publishToast });
      let mainUrl = "";
      let qrUrl = "";
      let galleryUrls: string[] = [];
      let pdfUrl = "";

      if (isValueAcquisitions) {
        pdfUrl = catalogPdf ? await uploadToCloudinary(catalogPdf) : existingCatalogPdf;
      } else {
        mainUrl = mainImage ? await uploadToCloudinary(mainImage) : existingMainImage;
        qrUrl = qrImage ? await uploadToCloudinary(qrImage) : existingQrImage;
        const uploadedGallery = await Promise.all(galleryImages.map(uploadToCloudinary));
        galleryUrls = [...existingGalleryImages, ...uploadedGallery];
      }

      const technicalSpecs = Object.entries(specValues)
        .filter(([_, val]) => val.trim() !== "")
        .map(([name, value]) => ({ name, value }));

      const payload = {
        name: productName,
        shortDescription: shortDesc,
        sku,
        regularPrice: Number(regPrice) || 0,
        salePrice: Number(salePrice) || 0,
        technicalSpecs,
        mainImage: mainUrl,
        qrCodeImage: qrUrl,
        galleryImages: galleryUrls,
        catalogPdf: pdfUrl,
        website: selectedWebs,
        category: selectedCats[0] || "",
        brand: selectedBrands[0] || "",
        applications: selectedApps,
        updatedAt: serverTimestamp(),
      };

      if (editData?.id) {
        await updateDoc(doc(db, "products", editData.id), payload);
      } else {
        await addDoc(collection(db, "products"), { ...payload, createdAt: serverTimestamp() });
      }

      toast.success("Product Saved!", { id: publishToast });
      if (onFinished) onFinished();
    } catch (err) {
      console.error(err);
      toast.error("Error saving product", { id: publishToast });
    } finally {
      setIsPublishing(false);
    }
  };

  const onDropMain = useCallback((files: File[]) => { if (files[0]) setMainImage(files[0]); }, []);
  const { getRootProps: getMainRootProps, getInputProps: getMainInputProps } = useDropzone({ onDrop: onDropMain, maxFiles: 1 });

  const onDropGallery = useCallback((files: File[]) => { setGalleryImages((prev) => [...prev, ...files]); }, []);
  const { getRootProps: getGalleryRootProps, getInputProps: getGalleryInputProps } = useDropzone({ onDrop: onDropGallery });

  const onDropPdf = useCallback((files: File[]) => { if (files[0]) setCatalogPdf(files[0]); }, []);
  const { getRootProps: getPdfRootProps, getInputProps: getPdfInputProps } = useDropzone({ onDrop: onDropPdf, maxFiles: 1, accept: { 'application/pdf': ['.pdf'] } });

  const toggleWebsite = (web: string) => {
    setSelectedWebs((prev) => prev.includes(web) ? prev.filter((w) => w !== web) : [...prev, web]);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 bg-slate-50 min-h-screen">
      <div className="md:col-span-2 space-y-6">
        <Card className="shadow-sm border-none ring-2 ring-blue-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-[10px] font-black uppercase text-blue-600 tracking-widest flex items-center gap-2">
              <Globe className="w-4 h-4" /> Targeted Websites
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            {WEBSITE_OPTIONS.map((web) => (
              <div
                key={web}
                onClick={() => toggleWebsite(web)}
                className={`flex-1 min-w-[180px] p-4 rounded-xl border-2 transition-all cursor-pointer flex justify-between items-center ${
                  selectedWebs.includes(web) ? "border-blue-50 bg-blue-50 ring-4 ring-blue-500/5" : "border-slate-100 bg-white hover:border-slate-200"
                }`}
              >
                <span className={`text-[11px] font-black uppercase ${selectedWebs.includes(web) ? "text-blue-700" : "text-slate-500"}`}>{web}</span>
                <Checkbox checked={selectedWebs.includes(web)} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-sm border-none ring-1 ring-slate-200">
          <CardHeader>
            <CardTitle className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
              <Images className="w-4 h-4" /> Media Assets
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {isValueAcquisitions ? (
              <div className="space-y-2">
                <Label className="text-[9px] font-black uppercase text-slate-400">Catalog PDF</Label>
                <div
                  {...getPdfRootProps()}
                  className="relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:bg-red-50 transition-all border-red-200 h-[200px] flex flex-col items-center justify-center bg-red-50/10"
                >
                  <input {...getPdfInputProps()} />
                  {catalogPdf || existingCatalogPdf ? (
                    <div className="flex flex-col items-center gap-2">
                      <FileText className="w-12 h-12 text-red-500" />
                      <p className="text-xs font-bold text-slate-700">{catalogPdf ? catalogPdf.name : "Catalog PDF Linked"}</p>
                      <button onClick={(e) => { e.stopPropagation(); setCatalogPdf(null); setExistingCatalogPdf(""); }} className="text-[10px] text-red-500 underline font-bold">Remove</button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <FileText className="w-8 h-8 mb-2 text-red-400" />
                      <p className="text-[9px] font-bold text-red-500 uppercase">Drop Catalog PDF Here</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[9px] font-black uppercase text-slate-400">Main Image</Label>
                    <div {...getMainRootProps()} className="relative border-2 border-dashed rounded-xl p-2 text-center cursor-pointer hover:bg-slate-50 transition-all border-slate-200 h-[160px] flex flex-col items-center justify-center bg-white">
                      <input {...getMainInputProps()} />
                      {mainImage || existingMainImage ? (
                        <div className="relative w-full h-full">
                          <img src={mainImage ? URL.createObjectURL(mainImage) : existingMainImage} className="w-full h-full object-contain rounded-lg" />
                          <button onClick={(e) => { e.stopPropagation(); setMainImage(null); setExistingMainImage(""); }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"><X className="w-3 h-3" /></button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center"><ImagePlus className="w-6 h-6 mb-2 text-slate-300" /><p className="text-[9px] font-bold text-slate-400 uppercase">Main Image</p></div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[9px] font-black uppercase text-slate-400">QR Code</Label>
                    <QrDropzone file={qrImage} existingUrl={existingQrImage} onRemove={() => { setQrImage(null); setExistingQrImage(""); }} onDrop={(files) => { if (files[0]) setQrImage(files[0]); }} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[9px] font-black uppercase text-slate-400">Gallery</Label>
                    <div {...getGalleryRootProps()} className="relative border-2 border-dashed rounded-xl p-2 text-center cursor-pointer hover:bg-blue-50 transition-all border-blue-200 h-[160px] flex flex-col items-center justify-center bg-blue-50/10">
                      <input {...getGalleryInputProps()} /><Images className="w-6 h-6 mb-2 text-blue-400" /><p className="text-[9px] font-bold text-blue-500 uppercase">Drop Gallery</p>
                    </div>
                  </div>
                </div>
                {(existingGalleryImages.length > 0 || galleryImages.length > 0) && (
                  <div className="pt-4 border-t grid grid-cols-6 gap-3">
                    {existingGalleryImages.map((img, i) => (
                      <div key={i} className="aspect-square relative border rounded-lg overflow-hidden group">
                        <img src={img} className="object-cover w-full h-full" />
                        <button onClick={() => setExistingGalleryImages(p => p.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>
                      </div>
                    ))}
                    {galleryImages.map((img, i) => (
                      <div key={i} className="aspect-square relative border rounded-lg overflow-hidden group">
                        <img src={URL.createObjectURL(img)} className="object-cover w-full h-full" />
                        <button onClick={() => setGalleryImages(p => p.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm border-none ring-1 ring-slate-200">
          <CardHeader><CardTitle className="flex items-center gap-2 text-slate-700 font-black text-xs uppercase tracking-widest"><AlignLeft className="w-4 h-4 text-blue-500" /> General Info</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400">Product Name</Label><Input className="h-12 text-lg font-bold" value={productName} onChange={(e) => setProductName(e.target.value)} /></div>
            <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400">Description</Label><Input className="h-12 text-sm" value={shortDesc} onChange={(e) => setShortDesc(e.target.value)} /></div>
            <div className="pt-6 border-t">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2"><Zap className="w-4 h-4 text-amber-500" /><Label className="text-[11px] font-black uppercase text-slate-500">Specs</Label></div>
                <AddCustomItem placeholder="New Spec..." onAdd={(name) => handleAddItem("spec", name, "specs", "name")} disabled={selectedWebs.length === 0} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                {availableSpecs.map((spec) => (
                  <div key={spec.id} className="space-y-1 bg-white p-3 rounded-xl border">
                    <Label className="text-[10px] font-black uppercase text-slate-500">{spec.name}</Label>
                    <Input className="h-9 text-xs bg-slate-50" value={specValues[spec.name] || ""} onChange={(e) => setSpecValues(p => ({ ...p, [spec.name]: e.target.value }))} />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="border-none ring-1 ring-slate-200 shadow-sm">
          <CardHeader className="bg-slate-50/50 py-3 text-center border-b"><CardTitle className="text-[10px] font-black uppercase text-slate-500">Classification</CardTitle></CardHeader>
          <CardContent className="p-6 space-y-8">
            <SidebarList label="Category" icon={<Tag className="w-3 h-3" />} items={availableCats} selected={selectedCats} disabled={selectedWebs.length === 0} onToggle={(v: string) => setSelectedCats(p => p.includes(v) ? p.filter(i => i !== v) : [...p, v])} onAdd={(n: string) => handleAddItem("category", n, "categoriesmaintenance", "title")} />
            <SidebarList label="Brand" icon={<Factory className="w-3 h-3" />} items={availableBrands} selected={selectedBrands} disabled={selectedWebs.length === 0} onToggle={(v: string) => setSelectedBrands(p => p.includes(v) ? p.filter(i => i !== v) : [...p, v])} onAdd={(n: string) => handleAddItem("brand", n, "brand_name", "title")} />
            <SidebarList label="Applications" icon={<LayoutGrid className="w-3 h-3" />} items={availableApps} selected={selectedApps} disabled={selectedWebs.length === 0} onToggle={(v: string) => setSelectedApps(p => p.includes(v) ? p.filter(a => a !== v) : [...p, v])} onAdd={(n: string) => handleAddItem("application", n, "applications", "title")} />
          </CardContent>
        </Card>

        <Card className="border-none ring-1 ring-slate-200 p-4 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1"><Label className="text-[9px] font-black uppercase text-slate-400">Price</Label><Input className="h-9 text-xs font-bold" value={regPrice} onChange={(e) => setRegPrice(e.target.value)} /></div>
            <div className="space-y-1"><Label className="text-[9px] font-black uppercase text-slate-400">Sale</Label><Input className="h-9 text-xs font-bold text-red-500" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} /></div>
          </div>
          <div className="space-y-1"><Label className="text-[9px] font-black uppercase text-slate-400">SKU</Label><Input className="h-9 text-xs font-bold" value={sku} onChange={(e) => setSku(e.target.value)} /></div>
        </Card>

        <Button disabled={isPublishing || selectedWebs.length === 0} onClick={handlePublish} className="w-full bg-[#d11a2a] hover:bg-[#b01622] h-16 rounded-2xl font-black uppercase tracking-widest text-white shadow-xl">
          {isPublishing ? <Loader2 className="animate-spin mr-2" /> : editData ? "Update" : "Publish"}
        </Button>
      </div>
    </div>
  );
}

// --- SUBCOMPONENTS ---

function SidebarList({ label, icon, items, selected, onToggle, onAdd, disabled }: any) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-blue-600">{icon}<Label className="text-[10px] font-black uppercase">{label}</Label></div>
      <div className="space-y-1 max-h-48 overflow-y-auto min-h-[50px]">
        {items.map((item: MasterItem) => (
          <div key={item.id} onClick={() => onToggle(item.name)} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer ${selected.includes(item.name) ? "bg-blue-50" : "hover:bg-slate-50"}`}>
            <Checkbox checked={selected.includes(item.name)} />
            <span className={`text-[11px] font-bold ${selected.includes(item.name) ? "text-blue-700" : "text-slate-600"}`}>{item.name}</span>
          </div>
        ))}
      </div>
      {!disabled && <AddCustomItem placeholder={`Add ${label}...`} onAdd={onAdd} disabled={disabled} />}
    </div>
  );
}

function AddCustomItem({ placeholder, onAdd, disabled }: { placeholder: string; onAdd: (val: string) => void; disabled: boolean; }) {
  const [val, setVal] = useState("");
  const handleAdd = () => { if (val.trim()) { onAdd(val.trim()); setVal(""); } };
  return (
    <div className="flex items-center gap-1">
      <Input disabled={disabled} placeholder={placeholder} value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAdd()} className="h-7 text-[10px]" />
      <Button disabled={disabled || !val.trim()} size="icon" variant="ghost" onClick={handleAdd} className="h-7 w-7"><Plus className="w-4 h-4" /></Button>
    </div>
  );
}

function QrDropzone({ file, existingUrl, onDrop, onRemove }: { file: File | null; existingUrl: string; onDrop: (files: File[]) => void; onRemove: () => void; }) {
  const { getRootProps, getInputProps } = useDropzone({ onDrop, maxFiles: 1 });
  return (
    <div {...getRootProps()} className="relative border-2 border-dashed rounded-xl p-2 text-center cursor-pointer hover:bg-slate-50 transition-all border-slate-200 h-[160px] flex flex-col items-center justify-center bg-white">
      <input {...getInputProps()} />
      {file || existingUrl ? (
        <div className="relative w-full h-full group">
          <img src={file ? URL.createObjectURL(file) : existingUrl} className="w-full h-full object-contain rounded-lg" />
          <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg z-10"><X className="w-3 h-3" /></button>
        </div>
      ) : (
        <div className="flex flex-col items-center"><Zap className="w-6 h-6 mb-2 text-slate-300" /><p className="text-[9px] font-bold text-slate-400 uppercase">QR Code</p></div>
      )}
    </div>
  );
}