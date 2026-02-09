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
  Link as LinkIcon,
  Search,
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

const WEBSITE_PRODUCT_PATH: Record<string, string> = {
  "Ecoshift Corporation": "/products",
  "Disruptive Solutions Inc.": "/products",
  "Value Acquisitions Holdings": "/solutions",
};

const WEBSITE_DOMAINS: Record<string, string> = {
  "Ecoshift Corporation": "https://ecoshift-website.vercel.app",
  "Disruptive Solutions Inc.": "https://disruptive-solutions-inc.vercel.app",
  "Value Acquisitions Holdings": "https://vah.com.ph",
};

export default function AddNewProduct({
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
  const [existingGalleryImages, setExistingGalleryImages] = useState<string[]>(
    [],
  );
  const [existingQrImage, setExistingQrImage] = useState("");

  // SEO DATA
  const [seoData, setSeoData] = useState({
    title: editData?.seo?.title || "",
    description: editData?.seo?.description || "",
    slug: editData?.slug || "",
    canonical: editData?.seo?.canonical || "",
    ogImage: editData?.seo?.ogImage || "",
    robots: editData?.seo?.robots || "index, follow",
  });
  const [previewMode, setPreviewMode] = useState<"mobile" | "desktop">(
    "desktop",
  );

  // --- AUTO-UPDATE CANONICAL BASED ON WEBSITE ---
  // --- AUTO-UPDATE CANONICAL BASED ON WEBSITE ---
  useEffect(() => {
    if (!seoData.slug || selectedWebs.length === 0) return;

    const website = selectedWebs[0];
    const domain = WEBSITE_DOMAINS[website];
    const path = WEBSITE_PRODUCT_PATH[website] ?? "/products";

    if (!domain) return;

    const nextCanonical = `${domain}${path}/${seoData.slug}`;

    setSeoData((prev) => {
      if (prev.canonical === nextCanonical) return prev;
      return { ...prev, canonical: nextCanonical };
    });
  }, [selectedWebs, seoData.slug]);
  // --- 1. FETCH MASTER DATA ---
  useEffect(() => {
    if (selectedWebs.length === 0) {
      setAvailableCats([]);
      setAvailableBrands([]);
      setAvailableApps([]);
      setAvailableSpecs([]);
      return;
    }

    const qFilter = where("websites", "array-contains-any", selectedWebs);

    const unsubCats = onSnapshot(
      query(collection(db, "categoriesmaintenance"), qFilter),
      (snap) => {
        setAvailableCats((prev) =>
          mergeWithPending(prev, snap, "category", "title"),
        );
      },
    );

    const unsubBrands = onSnapshot(
      query(collection(db, "brand_name"), qFilter),
      (snap) => {
        setAvailableBrands((prev) =>
          mergeWithPending(prev, snap, "brand", "title"),
        );
      },
    );

    const unsubApps = onSnapshot(
      query(collection(db, "applications"), qFilter),
      (snap) => {
        setAvailableApps((prev) =>
          mergeWithPending(prev, snap, "applications", "title"),
        );
      },
    );

    return () => {
      unsubCats();
      unsubBrands();
      unsubApps();
    };
  }, [selectedWebs]);

  // --- FETCH SPECS BASED ON SELECTED CATEGORIES ---
  useEffect(() => {
    if (selectedCats.length === 0) {
      setAvailableSpecs([]);
      return;
    }

    const unsubCategories = onSnapshot(
      collection(db, "categoriesmaintenance"),
      (snap) => {
        const specIdsFromCategories = new Set<string>();
        
        snap.docs.forEach((doc) => {
          const cat = doc.data();
          if (selectedCats.includes(doc.id) && cat.specifications) {
            cat.specifications.forEach((specId: string) => {
              specIdsFromCategories.add(specId);
            });
          }
        });

        if (specIdsFromCategories.size === 0) {
          setAvailableSpecs([]);
          return;
        }

        const unsubSpecs = onSnapshot(
          collection(db, "specs"),
          (specsSnap) => {
            const filteredSpecs = specsSnap.docs
              .filter((doc) => specIdsFromCategories.has(doc.id))
              .map((doc) => ({
                id: doc.id,
                name: doc.data().name || "Unnamed",
              }));

            const currentPending = pendingItemsRef.current
              .filter((p) => p.type === "spec")
              .map((p) => ({
                id: `temp-${p.name}`,
                name: p.name,
                isTemp: true,
              }));

            setAvailableSpecs([...filteredSpecs, ...currentPending]);
          },
        );

        return unsubSpecs;
      },
    );

    return () => {
      unsubCategories();
    };
  }, [selectedCats]);

  // Helper to maintain local pending items in view
  const mergeWithPending = (
    prev: MasterItem[],
    snap: any,
    type: string,
    fieldKey = "name",
  ) => {
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

  // --- 3. HANDLERS ---

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

  const handleAddItem = (
    type: PendingItem["type"],
    name: string,
    collectionName: string,
    dbField: string,
  ) => {
    if (!name.trim()) return;
    const cleanName = name.trim();

    // 1. DUPLICATE CHECK (LOCAL)
    // We check case-insensitive against the list currently loaded in state
    let listToCheck: MasterItem[] = [];
    if (type === "brand") listToCheck = availableBrands;
    if (type === "category") listToCheck = availableCats;
    if (type === "application") listToCheck = availableApps;
    if (type === "spec") listToCheck = availableSpecs;

    const exists = listToCheck.some(
      (item) => item.name.toLowerCase() === cleanName.toLowerCase(),
    );

    if (exists) {
      toast.error(`"${cleanName}" already exists in ${type}s.`);
      return;
    }

    // 2. Add to pending ref
    pendingItemsRef.current.push({
      type,
      name: cleanName,
      collection: collectionName,
      field: dbField,
    });

    // 3. Update local state immediately
    const newItem: MasterItem = {
      id: `temp-${cleanName}`,
      name: cleanName,
      websites: selectedWebs,
      isTemp: true,
    };

    if (type === "brand") {
      setAvailableBrands((prev) => [...prev, newItem]);
      setSelectedBrands((prev) => [...prev, cleanName]);
    } else if (type === "category") {
      setAvailableCats((prev) => [...prev, newItem]);
      setSelectedCats((prev) => [...prev, cleanName]);
    } else if (type === "application") {
      setAvailableApps((prev) => [...prev, newItem]);
      setSelectedApps((prev) => [...prev, cleanName]);
    } else if (type === "spec") {
      setAvailableSpecs((prev) => [...prev, newItem]);
      setSpecValues((prev) => ({ ...prev, [cleanName]: "" }));
    }
  };

  const handlePublish = async () => {
    if (!productName || selectedWebs.length === 0)
      return toast.error("Please select at least one website and name!");

    setIsPublishing(true);
    const publishToast = toast.loading("Validating...");

    try {
      // A. CHECK FOR DUPLICATE PRODUCT NAME
      // We query by name first, then check websites in JS to avoid complex index requirements
      const dupQuery = query(
        collection(db, "products"),
        where("name", "==", productName),
      );
      const dupSnap = await getDocs(dupQuery);

      const isDuplicate = dupSnap.docs.some((docSnap) => {
        // If editing, ignore our own document
        if (editData && docSnap.id === editData.id) return false;

        const data = docSnap.data();
        const productWebsites = data.website || [];
        // Check if any selected website overlaps with the existing product's websites
        return productWebsites.some((w: string) => selectedWebs.includes(w));
      });

      if (isDuplicate) {
        toast.dismiss(publishToast);
        toast.error(
          "This product name already exists on one of the selected websites.",
        );
        setIsPublishing(false);
        return; // STOP EXECUTION
      }

      // B. SAVE PENDING TAGS (Brands/Cats/etc)
      if (pendingItemsRef.current.length > 0) {
        toast.loading("Saving new tags...", { id: publishToast });
        const savePromises = pendingItemsRef.current.map((item) => {
          const payload: any = {
            websites: selectedWebs,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };
          payload[item.field] = item.name;

          if (item.type === "application") {
            payload.isActive = true;
            payload.imageUrl = "";
            payload.description = "";
          }

          return addDoc(collection(db, item.collection), payload);
        });

        await Promise.all(savePromises);
        pendingItemsRef.current = [];
      }

      // C. UPLOAD IMAGES
      toast.loading("Uploading images...", { id: publishToast });
      const mainUrl = mainImage
        ? await uploadToCloudinary(mainImage)
        : existingMainImage;
      const qrUrl = qrImage
        ? await uploadToCloudinary(qrImage)
        : existingQrImage;
      const uploadedGallery = await Promise.all(
        galleryImages.map(uploadToCloudinary),
      );

      // D. PREPARE SPECS
      const technicalSpecs = Object.entries(specValues)
        .filter(([_, val]) => val.trim() !== "")
        .map(([name, value]) => ({ name, value }));

      // E. SAVE PRODUCT
      const payload = {
        name: productName,
        shortDescription: shortDesc,
        slug: seoData.slug,
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
        seo: {
          title: seoData.title || productName,
          description: seoData.description,
          canonical: seoData.canonical,
          ogImage: seoData.ogImage || mainUrl,
          robots: seoData.robots,
          lastUpdated: new Date().toISOString(),
        },
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

      toast.success("Product Saved Successfully!", { id: publishToast });

      // F. CLOSE COMPONENT
      if (onFinished) {
        // Small delay to let the toast be seen, or immediate
        onFinished();
      }
    } catch (err) {
      console.error(err);
      toast.error("Error saving product", { id: publishToast });
    } finally {
      setIsPublishing(false);
    }
  };

  // Drag & Drop Hooks
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
        {/* WEBSITES CARD */}
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
                  selectedWebs.includes(web)
                    ? "border-blue-500 bg-blue-50 ring-4 ring-blue-500/5"
                    : "border-slate-100 bg-white hover:border-slate-200"
                }`}
              >
                <span
                  className={`text-[11px] font-black uppercase ${
                    selectedWebs.includes(web)
                      ? "text-blue-700"
                      : "text-slate-500"
                  }`}
                >
                  {web}
                </span>
                <Checkbox checked={selectedWebs.includes(web)} />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* UNIFIED MEDIA ASSETS CARD */}
        <Card className="shadow-sm border-none ring-1 ring-slate-200">
          <CardHeader>
            <CardTitle className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
              <Images className="w-4 h-4" /> Media Assets
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 1. Main Image */}
              <div className="space-y-2">
                <Label className="text-[9px] font-black uppercase text-slate-400">
                  Main Product Image
                </Label>
                <div
                  {...getMainRootProps()}
                  className="relative border-2 border-dashed rounded-xl p-2 text-center cursor-pointer hover:bg-slate-50 transition-all border-slate-200 h-[160px] flex flex-col items-center justify-center bg-white"
                >
                  <input {...getMainInputProps()} />
                  {mainImage || existingMainImage ? (
                    <div className="relative w-full h-full group">
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
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-600 z-10"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <ImagePlus className="w-6 h-6 mb-2 text-slate-300" />
                      <p className="text-[9px] font-bold text-slate-400 uppercase">
                        Main Image
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* 2. QR Code */}
              <div className="space-y-2">
                <Label className="text-[9px] font-black uppercase text-slate-400">
                  QR Code
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

              {/* 3. Gallery Dropzone */}
              <div className="space-y-2">
                <Label className="text-[9px] font-black uppercase text-slate-400">
                  Add Gallery Images
                </Label>
                <div
                  {...getGalleryRootProps()}
                  className="relative border-2 border-dashed rounded-xl p-2 text-center cursor-pointer hover:bg-blue-50 transition-all border-blue-200 h-[160px] flex flex-col items-center justify-center bg-blue-50/10"
                >
                  <input {...getGalleryInputProps()} />
                  <div className="flex flex-col items-center">
                    <Images className="w-6 h-6 mb-2 text-blue-400" />
                    <p className="text-[9px] font-bold text-blue-500 uppercase">
                      Drop Gallery Here
                    </p>
                    <p className="text-[8px] text-slate-400 mt-1">
                      Multi-select supported
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Row: Gallery Grid */}
            {(existingGalleryImages.length > 0 || galleryImages.length > 0) && (
              <div className="pt-4 border-t border-slate-100">
                <Label className="text-[9px] font-black uppercase text-slate-400 mb-3 block">
                  Gallery Preview
                </Label>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                  {existingGalleryImages.map((img, i) => (
                    <div
                      key={`exist-${i}`}
                      className="aspect-square relative border rounded-lg overflow-hidden shadow-sm group bg-white"
                    >
                      <img
                        src={img || "/placeholder.svg"}
                        className="object-cover w-full h-full"
                      />
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
                      className="aspect-square relative border rounded-lg overflow-hidden shadow-sm group bg-white"
                    >
                      <img
                        src={URL.createObjectURL(img) || "/placeholder.svg"}
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
              </div>
            )}
          </CardContent>
        </Card>

        {/* GENERAL INFO & SPECS */}
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

            {/* SPECS SECTION - Only shown when category is selected */}
            {selectedCats.length > 0 && (
              <div className="pt-6 border-t border-slate-100">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <Label className="text-[11px] font-black uppercase text-slate-500">
                      Technical Specifications
                    </Label>
                  </div>
                  {/* Add Custom Spec Button */}
                  <AddCustomItem
                    placeholder="New Spec Name..."
                    onAdd={(name) => handleAddItem("spec", name, "specs", "name")}
                    disabled={selectedWebs.length === 0}
                  />
                </div>

                {availableSpecs.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">
                      No specs available for selected category
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {availableSpecs.map((spec) => (
                      <div
                        key={spec.id}
                        className={`space-y-1 bg-white p-3 rounded-xl border shadow-sm ${
                          spec.isTemp
                            ? "border-amber-200 ring-2 ring-amber-50"
                            : "border-slate-100"
                        }`}
                      >
                        <Label className="text-[10px] font-black uppercase text-slate-500 flex justify-between">
                          {spec.name}
                          {spec.isTemp && (
                            <span className="text-amber-500 text-[8px]">
                              (New)
                            </span>
                          )}
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
            )}
          </CardContent>
        </Card>
      </div>

      {/* SIDEBAR */}
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
              disabled={selectedWebs.length === 0}
              onToggle={(v: string) =>
                setSelectedCats((prev) =>
                  prev.includes(v) ? prev.filter((i) => i !== v) : [...prev, v],
                )
              }
              onAdd={(name: string) =>
                handleAddItem("category", name, "categoriesmaintenance", "name")
              }
            />
            <SidebarList
              label="Brand"
              icon={<Factory className="w-3 h-3" />}
              items={availableBrands}
              selected={selectedBrands}
              disabled={selectedWebs.length === 0}
              onToggle={(v: string) =>
                setSelectedBrands((prev) =>
                  prev.includes(v) ? prev.filter((i) => i !== v) : [...prev, v],
                )
              }
              onAdd={(name: string) =>
                handleAddItem("brand", name, "brand_name", "title")
              }
            />
            <SidebarList
              label="Applications"
              icon={<LayoutGrid className="w-3 h-3" />}
              items={availableApps}
              selected={selectedApps}
              disabled={selectedWebs.length === 0}
              onToggle={(v: string) =>
                setSelectedApps((prev) =>
                  prev.includes(v) ? prev.filter((a) => a !== v) : [...prev, v],
                )
              }
              onAdd={(name: string) =>
                handleAddItem("application", name, "applications", "title")
              }
            />
          </CardContent>
        </Card>

        {/* PRICING & SKU */}
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

        {/* SEO SECTION */}
        <Card className="border-none ring-1 ring-slate-200 shadow-sm">
          <CardHeader className="bg-slate-50/50 py-3 border-b">
            <CardTitle className="flex items-center gap-2 text-slate-700 font-black text-xs uppercase tracking-widest">
              <Search className="w-4 h-4 text-blue-500" /> SEO Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            {/* INPUT SECTION */}
            <div className="space-y-4 border-b border-slate-100 pb-6">
              <div className="space-y-1.5">
                <Label className="text-slate-500 font-bold text-xs uppercase">
                  SEO Title
                </Label>
                <Input
                  className="h-10 text-xs border-slate-200 bg-slate-50 focus:ring-2 focus:ring-blue-500"
                  placeholder="Product name for Google"
                  value={seoData.title}
                  onChange={(e) =>
                    setSeoData((prev) => ({ ...prev, title: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-500 font-bold text-xs uppercase flex justify-between">
                  URL Slug
                  <span className="text-[10px] text-amber-600 normal-case font-medium">
                    Forward slash (/) is not allowed
                  </span>
                </Label>
                <Input
                  className="h-10 text-xs border-slate-200 bg-slate-50 font-mono text-[#d11a2a] focus:ring-2 focus:ring-blue-500"
                  placeholder="product-name-slug"
                  value={seoData.slug}
                  onChange={(e) => {
                    const sanitized = e.target.value
                      .toLowerCase()
                      .replace(/\//g, "")
                      .replace(/\s+/g, "-");
                    setSeoData((prev) => ({ ...prev, slug: sanitized }));
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-500 font-bold text-xs uppercase">
                  Meta Description
                </Label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 text-sm"
                  placeholder="Brief summary for search results..."
                  value={seoData.description}
                  onChange={(e) =>
                    setSeoData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            {/* LIVE PREVIEW SECTION */}
            <div className="pt-2">
              <div className="flex items-center gap-6 mb-4">
                <span className="text-[10px] font-black uppercase text-slate-400">
                  Google Preview:
                </span>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-600">
                    <input
                      type="radio"
                      name="view"
                      checked={previewMode === "mobile"}
                      onChange={() => setPreviewMode("mobile")}
                      className="text-blue-500"
                    />
                    Mobile
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-600">
                    <input
                      type="radio"
                      name="view"
                      checked={previewMode === "desktop"}
                      onChange={() => setPreviewMode("desktop")}
                      className="text-blue-500"
                    />
                    Desktop
                  </label>
                </div>
              </div>

              {/* CANONICAL URL DISPLAY */}
              {seoData.canonical && (
                <div className="mb-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                  <p className="text-[10px] font-bold text-blue-600 uppercase mb-1">
                    Canonical URL
                  </p>
                  <p className="text-xs text-blue-700 font-mono break-all">
                    {seoData.canonical}
                  </p>
                </div>
              )}

              {/* Google Card Simulation */}
              <div
                className={`p-4 bg-white border border-slate-200 rounded-xl shadow-sm transition-all duration-300 ${
                  previewMode === "mobile" ? "max-w-[360px]" : "max-w-[600px]"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center border border-slate-100">
                    <LinkIcon className="w-3 h-3 text-slate-400" />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-[12px] text-[#202124] leading-tight font-medium">
                      {selectedWebs.length > 0
                        ? `${WEBSITE_DOMAINS[selectedWebs[0]]
                            ?.replace("https://", "")
                            .replace("http://", "")} › ${
                            WEBSITE_PRODUCT_PATH[selectedWebs[0]]?.replace(
                              "/",
                              "",
                            ) || "products"
                          } › ${seoData.slug || "..."}`
                        : "No website selected"}
                    </p>
                  </div>
                </div>

                <div
                  className={`mt-2 ${previewMode === "mobile" ? "flex flex-col-reverse gap-2" : "flex gap-4"}`}
                >
                  <div className="flex-1">
                    <a
                      href="#"
                      onClick={(e) => e.preventDefault()}
                      className="text-[18px] text-[#1a0dab] hover:underline cursor-pointer leading-tight mb-1 line-clamp-2 font-medium block"
                    >
                      {seoData.title || "Enter an SEO Title..."}
                    </a>
                    <p className="text-[13px] text-[#4d5156] line-clamp-3 leading-relaxed">
                      {seoData.description ||
                        "Enter a meta description to see how it looks here. This text will help customers find your product on Google."}
                    </p>
                  </div>

                  {/* THUMBNAIL PREVIEW */}
                  <div className="w-[104px] h-[104px] flex-shrink-0 bg-slate-50 rounded-lg overflow-hidden border border-slate-100 relative group">
                    {mainImage || existingMainImage ? (
                      <img
                        src={
                          mainImage
                            ? URL.createObjectURL(mainImage)
                            : existingMainImage
                        }
                        className="w-full h-full object-contain p-1"
                        alt="SEO Preview"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center opacity-20">
                        <Images size={24} />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <span className="text-[8px] text-white font-black uppercase">
                        Preview Only
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
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

// --- SUBCOMPONENTS ---

function SidebarList({
  label,
  icon,
  items,
  selected,
  onToggle,
  onAdd,
  disabled,
}: any) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-blue-600">
          {icon}
          <Label className="text-[10px] font-black uppercase tracking-tighter">
            {label}
          </Label>
        </div>
      </div>

      <div className="space-y-1 max-h-48 overflow-y-auto pr-2 custom-scrollbar min-h-[50px]">
        {items.length === 0 ? (
          <p className="text-[9px] text-slate-400 italic py-2">
            No items found.
          </p>
        ) : (
          items.map((item: MasterItem) => {
            const isSelected = selected.includes(item.name);
            return (
              <div
                key={item.id}
                onClick={() => onToggle(item.name)}
                className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${
                  isSelected
                    ? "bg-blue-50 ring-1 ring-blue-100"
                    : "hover:bg-slate-50"
                } ${item.isTemp ? "bg-amber-50 ring-amber-100" : ""}`}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => onToggle(item.name)}
                  onClick={(e) => e.stopPropagation()}
                />
                <span
                  className={`text-[11px] font-bold ${
                    isSelected ? "text-blue-700" : "text-slate-600"
                  } ${item.isTemp ? "italic" : ""}`}
                >
                  {item.name} {item.isTemp && "*"}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Add New Button */}
      {!disabled && (
        <div className="pt-2 border-t border-slate-100">
          <AddCustomItem
            placeholder={`Add ${label}...`}
            onAdd={onAdd}
            disabled={disabled}
          />
        </div>
      )}
    </div>
  );
}

function AddCustomItem({
  placeholder,
  onAdd,
  disabled,
}: {
  placeholder: string;
  onAdd: (val: string) => void;
  disabled: boolean;
}) {
  const [val, setVal] = useState("");
  const handleAdd = () => {
    if (val.trim()) {
      onAdd(val.trim());
      setVal("");
    }
  };
  return (
    <div className="flex items-center gap-1">
      <Input
        disabled={disabled}
        placeholder={placeholder}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            handleAdd();
          }
        }}
        className="h-7 text-[10px] bg-white"
      />
      <Button
        disabled={disabled || !val.trim()}
        size="icon"
        variant="ghost"
        onClick={handleAdd}
        className="h-7 w-7 bg-slate-100 hover:bg-blue-50 hover:text-blue-600"
      >
        <Plus className="w-4 h-4" />
      </Button>
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
      className="relative border-2 border-dashed rounded-xl p-2 text-center cursor-pointer hover:bg-slate-50 transition-all border-slate-200 h-[160px] flex flex-col items-center justify-center bg-white"
    >
      <input {...getInputProps()} />
      {file || existingUrl ? (
        <div className="relative w-full h-full group">
          <img
            src={file ? URL.createObjectURL(file) : existingUrl}
            className="w-full h-full object-contain rounded-lg"
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-600 z-10"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <Zap className="w-6 h-6 mb-2 text-slate-300" />
          <p className="text-[9px] font-bold text-slate-400 uppercase">
            QR Code
          </p>
        </div>
      )}
    </div>
  );
}
