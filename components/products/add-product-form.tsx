"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  deleteDoc,
  doc,
  onSnapshot,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";
import {
  ImagePlus,
  UploadCloud,
  X,
  Loader2,
  AlignLeft,
  Trash2,
  Plus,
  Globe,
  Tag,
  Factory,
  Settings2,
} from "lucide-react";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// --- TYPES ---
interface ListItem { id: string; name: string; }
interface SpecRow { name: string; value: string; }
interface SpecBlock { id: number; label: string; rows: SpecRow[]; }

interface CustomSectionData {
  id: string;
  title: string;
  items: ListItem[];
  selected: string[];
}

interface SidebarSectionProps {
  label: string;
  icon: React.ReactNode;
  items: ListItem[];
  selected: string[];
  onCheck: (value: string) => void;
  val: string;
  setVal: (value: string) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
  customAddLogic?: (val: string) => void;
  isDynamic?: boolean;
  onDeleteSection?: () => void;
  multiSelect?: boolean;
}

interface CatalogItem {
  id: number;
  file?: File;
  existingUrl?: string;
}

interface AddNewProductProps {
  editData?: any;
  onFinished?: () => void;
}

export default function AddProductForm({ editData, onFinished }: AddNewProductProps) {
  const CLOUDINARY_UPLOAD_PRESET = "taskflow_preset";
  const CLOUDINARY_CLOUD_NAME = "dvmpn8mjh";

  const [isPublishing, setIsPublishing] = useState(false);
  const [productName, setProductName] = useState("");
  const [shortDesc, setShortDesc] = useState("");
  const [sku, setSku] = useState("");
  const [regPrice, setRegPrice] = useState("");
  const [salePrice, setSalePrice] = useState("");

  const [descBlocks, setDescBlocks] = useState<SpecBlock[]>([
    { id: Date.now(), label: "Technical Specifications", rows: [{ name: "Watts", value: "" }, { name: "Voltage", value: "" }] },
  ]);

  const [categories, setCategories] = useState<ListItem[]>([]);
  const [brands, setBrands] = useState<ListItem[]>([]);
  const [websites, setWebsites] = useState<ListItem[]>([]);
  const [customSections, setCustomSections] = useState<CustomSectionData[]>([]);

  const [newCat, setNewCat] = useState("");
  const [newBrand, setNewBrand] = useState("");
  const [newWeb, setNewWeb] = useState("");
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedWebs, setSelectedWebs] = useState<string[]>([]);

  const [isAddingNewSection, setIsAddingNewSection] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState("");

  // IMAGE & FILE STATES
  const [mainImage, setMainImage] = useState<File | null>(null);
  const [galleryImages, setGalleryImages] = useState<File[]>([]);
  const [existingMainImage, setExistingMainImage] = useState("");
  const [existingGalleryImages, setExistingGalleryImages] = useState<string[]>([]);
  
  // Catalog Items: Combined new and existing
  const [catalogs, setCatalogs] = useState<CatalogItem[]>([{ id: Date.now() }]);

  // --- FETCH MASTER DATA ---
  useEffect(() => {
    const unsubCats = onSnapshot(collection(db, "categories"), (snap) => {
      setCategories(snap.docs.map((d) => ({ id: d.id, name: d.data().name })));
    });
    const unsubBrands = onSnapshot(collection(db, "brands"), (snap) => {
      setBrands(snap.docs.map((d) => ({ id: d.id, name: d.data().name })));
    });
    const unsubWebs = onSnapshot(collection(db, "websites"), (snap) => {
      setWebsites(snap.docs.map((d) => ({ id: d.id, name: d.data().name })));
    });
    const unsubCustom = onSnapshot(collection(db, "custom_sections"), (snap) => {
      setCustomSections(snap.docs.map((d) => ({
        id: d.id,
        title: d.data().title,
        items: d.data().items || [],
        selected: [],
      })));
    });
    return () => { unsubCats(); unsubBrands(); unsubWebs(); unsubCustom(); };
  }, []);

  // --- AUTO-FILL LOGIC (EDIT MODE) ---
  useEffect(() => {
    if (editData) {
      setProductName(editData.name || "");
      setShortDesc(editData.shortDescription || "");
      setSku(editData.sku || "");
      setRegPrice(editData.regularPrice?.toString() || "");
      setSalePrice(editData.salePrice?.toString() || "");
      setDescBlocks(editData.technicalSpecs || []);
      setSelectedCats(editData.category ? [editData.category] : []);
      setSelectedBrands(editData.brand ? [editData.brand] : []);
      setSelectedWebs(editData.website ? [editData.website] : []);
      setExistingMainImage(editData.mainImage || "");
      setExistingGalleryImages(editData.galleryImages || []);

      // Logic para sa Catalogs: Existing files + one empty slot for new upload
      if (editData.catalogs?.length) {
        const loaded = editData.catalogs.map((url: string, i: number) => ({
          id: i,
          existingUrl: url
        }));
        setCatalogs([...loaded, { id: Date.now() }]);
      } else {
        setCatalogs([{ id: Date.now() }]);
      }

      if (editData.dynamicSpecs && customSections.length > 0) {
        setCustomSections((prevSections) =>
          prevSections.map((section) => {
            const matchingSpecs = editData.dynamicSpecs.filter((spec: any) => spec.title === section.title);
            return { ...section, selected: matchingSpecs.map((spec: any) => spec.value) };
          })
        );
      }
    }
  }, [editData, customSections.length > 0]);

  // --- CLOUDINARY UPLOAD ---
  const uploadToCloudinary = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, { method: "POST", body: formData });
    const data = await res.json();
    return data.secure_url;
  };

  // --- ACTIONS ---
  const handleQuickAdd = async (colName: string, val: string, setVal: (v: string) => void) => {
    if (!val.trim()) return;
    try {
      await addDoc(collection(db, colName), { name: val.trim(), createdAt: serverTimestamp() });
      setVal("");
      toast.success("Added to database");
    } catch (err) { toast.error("Failed to add"); }
  };

  const handleDeleteItem = async (colName: string, id: string) => {
    try {
      await deleteDoc(doc(db, colName, id));
      toast.success("Deleted successfully");
    } catch (err) { toast.error("Delete failed"); }
  };

  const handleAddChoiceToCustom = async (sectionId: string, choiceName: string) => {
    if (!choiceName.trim()) return;
    try {
      const sectionRef = doc(db, "custom_sections", sectionId);
      await updateDoc(sectionRef, { items: arrayUnion({ id: Date.now().toString(), name: choiceName }) });
    } catch (err) { toast.error("Error adding choice"); }
  };

  const handleCreateNewSection = async () => {
    if (!newSectionTitle.trim()) return;
    try {
      await addDoc(collection(db, "custom_sections"), { title: newSectionTitle.toUpperCase(), items: [], createdAt: serverTimestamp() });
      setNewSectionTitle("");
      setIsAddingNewSection(false);
      toast.success("New section added");
    } catch (err) { toast.error("Error creating section"); }
  };

  // --- PUBLISH / UPDATE PRODUCT ---
  const handlePublish = async () => {
    if (!productName || (!mainImage && !existingMainImage)) return toast.error("Required fields missing!");
    setIsPublishing(true);
    const publishToast = toast.loading(editData ? "Updating Product..." : "Publishing Product...");

    try {
      // 1. Main Image
      const mainUrl = mainImage ? await uploadToCloudinary(mainImage) : existingMainImage;

      // 2. Gallery Images (Combine Existing + New Uploads)
      const newlyUploadedGallery = await Promise.all(galleryImages.map(img => uploadToCloudinary(img)));
      const finalGalleryUrls = [...existingGalleryImages, ...newlyUploadedGallery];

      // 3. Catalogs (Combine Existing + New Uploads)
      const finalCatalogUrls = await Promise.all(
        catalogs.map(async (c) => {
          if (c.file) return await uploadToCloudinary(c.file);
          return c.existingUrl || null;
        })
      );

      const dynamicSpecs = customSections.flatMap((section) =>
        section.selected.map((val) => ({ title: section.title, value: val }))
      );

      const productPayload = {
        name: productName,
        shortDescription: shortDesc,
        sku,
        regularPrice: Number(regPrice) || 0,
        salePrice: Number(salePrice) || 0,
        technicalSpecs: descBlocks,
        dynamicSpecs,
        mainImage: mainUrl,
        galleryImages: finalGalleryUrls,
        catalogs: finalCatalogUrls.filter(Boolean), // Clean nulls
        category: selectedCats[0] || "Uncategorized",
        brand: selectedBrands[0] || "Generic",
        website: selectedWebs[0] || "N/A",
        updatedAt: serverTimestamp(),
      };

      if (editData?.id) {
        await updateDoc(doc(db, "products", editData.id), productPayload);
        toast.success("Product Updated Successfully!", { id: publishToast });
      } else {
        await addDoc(collection(db, "products"), { ...productPayload, createdAt: serverTimestamp() });
        toast.success("Product Published Successfully!", { id: publishToast });
      }

      if (onFinished) onFinished();
    } catch (error) {
      console.error(error);
      toast.error("Process failed. Please try again.", { id: publishToast });
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 bg-slate-50 min-h-screen">
      {/* LEFT COLUMN */}
      <div className="md:col-span-2 space-y-6">
        <Card className="shadow-sm border-none ring-1 ring-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-700 font-black text-xs uppercase tracking-widest">
              <AlignLeft className="w-4 h-4 text-blue-500" /> General Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400 tracking-tighter">Product Name</Label>
              <Input className="h-12 text-lg font-bold border-slate-200" value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="Enter product name..." />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400 tracking-tighter">Short Description</Label>
              <Input className="h-12 text-sm border-slate-200" value={shortDesc} onChange={(e) => setShortDesc(e.target.value)} placeholder="Short highlight of the product..." />
            </div>

            {/* SPECS BLOCKS */}
            <div className="space-y-4">
              {descBlocks.map((block, bIdx) => (
                <div key={block.id} className="p-5 border-2 border-slate-100 rounded-2xl relative bg-white shadow-sm">
                  <Input className="mb-4 h-8 text-[11px] font-black uppercase w-1/2 bg-slate-50 border-none" value={block.label} onChange={(e) => { const nb = [...descBlocks]; nb[bIdx].label = e.target.value; setDescBlocks(nb); }} />
                  <div className="space-y-2">
                    {block.rows.map((row, rIdx) => (
                      <div key={rIdx} className="grid grid-cols-12 gap-2">
                        <Input className="col-span-5 h-9 text-xs font-bold" value={row.name} onChange={(e) => { const nb = [...descBlocks]; nb[bIdx].rows[rIdx].name = e.target.value; setDescBlocks(nb); }} placeholder="e.g. Watts" />
                        <Input className="col-span-6 h-9 text-xs" value={row.value} onChange={(e) => { const nb = [...descBlocks]; nb[bIdx].rows[rIdx].value = e.target.value; setDescBlocks(nb); }} placeholder="e.g. 50W" />
                        <button onClick={() => { const nb = [...descBlocks]; nb[bIdx].rows = nb[bIdx].rows.filter((_, i) => i !== rIdx); setDescBlocks(nb); }} className="col-span-1 flex justify-center items-center"><Trash2 className="w-4 h-4 text-slate-300 hover:text-red-500" /></button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" className="w-full text-[10px] font-bold border-dashed border-2" onClick={() => { const nb = [...descBlocks]; nb[bIdx].rows.push({ name: "", value: "" }); setDescBlocks(nb); }}>+ ADD NEW ROW</Button>
                  </div>
                </div>
              ))}
            </div>

            {/* CATALOGS SECTION */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <Label className="text-[11px] font-black uppercase text-slate-500">Catalogs & Manuals (PDF / Images)</Label>
              <div className="grid grid-cols-1 gap-2">
                {catalogs.map((cat, index) => (
                  <div key={cat.id} className="border-2 border-dashed rounded-xl p-4 bg-slate-50 flex items-center justify-between group">
                    <label className="cursor-pointer flex-1">
                      {cat.file ? (
                        <p className="text-xs font-bold text-green-600 flex items-center gap-2"><UploadCloud size={14}/> {cat.file.name}</p>
                      ) : cat.existingUrl ? (
                        <a href={cat.existingUrl} target="_blank" className="text-xs font-bold text-blue-600 underline">View Current File ({index + 1})</a>
                      ) : (
                        <div className="flex items-center gap-2 text-slate-400">
                          <Plus size={16}/>
                          <span className="text-[11px] font-bold uppercase">Attach New Catalog</span>
                        </div>
                      )}
                      <input type="file" accept="application/pdf,image/*" className="hidden" onChange={(e) => {
                        const file = e.target.files?.[0]; if (!file) return;
                        setCatalogs(prev => {
                          const updated = [...prev]; 
                          updated[index] = { ...updated[index], file };
                          // Pag nag-upload sa huling slot, dagdag ulit ng panibagong blank slot
                          if (index === prev.length - 1) updated.push({ id: Date.now() });
                          return updated;
                        });
                      }} />
                    </label>
                    {(cat.file || cat.existingUrl) && (
                      <button onClick={() => setCatalogs(prev => prev.filter(c => c.id !== cat.id))} className="text-red-400 hover:text-red-600">
                        <X size={16}/>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* GALLERY SECTION */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <Label className="text-[11px] font-black uppercase text-slate-500">Gallery Images</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Existing Images */}
                {existingGalleryImages.map((url, index) => (
                  <div key={`ex-${index}`} className="relative border-2 border-dashed rounded-xl p-1 bg-slate-50 h-28 group">
                    <img src={url} className="object-contain h-full w-full rounded-lg" />
                    <button onClick={() => setExistingGalleryImages(prev => prev.filter((_, i) => i !== index))} className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 text-white shadow-lg"><X size={12}/></button>
                  </div>
                ))}
                {/* New Image Previews */}
                {galleryImages.map((img, index) => (
                  <div key={`new-${index}`} className="relative border-2 border-dashed rounded-xl p-1 bg-blue-50 h-28">
                    <img src={URL.createObjectURL(img)} className="object-contain h-full w-full rounded-lg" />
                    <button onClick={() => setGalleryImages(prev => prev.filter((_, i) => i !== index))} className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 text-white shadow-lg"><X size={12}/></button>
                  </div>
                ))}
                <label className="border-2 border-dashed border-blue-200 rounded-xl flex flex-col items-center justify-center h-28 cursor-pointer hover:bg-blue-50 transition-all text-blue-400">
                  <Plus size={24} />
                  <span className="text-[9px] font-black uppercase mt-1">Add Photo</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) setGalleryImages(prev => [...prev, file]); }} />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
                <div className="space-y-1"><Label className="text-[10px] font-black uppercase text-slate-400">Regular Price</Label><Input className="h-10 text-xs font-bold" value={regPrice} onChange={(e) => setRegPrice(e.target.value)} /></div>
                <div className="space-y-1"><Label className="text-[10px] font-black uppercase text-slate-400">Sale Price</Label><Input className="h-10 text-xs font-bold text-red-500" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} /></div>
                <div className="space-y-1"><Label className="text-[10px] font-black uppercase text-slate-400">SKU / Model Number</Label><Input className="h-10 text-xs font-bold" value={sku} onChange={(e) => setSku(e.target.value)} /></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* RIGHT COLUMN */}
      <div className="space-y-6">
        {/* Main Featured Image */}
        <Card className="border-none ring-1 ring-slate-200 overflow-hidden shadow-sm">
          <CardHeader className="bg-slate-50/50 border-b py-3 text-center"><CardTitle className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Main Product Image</CardTitle></CardHeader>
          <CardContent className="pt-6">
            <Label htmlFor="main-file" className="cursor-pointer">
              <div className="aspect-square border-2 border-dashed rounded-2xl flex flex-col items-center justify-center hover:bg-blue-50/30 transition-all overflow-hidden bg-white border-slate-200">
                {mainImage ? <img src={URL.createObjectURL(mainImage)} className="w-full h-full object-contain p-2" /> : existingMainImage ? <img src={existingMainImage} className="w-full h-full object-contain p-2" /> : <div className="text-center"><ImagePlus className="w-12 h-12 mb-2 text-blue-500 mx-auto opacity-30"/><span className="text-[10px] font-black uppercase text-slate-400 block">Click to Upload</span></div>}
              </div>
              <input type="file" id="main-file" className="hidden" onChange={(e) => setMainImage(e.target.files?.[0] || null)} />
            </Label>
          </CardContent>
        </Card>

        {/* Classification Sidebar */}
        <Card className="border-none ring-1 ring-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b py-3 text-center"><CardTitle className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Classification</CardTitle></CardHeader>
          <CardContent className="space-y-6 pt-6">
            <SidebarSection label="Target Website" icon={<Globe className="w-3 h-3"/>} items={websites} selected={selectedWebs} onCheck={(v: string) => setSelectedWebs(selectedWebs.includes(v) ? [] : [v])} val={newWeb} setVal={setNewWeb} onAdd={() => handleQuickAdd("websites", newWeb, setNewWeb)} onDelete={(id: string) => handleDeleteItem("websites", id)} />
            <SidebarSection label="Category" icon={<Tag className="w-3 h-3"/>} items={categories} selected={selectedCats} onCheck={(v: string) => setSelectedCats(selectedCats.includes(v) ? [] : [v])} val={newCat} setVal={setNewCat} onAdd={() => handleQuickAdd("categories", newCat, setNewCat)} onDelete={(id: string) => handleDeleteItem("categories", id)} />
            <SidebarSection label="Brand" icon={<Factory className="w-3 h-3"/>} items={brands} selected={selectedBrands} onCheck={(v: string) => setSelectedBrands(selectedBrands.includes(v) ? [] : [v])} val={newBrand} setVal={setNewBrand} onAdd={() => handleQuickAdd("brands", newBrand, setNewBrand)} onDelete={(id: string) => handleDeleteItem("brands", id)} />

            {/* Dynamic Custom Sections */}
            <div className="pt-4 border-t border-slate-100 space-y-6">
              <Label className="text-[9px] font-black uppercase text-blue-600 flex items-center gap-1"><Settings2 size={12}/> Attribute Sections</Label>
              {customSections.map((sec) => (
                <div key={sec.id} className="relative p-3 rounded-2xl bg-slate-50/50 border border-slate-100">
                  <SidebarSection 
                    label={sec.title} icon={<Plus className="w-3 h-3 text-blue-500"/>} items={sec.items} selected={sec.selected} multiSelect={true}
                    onCheck={(v: string) => setCustomSections(prev => prev.map(s => s.id === sec.id ? { ...s, selected: s.selected.includes(v) ? s.selected.filter(item => item !== v) : [...s.selected, v] } : s))}
                    val={""} setVal={() => {}} onAdd={() => {}}
                    onDelete={async (itemId: string) => {
                      const sRef = doc(db, "custom_sections", sec.id);
                      await updateDoc(sRef, { items: sec.items.filter(i => i.id !== itemId) });
                    }} 
                    customAddLogic={(val: string) => handleAddChoiceToCustom(sec.id, val)} isDynamic={true} onDeleteSection={() => handleDeleteItem("custom_sections", sec.id)}
                  />
                </div>
              ))}
              
              {!isAddingNewSection ? (
                <Button variant="outline" className="w-full h-10 border-dashed border-2 rounded-xl text-[10px] font-black text-slate-400 hover:text-blue-500" onClick={() => setIsAddingNewSection(true)}>+ ADD CUSTOM SECTION</Button>
              ) : (
                <div className="p-3 bg-white rounded-2xl border-2 border-blue-100 shadow-lg animate-in zoom-in duration-200">
                  <Input placeholder="SECTION TITLE..." className="h-8 text-[10px] font-black rounded-lg border-none bg-slate-50 uppercase" value={newSectionTitle} onChange={e => setNewSectionTitle(e.target.value)} />
                  <div className="flex gap-2 mt-2">
                    <Button onClick={handleCreateNewSection} className="flex-1 h-7 bg-blue-600 rounded-lg text-[10px] font-bold text-white">SAVE</Button>
                    <Button onClick={() => setIsAddingNewSection(false)} variant="ghost" className="h-7 rounded-lg text-[10px] font-bold">CANCEL</Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Action Button */}
        <Button disabled={isPublishing} onClick={handlePublish} className="w-full bg-[#d11a2a] hover:bg-[#b01622] h-16 rounded-2xl font-black uppercase tracking-[0.2em] text-white shadow-xl shadow-red-200 transition-all active:scale-95">
          {isPublishing ? <><Loader2 className="animate-spin mr-2"/> Processing...</> : editData ? "Update Product" : "Publish Product"}
        </Button>
      </div>
    </div>
  );
}

function SidebarSection({ label, icon, items, selected, onCheck, val, setVal, onAdd, onDelete, customAddLogic, isDynamic, onDeleteSection }: SidebarSectionProps) {
  const [localVal, setLocalVal] = useState("");
  const handleInnerAdd = () => { if (isDynamic && customAddLogic) { customAddLogic(localVal); setLocalVal(""); } else { onAdd(); } };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <Label className="text-[9px] font-black uppercase text-blue-600 flex items-center gap-1">{icon} {label}</Label>
        {isDynamic && (
          <AlertDialog>
            <AlertDialogTrigger asChild><button className="text-slate-300 hover:text-red-500"><Trash2 className="w-3 h-3"/></button></AlertDialogTrigger>
            <AlertDialogContent className="rounded-3xl border-none">
              <AlertDialogHeader>
                <AlertDialogTitle className="font-black uppercase italic">Delete Section?</AlertDialogTitle>
                <AlertDialogDescription className="text-xs">This will remove the <b>{label}</b> section permanently.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel className="rounded-xl text-[10px] uppercase font-bold">Cancel</AlertDialogCancel><AlertDialogAction onClick={onDeleteSection} className="rounded-xl bg-red-600 text-[10px] uppercase font-bold">Delete</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
      <div className="flex gap-1">
        <Input className="h-7 text-[10px] bg-white rounded-lg" placeholder={`Add to ${label}...`} value={isDynamic ? localVal : val} onChange={(e) => isDynamic ? setLocalVal(e.target.value) : setVal(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleInnerAdd()} />
        <Button size="sm" className="h-7 w-7 p-0 bg-blue-500 rounded-lg shadow-sm" onClick={handleInnerAdd}><Plus className="w-4 h-4 text-white"/></Button>
      </div>
      <div className="space-y-1 max-h-40 overflow-y-auto pr-2 border-l-2 border-slate-100 pl-2 custom-scrollbar">
        {items.map((item) => (
          <div key={item.id} className={`flex items-center justify-between group p-1.5 rounded-lg transition-all ${selected.includes(item.name) ? 'bg-blue-50 ring-1 ring-blue-100' : 'hover:bg-slate-50'}`}>
            <div className="flex items-center space-x-2">
              <Checkbox id={item.id} checked={selected.includes(item.name)} onCheckedChange={() => onCheck(item.name)} />
              <Label htmlFor={item.id} className={`text-[11px] font-bold cursor-pointer ${selected.includes(item.name) ? 'text-blue-700' : 'text-slate-600'}`}>{item.name}</Label>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild><button className="opacity-0 group-hover:opacity-100 p-1"><X className="w-3 h-3 text-red-300 hover:text-red-500" /></button></AlertDialogTrigger>
              <AlertDialogContent className="rounded-3xl border-none">
                <AlertDialogHeader>
                  <AlertDialogTitle className="font-black uppercase italic">Delete Item?</AlertDialogTitle>
                  <AlertDialogDescription className="text-xs font-medium">Are you sure you want to delete <b>{item.name}</b>?</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel className="rounded-xl text-[10px] uppercase font-bold">Cancel</AlertDialogCancel><AlertDialogAction onClick={() => onDelete(item.id)} className="rounded-xl bg-red-600 text-[10px] uppercase font-bold">Delete</AlertDialogAction></AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ))}
      </div>
    </div>
  );
}