"use client";

import * as React from "react";
import { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

// --- TYPES ---
interface MasterItem { id: string; name: string; websites: string[]; }
interface SpecValue { name: string; value: string; }

const WEBSITE_OPTIONS = [
  "Ecoshift Corporation",
  "Disruptive Solutions Inc.",
  "Value Acquisitions Holdings"
];

export default function AddProductForm({ editData, onFinished }: { editData?: any; onFinished?: () => void }) {
  const CLOUDINARY_UPLOAD_PRESET = "taskflow_preset";
  const CLOUDINARY_CLOUD_NAME = "dvmpn8mjh";

  const [isPublishing, setIsPublishing] = useState(false);
  const [productName, setProductName] = useState("");
  const [shortDesc, setShortDesc] = useState("");
  const [sku, setSku] = useState("");
  const [regPrice, setRegPrice] = useState("");
  const [salePrice, setSalePrice] = useState("");

  // MASTER DATA (FETCHED)
  const [availableSpecs, setAvailableSpecs] = useState<MasterItem[]>([]);
  const [availableCats, setAvailableCats] = useState<MasterItem[]>([]);
  const [availableBrands, setAvailableBrands] = useState<MasterItem[]>([]);
  const [availableApps, setAvailableApps] = useState<MasterItem[]>([]);

  // SELECTIONS
  const [selectedWebs, setSelectedWebs] = useState<string[]>([]);
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedApps, setSelectedApps] = useState<string[]>([]);
  
  // DYNAMIC SPEC VALUES
  const [specValues, setSpecValues] = useState<Record<string, string>>({});

  // IMAGES
  const [mainImage, setMainImage] = useState<File | null>(null);
  const [galleryImages, setGalleryImages] = useState<File[]>([]);
  const [existingMainImage, setExistingMainImage] = useState("");
  const [existingGalleryImages, setExistingGalleryImages] = useState<string[]>([]);

  // --- 1. DYNAMIC DATA FETCHING BASED ON WEBSITES ---
  useEffect(() => {
    if (selectedWebs.length === 0) {
      setAvailableSpecs([]); setAvailableCats([]); setAvailableBrands([]); setAvailableApps([]);
      return;
    }

    // Filters for items that belong to ANY of the selected websites
    const qFilter = where("websites", "array-contains-any", selectedWebs);

    const unsubSpecs = onSnapshot(query(collection(db, "specs"), qFilter), (snap) => {
      setAvailableSpecs(snap.docs.map(d => ({ id: d.id, ...d.data() } as MasterItem)));
    });
    const unsubCats = onSnapshot(query(collection(db, "categoriesmaintenance"), qFilter), (snap) => {
      setAvailableCats(snap.docs.map(d => ({ id: d.id, ...d.data() } as MasterItem)));
    });
    const unsubBrands = onSnapshot(query(collection(db, "brand_name"), qFilter), (snap) => {
      setAvailableBrands(snap.docs.map(d => ({ id: d.id, ...d.data() } as MasterItem)));
    });
    const unsubApps = onSnapshot(query(collection(db, "applications"), qFilter), (snap) => {
      setAvailableApps(snap.docs.map(d => ({ id: d.id, ...d.data() } as MasterItem)));
    });

    return () => { unsubSpecs(); unsubCats(); unsubBrands(); unsubApps(); };
  }, [selectedWebs]);

  // --- 2. EDIT MODE SYNC ---
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

      if (editData.technicalSpecs) {
        const values: Record<string, string> = {};
        editData.technicalSpecs.forEach((s: SpecValue) => { values[s.name] = s.value; });
        setSpecValues(values);
      }
    }
  }, [editData]);

  // --- 3. IMAGE UPLOAD ---
  const uploadToCloudinary = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, { method: "POST", body: formData });
    const data = await res.json();
    return data.secure_url;
  };

  const handlePublish = async () => {
    if (!productName || selectedWebs.length === 0) return toast.error("Please select at least one website and name!");
    setIsPublishing(true);
    const publishToast = toast.loading("Publishing...");

    try {
      const mainUrl = mainImage ? await uploadToCloudinary(mainImage) : existingMainImage;
      const uploadedGallery = await Promise.all(galleryImages.map(uploadToCloudinary));
      
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
        galleryImages: [...existingGalleryImages, ...uploadedGallery],
        website: selectedWebs, // Now storing as array
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
      toast.error("Error saving product");
    } finally {
      setIsPublishing(false);
    }
  };

  // Dropzone Handlers
  const onDropMain = useCallback((files: File[]) => { if (files[0]) setMainImage(files[0]); }, []);
  const { getRootProps: getMainRootProps, getInputProps: getMainInputProps } = useDropzone({ onDrop: onDropMain, maxFiles: 1 });

  const onDropGallery = useCallback((files: File[]) => { setGalleryImages(prev => [...prev, ...files]); }, []);
  const { getRootProps: getGalleryRootProps, getInputProps: getGalleryInputProps } = useDropzone({ onDrop: onDropGallery });

  const toggleWebsite = (web: string) => {
    setSelectedWebs(prev => prev.includes(web) ? prev.filter(w => w !== web) : [...prev, web]);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 bg-slate-50 min-h-screen">
      <div className="md:col-span-2 space-y-6">
        
        {/* TOP: WEBSITE SELECTOR */}
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
                  selectedWebs.includes(web) ? 'border-blue-500 bg-blue-50 ring-4 ring-blue-500/5' : 'border-slate-100 bg-white hover:border-slate-200'
                }`}
              >
                <span className={`text-[11px] font-black uppercase ${selectedWebs.includes(web) ? 'text-blue-700' : 'text-slate-500'}`}>{web}</span>
                <Checkbox checked={selectedWebs.includes(web)} />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* MAIN IMAGE DROPZONE */}
        <Card className="shadow-sm border-none ring-1 ring-slate-200">
          <CardHeader><CardTitle className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Main Product Image</CardTitle></CardHeader>
          <CardContent>
            <div {...getMainRootProps()} className="border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer hover:bg-slate-50 transition-all border-slate-200">
              <input {...getMainInputProps()} />
              {mainImage || existingMainImage ? (
                <div className="relative w-40 h-40 mx-auto">
                  <img 
                    src={mainImage ? URL.createObjectURL(mainImage) : existingMainImage} 
                    className="w-full h-full object-contain rounded-lg" 
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded-lg">
                    <p className="text-white text-[10px] font-bold">CHANGE IMAGE</p>
                  </div>
                </div>
              ) : (
                <div className="py-4">
                  <ImagePlus className="w-10 h-10 mb-2 mx-auto text-slate-300" />
                  <p className="text-[10px] font-black uppercase text-slate-400">Upload Main Image</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* MAIN FORM */}
        <Card className="shadow-sm border-none ring-1 ring-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-700 font-black text-xs uppercase tracking-widest">
              <AlignLeft className="w-4 h-4 text-blue-500" /> General Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400">Product Name</Label>
              <Input className="h-12 text-lg font-bold" value={productName} onChange={(e) => setProductName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400">Short Description</Label>
              <Input className="h-12 text-sm" value={shortDesc} onChange={(e) => setShortDesc(e.target.value)} />
            </div>

            {/* DYNAMIC TECHNICAL SPECIFICATIONS */}
            <div className="pt-6 border-t border-slate-100">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-4 h-4 text-amber-500" />
                <Label className="text-[11px] font-black uppercase text-slate-500">Technical Specifications</Label>
              </div>
              
              {selectedWebs.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                   <p className="text-[10px] font-bold text-slate-400 uppercase">Select websites to load spec requirements</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {availableSpecs.map((spec) => (
                    <div key={spec.id} className="space-y-1 bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                      <Label className="text-[10px] font-black uppercase text-slate-500">{spec.name}</Label>
                      <Input 
                        placeholder={`Enter ${spec.name}...`}
                        className="h-9 text-xs border-none bg-slate-50 font-medium"
                        value={specValues[spec.name] || ""}
                        onChange={(e) => setSpecValues(prev => ({ ...prev, [spec.name]: e.target.value }))}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* GALLERY */}
        <Card className="shadow-sm border-none ring-1 ring-slate-200">
           <CardHeader><CardTitle className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Gallery Images</CardTitle></CardHeader>
           <CardContent className="space-y-4">
              <div {...getGalleryRootProps()} className="border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer hover:bg-slate-50 transition-all border-slate-200">
                <input {...getGalleryInputProps()} />
                <ImagePlus className="w-10 h-10 mb-2 mx-auto text-slate-300" />
                <p className="text-[10px] font-black uppercase text-slate-400">Drag & Drop Gallery Images</p>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {existingGalleryImages.map((img, i) => (
                  <div key={`exist-${i}`} className="aspect-square relative border rounded-xl overflow-hidden shadow-sm">
                    <img src={img} className="object-cover w-full h-full" />
                  </div>
                ))}
                {galleryImages.map((img, i) => (
                  <div key={`new-${i}`} className="aspect-square relative border rounded-xl overflow-hidden shadow-sm">
                    <img src={URL.createObjectURL(img)} className="object-cover w-full h-full" />
                  </div>
                ))}
              </div>
           </CardContent>
        </Card>
      </div>

      {/* SIDEBAR */}
      <div className="space-y-6">
        <Card className="border-none ring-1 ring-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/50 py-3 text-center border-b">
            <CardTitle className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Classification</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-8">
            <SidebarList 
              label="Category" 
              icon={<Tag className="w-3 h-3"/>} 
              items={availableCats} 
              selected={selectedCats} 
              onToggle={(v: string) => setSelectedCats([v])} 
            />
            <SidebarList 
              label="Brand" 
              icon={<Factory className="w-3 h-3"/>} 
              items={availableBrands} 
              selected={selectedBrands} 
              onToggle={(v: string) => setSelectedBrands([v])} 
            />
            <SidebarList 
              label="Applications" 
              icon={<LayoutGrid className="w-3 h-3"/>} 
              items={availableApps} 
              selected={selectedApps} 
              onToggle={(v: string) => setSelectedApps(prev => prev.includes(v) ? prev.filter(a => a !== v) : [...prev, v])} 
            />
          </CardContent>
        </Card>

        {/* PRICE CARD */}
        <Card className="border-none ring-1 ring-slate-200 p-4 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[9px] font-black uppercase text-slate-400">Regular Price</Label>
              <Input className="h-9 text-xs font-bold" value={regPrice} onChange={e => setRegPrice(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-[9px] font-black uppercase text-slate-400">Sale Price</Label>
              <Input className="h-9 text-xs font-bold text-red-500" value={salePrice} onChange={e => setSalePrice(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-[9px] font-black uppercase text-slate-400">SKU / Model</Label>
            <Input className="h-9 text-xs font-bold" value={sku} onChange={e => setSku(e.target.value)} />
          </div>
        </Card>

        <Button 
          disabled={isPublishing || selectedWebs.length === 0} 
          onClick={handlePublish} 
          className="w-full bg-[#d11a2a] hover:bg-[#b01622] h-16 rounded-2xl font-black uppercase tracking-widest text-white shadow-xl shadow-red-200 active:scale-95 transition-all"
        >
          {isPublishing ? <Loader2 className="animate-spin mr-2"/> : editData ? "Update Product" : "Publish Product"}
        </Button>
      </div>
    </div>
  );
}

function SidebarList({ label, icon, items, selected, onToggle }: any) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-blue-600">
        {icon}
        <Label className="text-[10px] font-black uppercase tracking-tighter">{label}</Label>
      </div>
      {items.length === 0 ? (
        <p className="text-[9px] text-slate-400 italic">No items found for selected websites.</p>
      ) : (
        <div className="space-y-1 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
          {items.map((item: MasterItem) => (
            <div 
              key={item.id} 
              onClick={() => onToggle(item.name)}
              className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${
                selected.includes(item.name) ? 'bg-blue-50 ring-1 ring-blue-100' : 'hover:bg-slate-50'
              }`}
            >
              <Checkbox checked={selected.includes(item.name)} />
              <span className={`text-[11px] font-bold ${selected.includes(item.name) ? 'text-blue-700' : 'text-slate-600'}`}>
                {item.name}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}