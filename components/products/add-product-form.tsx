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
interface MasterItem {
  id: string;
  name: string;
  websites: string[];
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
  const [productName, setProductName] = useState("");
  const [shortDesc, setShortDesc] = useState("");
  const [sku, setSku] = useState("");
  const [regPrice, setRegPrice] = useState("");
  const [salePrice, setSalePrice] = useState("");

  // MASTER DATA
  const [availableSpecs, setAvailableSpecs] = useState<MasterItem[]>([]);
  const [availableCats, setAvailableCats] = useState<MasterItem[]>([]);
  const [availableBrands, setAvailableBrands] = useState<MasterItem[]>([]);
  const [availableApps, setAvailableApps] = useState<MasterItem[]>([]);

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
  const [existingGalleryImages, setExistingGalleryImages] = useState<string[]>(
    [],
  );
  const [existingQrImage, setExistingQrImage] = useState("");

  useEffect(() => {
    // Clear data if no website selected
    if (selectedWebs.length === 0) {
      setAvailableSpecs([]);
      setAvailableCats([]);
      setAvailableBrands([]);
      setAvailableApps([]);
      return;
    }

    // DEBUG: Check what we are querying
    console.log("Querying for websites:", selectedWebs);

    const qFilter = where("websites", "array-contains-any", selectedWebs);

    // 1. SPECS (Already working)
    const unsubSpecs = onSnapshot(
      query(collection(db, "specs"), qFilter),
      (snap) => {
        setAvailableSpecs(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as MasterItem),
        );
      },
    );

    // 2. CATEGORIES
    const unsubCats = onSnapshot(
      query(collection(db, "categoriesmaintenance"), qFilter),
      (snap) => {
        const data = snap.docs.map((d) => {
          const raw = d.data();
          // SAFEGUARD: Check for 'name', 'categoryName', or 'title'
          return {
            id: d.id,
            name:
              raw.name || raw.categoryName || raw.title || "Unnamed Category",
            websites: raw.websites,
          } as MasterItem;
        });
        console.log("Categories Found:", data.length, data); // Check Console
        setAvailableCats(data);
      },
    );

    // 3. BRANDS
    // Note: Collection is 'brand_name', field might be 'brand_name' or 'brand'
    const unsubBrands = onSnapshot(
      query(collection(db, "brands"), qFilter),
      (snap) => {
        const data = snap.docs.map((d) => {
          const raw = d.data();
          // SAFEGUARD: Check for 'name', 'brand', 'brandName', or 'brand_name'
          return {
            id: d.id,
            name:
              raw.name ||
              raw.brands ||
              raw.brandsName ||
              raw.brands_name ||
              "Unnamed Brand",
            websites: raw.websites,
          } as unknown as MasterItem;
        });
        console.log("Brands Found:", data.length, data); // Check Console
        setAvailableBrands(data);
      },
    );

    // 4. APPLICATIONS
    const unsubApps = onSnapshot(
      query(collection(db, "applications"), qFilter),
      (snap) => {
        const data = snap.docs.map((d) => {
          const raw = d.data();
          return {
            id: d.id,
            name: raw.name || raw.applicationName || "Unnamed App",
            websites: raw.websites,
          } as MasterItem;
        });
        console.log("Apps Found:", data.length, data); // Check Console
        setAvailableApps(data);
      },
    );

    return () => {
      unsubSpecs();
      unsubCats();
      unsubBrands();
      unsubApps();
    };
  }, [selectedWebs]);

  useEffect(() => {
    if (editData) {
      setProductName(editData.name || "");
      setShortDesc(editData.shortDescription || "");
      setSku(editData.sku || "");
      setRegPrice(editData.regularPrice?.toString() || "");
      setSalePrice(editData.salePrice?.toString() || "");
      setSelectedWebs(
        Array.isArray(editData.website)
          ? editData.website
          : editData.website
            ? [editData.website]
            : [],
      );
      setSelectedCats(editData.category ? [editData.category] : []);
      setSelectedBrands(editData.brand ? [editData.brand] : []);
      setSelectedApps(editData.applications || []);
      setExistingMainImage(editData.mainImage || "");
      setExistingGalleryImages(editData.galleryImages || []);
      setExistingQrImage(editData.qrCodeImage || "");
      if (editData.technicalSpecs) {
        const values: Record<string, string> = {};
        editData.technicalSpecs.forEach((s: SpecValue) => {
          values[s.name] = s.value;
        });
        setSpecValues(values);
      }
    }
  }, [editData]);

  const uploadToCloudinary = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      { method: "POST", body: formData },
    );
    const data = await res.json();
    return data.secure_url;
  };

  const handlePublish = async () => {
    if (!productName || selectedWebs.length === 0)
      return toast.error("Please select at least one website and name!");
    setIsPublishing(true);
    const publishToast = toast.loading("Publishing...");
    try {
      const mainUrl = mainImage
        ? await uploadToCloudinary(mainImage)
        : existingMainImage;
      const qrUrl = qrImage
        ? await uploadToCloudinary(qrImage)
        : existingQrImage;
      const uploadedGallery = await Promise.all(
        galleryImages.map(uploadToCloudinary),
      );
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
        galleryImages: [...existingGalleryImages, ...uploadedGallery],
        website: selectedWebs,
        category: selectedCats[0] || "",
        brand: selectedBrands[0] || "",
        applications: selectedApps,
        updatedAt: serverTimestamp(),
      };

      if (editData?.id) {
        await updateDoc(doc(db, "products", editData.id), payload);
      } else {
        await addDoc(collection(db, "products"), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      }

      toast.success("Product Saved!", { id: publishToast });
      if (onFinished) onFinished();
    } catch (err) {
      toast.error("Error saving product");
    } finally {
      setIsPublishing(false);
    }
  };

  const onDropMain = useCallback((files: File[]) => {
    if (files[0]) setMainImage(files[0]);
  }, []);
  const { getRootProps: getMainRootProps, getInputProps: getMainInputProps } =
    useDropzone({ onDrop: onDropMain, maxFiles: 1 });

  const onDropGallery = useCallback((files: File[]) => {
    setGalleryImages((prev) => [...prev, ...files]);
  }, []);
  const {
    getRootProps: getGalleryRootProps,
    getInputProps: getGalleryInputProps,
  } = useDropzone({ onDrop: onDropGallery });

  const toggleWebsite = (web: string) => {
    setSelectedWebs((prev) =>
      prev.includes(web) ? prev.filter((w) => w !== web) : [...prev, web],
    );
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
                className={`flex-1 min-w-[180px] p-4 rounded-xl border-2 transition-all cursor-pointer flex justify-between items-center ${selectedWebs.includes(web) ? "border-blue-500 bg-blue-50 ring-4 ring-blue-500/5" : "border-slate-100 bg-white hover:border-slate-200"}`}
              >
                <span
                  className={`text-[11px] font-black uppercase ${selectedWebs.includes(web) ? "text-blue-700" : "text-slate-500"}`}
                >
                  {web}
                </span>
                <Checkbox checked={selectedWebs.includes(web)} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-sm border-none ring-1 ring-slate-200">
          <CardHeader>
            <CardTitle className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
              Main Image & QR Code
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[9px] font-black uppercase text-slate-400">
                Main Product Image
              </Label>
              <div
                {...getMainRootProps()}
                className="relative border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer hover:bg-slate-50 transition-all border-slate-200 min-h-[180px] flex flex-col items-center justify-center"
              >
                <input {...getMainInputProps()} />
                {mainImage || existingMainImage ? (
                  <div className="relative w-full h-32 group">
                    <img
                      src={
                        mainImage
                          ? URL.createObjectURL(mainImage)
                          : existingMainImage
                      }
                      className="w-full h-full object-contain rounded-lg"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMainImage(null);
                        setExistingMainImage("");
                      }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-600 transition-colors z-10"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <ImagePlus className="w-8 h-8 mb-2 mx-auto text-slate-300" />
                    <p className="text-[9px] font-black uppercase text-slate-400">
                      Upload Main
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[9px] font-black uppercase text-slate-400">
                QR Code Image
              </Label>
              <QrDropzone
                file={qrImage}
                existingUrl={existingQrImage}
                onRemove={() => {
                  setQrImage(null);
                  setExistingQrImage("");
                }}
                onDrop={(files) => {
                  if (files[0]) setQrImage(files[0]);
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-none ring-1 ring-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-700 font-black text-xs uppercase tracking-widest">
              <AlignLeft className="w-4 h-4 text-blue-500" /> General
              Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400">
                Product Name
              </Label>
              <Input
                className="h-12 text-lg font-bold"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400">
                Short Description
              </Label>
              <Input
                className="h-12 text-sm"
                value={shortDesc}
                onChange={(e) => setShortDesc(e.target.value)}
              />
            </div>
            <div className="pt-6 border-t border-slate-100">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-4 h-4 text-amber-500" />
                <Label className="text-[11px] font-black uppercase text-slate-500">
                  Technical Specifications
                </Label>
              </div>
              {selectedWebs.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">
                    Select websites to load specs
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {availableSpecs.map((spec) => (
                    <div
                      key={spec.id}
                      className="space-y-1 bg-white p-3 rounded-xl border border-slate-100 shadow-sm"
                    >
                      <Label className="text-[10px] font-black uppercase text-slate-500">
                        {spec.name}
                      </Label>
                      <Input
                        placeholder={`Enter ${spec.name}...`}
                        className="h-9 text-xs border-none bg-slate-50 font-medium"
                        value={specValues[spec.name] || ""}
                        onChange={(e) =>
                          setSpecValues((prev) => ({
                            ...prev,
                            [spec.name]: e.target.value,
                          }))
                        }
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-none ring-1 ring-slate-200">
          <CardHeader>
            <CardTitle className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
              Gallery Images
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              {...getGalleryRootProps()}
              className="border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer hover:bg-slate-50 transition-all border-slate-200"
            >
              <input {...getGalleryInputProps()} />
              <ImagePlus className="w-10 h-10 mb-2 mx-auto text-slate-300" />
              <p className="text-[10px] font-black uppercase text-slate-400">
                Drag & Drop Gallery Images
              </p>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {existingGalleryImages.map((img, i) => (
                <div
                  key={`exist-${i}`}
                  className="aspect-square relative border rounded-xl overflow-hidden shadow-sm group"
                >
                  <img src={img} className="object-cover w-full h-full" />
                  <button
                    onClick={() =>
                      setExistingGalleryImages((prev) =>
                        prev.filter((_, idx) => idx !== i),
                      )
                    }
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {galleryImages.map((img, i) => (
                <div
                  key={`new-${i}`}
                  className="aspect-square relative border rounded-xl overflow-hidden shadow-sm group"
                >
                  <img
                    src={URL.createObjectURL(img)}
                    className="object-cover w-full h-full"
                  />
                  <button
                    onClick={() =>
                      setGalleryImages((prev) =>
                        prev.filter((_, idx) => idx !== i),
                      )
                    }
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="border-none ring-1 ring-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/50 py-3 text-center border-b">
            <CardTitle className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
              Classification
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-8">
            <SidebarList
              label="Category"
              icon={<Tag className="w-3 h-3" />}
              items={availableCats}
              selected={selectedCats}
              onToggle={(v: string) =>
                setSelectedCats((prev) =>
                  prev.includes(v) ? prev.filter((i) => i !== v) : [...prev, v],
                )
              }
            />
            <SidebarList
              label="Brand"
              icon={<Factory className="w-3 h-3" />}
              items={availableBrands}
              selected={selectedBrands}
              onToggle={(v: string) =>
                setSelectedBrands((prev) =>
                  prev.includes(v) ? prev.filter((i) => i !== v) : [...prev, v],
                )
              }
            />
            <SidebarList
              label="Applications"
              icon={<LayoutGrid className="w-3 h-3" />}
              items={availableApps}
              selected={selectedApps}
              onToggle={(v: string) =>
                setSelectedApps((prev) =>
                  prev.includes(v) ? prev.filter((a) => a !== v) : [...prev, v],
                )
              }
            />
          </CardContent>
        </Card>

        <Card className="border-none ring-1 ring-slate-200 p-4 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[9px] font-black uppercase text-slate-400">
                Regular Price
              </Label>
              <Input
                className="h-9 text-xs font-bold"
                value={regPrice}
                onChange={(e) => setRegPrice(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[9px] font-black uppercase text-slate-400">
                Sale Price
              </Label>
              <Input
                className="h-9 text-xs font-bold text-red-500"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-[9px] font-black uppercase text-slate-400">
              SKU / Model
            </Label>
            <Input
              className="h-9 text-xs font-bold"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
            />
          </div>
        </Card>

        <Button
          disabled={isPublishing || selectedWebs.length === 0}
          onClick={handlePublish}
          className="w-full bg-[#d11a2a] hover:bg-[#b01622] h-16 rounded-2xl font-black uppercase tracking-widest text-white shadow-xl shadow-red-200 active:scale-95 transition-all"
        >
          {isPublishing ? (
            <Loader2 className="animate-spin mr-2" />
          ) : editData ? (
            "Update Product"
          ) : (
            "Publish Product"
          )}
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
        <Label className="text-[10px] font-black uppercase tracking-tighter">
          {label}
        </Label>
      </div>
      {items.length === 0 ? (
        <p className="text-[9px] text-slate-400 italic">No items found.</p>
      ) : (
        <div className="space-y-1 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
          {items.map((item: MasterItem) => {
            const isSelected = selected.includes(item.name);
            return (
              <div
                key={item.id}
                onClick={() => onToggle(item.name)}
                className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${isSelected ? "bg-blue-50 ring-1 ring-blue-100" : "hover:bg-slate-50"}`}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => onToggle(item.name)}
                  onClick={(e) => e.stopPropagation()}
                />
                <span
                  className={`text-[11px] font-bold ${isSelected ? "text-blue-700" : "text-slate-600"}`}
                >
                  {item.name}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function QrDropzone({
  file,
  existingUrl,
  onDrop,
  onRemove,
}: {
  file: File | null;
  existingUrl: string;
  onDrop: (files: File[]) => void;
  onRemove: () => void;
}) {
  const { getRootProps, getInputProps } = useDropzone({ onDrop, maxFiles: 1 });
  return (
    <div
      {...getRootProps()}
      className="relative border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer hover:bg-slate-50 transition-all border-slate-200 min-h-[180px] flex flex-col items-center justify-center"
    >
      <input {...getInputProps()} />
      {file || existingUrl ? (
        <div className="relative w-full h-32 group">
          <img
            src={file ? URL.createObjectURL(file) : existingUrl}
            className="w-full h-full object-contain rounded-lg"
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-600 transition-colors z-10"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <div>
          <Zap className="w-8 h-8 mb-2 mx-auto text-slate-300" />
          <p className="text-[9px] font-black uppercase text-slate-400">
            Upload QR Code
          </p>
        </div>
      )}
    </div>
  );
}
