"use client"

import * as React from "react"
import { useState } from "react"
import { db } from "@/lib/firebase"; 
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ImagePlus, UploadCloud, PlusCircle, X, Loader2, AlignLeft } from "lucide-react" // Added AlignLeft
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function AddNewProductPage() {
  const CLOUDINARY_UPLOAD_PRESET = "taskflow_preset"; 
  const CLOUDINARY_CLOUD_NAME = "dvmpn8mjh";

  const [isPublishing, setIsPublishing] = useState(false);
  const [productName, setProductName] = useState("");
  const [sku, setSku] = useState("");
  const [regPrice, setRegPrice] = useState("");
  const [salePrice, setSalePrice] = useState("");

  // --- UPDATED: PRE-FILLED TEMPLATE ---
  const [descBlocks, setDescBlocks] = useState([
    { 
      id: 1, 
      type: "text", 
      label: "Technical Specifications", 
      value: "WATTS: \nVOLTAGE: \nLUMENS: \nCOLOR TEMP: \nBEAM ANGLE: \nMATERIAL: " 
    }
  ]);
  
  const [mainImage, setMainImage] = useState<File | null>(null);
  const [galleryImage, setGalleryImage] = useState<File | null>(null);
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);

  const categories = ["Uncategorized", "JISO - Bollard Light", "LIT - LED Batten", "LUXIONA - Wall Light"];
  const brands = ["Buildchem", "JISO", "LIT", "ZUMTOBEL", "LUXIONA"];

  const handleCheckbox = (val: string, type: 'cat' | 'brand') => {
    const setter = type === 'cat' ? setSelectedCats : setSelectedBrands;
    const current = type === 'cat' ? selectedCats : selectedBrands;
    setter(current.includes(val) ? current.filter(i => i !== val) : [...current, val]);
  };

  const uploadToCloudinary = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Cloudinary upload failed");
      return data.secure_url;
    } catch (err) {
      throw err;
    }
  };

  const handlePublish = async () => {
    if (!productName || !mainImage) return alert("Paki-lagay ang Product Name at Main Image.");
    setIsPublishing(true);
    try {
      const mainUrl = await uploadToCloudinary(mainImage);
      let galleryUrl = "";
      if (galleryImage) {
        galleryUrl = await uploadToCloudinary(galleryImage);
      }

      await addDoc(collection(db, "products"), {
        name: productName,
        sku: sku,
        regularPrice: Number(regPrice) || 0,
        salePrice: Number(salePrice) || 0,
        descriptionBlocks: descBlocks, // Isasave nito yung listahan ng specs
        mainImage: mainUrl,
        galleryImage: galleryUrl,
        categories: selectedCats,
        brands: selectedBrands,
        createdAt: serverTimestamp(),
      });

      alert("Product Published Successfully!");
      window.location.reload(); 
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 bg-slate-50 min-h-screen">
      <div className="md:col-span-2 space-y-6">
        <Card className="shadow-sm border-none ring-1 ring-slate-200">
          <CardHeader><CardTitle className="flex items-center gap-2"><AlignLeft className="w-5 h-5 text-blue-500"/> Product Information</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Product Name</Label>
              <Input className="h-12 text-lg font-bold" value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="e.g. ZUMTOBEL PENDANT LUMINAIRE" />
            </div>

            {/* --- DYNAMIC DESCRIPTION AREA --- */}
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                <Label className="font-black text-[10px] uppercase tracking-widest text-blue-600">Product Specifications</Label>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-blue-600 font-bold text-[10px] uppercase hover:bg-blue-100"
                  onClick={() => setDescBlocks([...descBlocks, { id: Date.now(), type: "text", label: "New Spec Section", value: "" }])}
                >
                  <PlusCircle className="w-4 h-4 mr-1" /> Add Section
                </Button>
              </div>

              {descBlocks.map((block, index) => (
                <div key={block.id} className="p-5 border-2 border-slate-100 rounded-2xl relative bg-white shadow-sm transition-all focus-within:border-blue-200">
                   <button className="absolute right-3 top-3 text-slate-300 hover:text-red-500 transition-colors" onClick={() => setDescBlocks(descBlocks.filter(b => b.id !== block.id))}><X className="w-5 h-5"/></button>
                   
                   <Input 
                    placeholder="Section Label (e.g. Dimensions)" 
                    className="mb-3 h-9 text-[11px] font-black uppercase tracking-wider w-1/2 border-slate-100 bg-slate-50 focus:bg-white" 
                    value={block.label}
                    onChange={(e) => {
                      const newBlocks = [...descBlocks];
                      newBlocks[index].label = e.target.value;
                      setDescBlocks(newBlocks);
                    }}
                   />
                   
                   <Textarea 
                    placeholder="Enter details..." 
                    className="min-h-[180px] text-sm leading-relaxed font-medium border-slate-100 focus:ring-0 focus:border-blue-400"
                    value={block.value}
                    onChange={(e) => {
                      const newBlocks = [...descBlocks];
                      newBlocks[index].value = e.target.value;
                      setDescBlocks(newBlocks);
                    }}
                   />
                   <p className="mt-2 text-[9px] text-slate-400 font-medium italic">* Fill in the values after the colon ( : )</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-100">
              <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400">SKU</Label><Input className="bg-slate-50 font-bold" value={sku} onChange={(e) => setSku(e.target.value)} /></div>
              <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400">Reg. Price</Label><Input type="number" className="bg-slate-50 font-bold" value={regPrice} onChange={(e) => setRegPrice(e.target.value)} /></div>
              <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400">Sale Price</Label><Input type="number" className="bg-slate-50 font-bold" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} /></div>
            </div>
          </CardContent>
        </Card>

        {/* --- GALLERY CARD (Remains same but with styling) --- */}
        <Card className="border-none ring-1 ring-slate-200 shadow-sm">
          <CardHeader><CardTitle className="text-sm font-black uppercase tracking-widest text-slate-500">Product Gallery</CardTitle></CardHeader>
          <CardContent>
            <Label htmlFor="gallery-file" className="cursor-pointer">
              <div className="border-2 border-dashed border-slate-200 rounded-2xl p-10 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 transition-all group">
                {galleryImage ? <img src={URL.createObjectURL(galleryImage)} className="h-40 object-contain rounded-lg shadow-md" /> : <><UploadCloud className="w-12 h-12 mb-2 text-slate-300 group-hover:text-blue-400"/><p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Click to upload gallery image</p></>}
              </div>
              <input type="file" id="gallery-file" className="hidden" onChange={(e) => setGalleryImage(e.target.files?.[0] || null)} />
            </Label>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        {/* --- MAIN IMAGE CARD --- */}
        <Card className="border-none ring-1 ring-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100"><CardTitle className="text-[10px] font-black uppercase text-slate-500 tracking-widest text-center">Featured Image</CardTitle></CardHeader>
          <CardContent className="pt-6">
            <Label htmlFor="main-file" className="cursor-pointer">
              <div className="aspect-square border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center bg-white hover:border-blue-400 hover:bg-blue-50/30 transition-all overflow-hidden relative">
                {mainImage ? (
                  <img src={URL.createObjectURL(mainImage)} className="w-full h-full object-contain p-4" />
                ) : (
                  <div className="text-center p-4">
                    <ImagePlus className="w-10 h-10 mb-2 text-blue-500 mx-auto opacity-50"/>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Set Main Image</span>
                  </div>
                )}
              </div>
              <input type="file" id="main-file" className="hidden" onChange={(e) => setMainImage(e.target.files?.[0] || null)} />
            </Label>
          </CardContent>
        </Card>

        {/* --- CATEGORIES & BRANDS (Styled as Sidebar) --- */}
        <Card className="border-none ring-1 ring-slate-200 shadow-sm">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100"><CardTitle className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Classification</CardTitle></CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="space-y-3">
              <Label className="text-[9px] font-black uppercase text-blue-600">Categories</Label>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                {categories.map(cat => (
                  <div key={cat} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-slate-50">
                    <Checkbox id={cat} onCheckedChange={() => handleCheckbox(cat, 'cat')} className="border-slate-300" />
                    <Label htmlFor={cat} className="text-xs font-bold text-slate-600 cursor-pointer">{cat}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-100">
              <Label className="text-[9px] font-black uppercase text-blue-600">Brands</Label>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                {brands.map(brand => (
                  <div key={brand} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-slate-50">
                    <Checkbox id={brand} onCheckedChange={() => handleCheckbox(brand, 'brand')} className="border-slate-300" />
                    <Label htmlFor={brand} className="text-xs font-bold text-slate-600 cursor-pointer">{brand}</Label>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Button 
          disabled={isPublishing} 
          onClick={handlePublish} 
          className="w-full bg-[#d11a2a] hover:bg-[#b01622] h-16 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-red-500/20 transition-all hover:scale-[1.02] active:scale-95"
        >
          {isPublishing ? <><Loader2 className="animate-spin mr-2"/> Publishing...</> : "Publish Product"}
        </Button>
      </div>
    </div>
  )
}