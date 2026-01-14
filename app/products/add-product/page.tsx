"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { db } from "@/lib/firebase"
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore"
import {
  ImagePlus,
  UploadCloud,
  PlusCircle,
  X,
  Loader2,
  AlignLeft,
  Globe,
  Trash2,
  ListPlus,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { PageWrapper } from "@/components/sidebar/page-wrapper"

// ------------------ UTILS ------------------
const toCaps = (str: string) => str.toUpperCase().trim()

// ------------------ INITIAL DATA ------------------
const INITIAL_CLASSIFICATION: Record<string, { brands: string[]; categories: string[] }> = {
  ECOSHIFTCORP: {
    brands: ["ECOSHIFT"],
    categories: [
      "WEATHERPROOF FIXTURE",
      "WALL LAMP",
      "UV DISINFECTION LIGHT",
      "TUBE LIGHT",
      "TRACK LIGHT",
      "SWIMMING POOL LIGHT",
      "STRIP LIGHT",
      "STREETLIGHT",
      "SPOTLIGHT",
      "SOLAR STREET LIGHT",
    ],
  },
  DISRUPTIVESOLUTIONSINC: {
    brands: ["BUILDCHEM", "JISO", "LIT", "ZUMTOBEL", "LUXIONA"],
    categories: ["UNCATEGORIZED", "JISO - BOLLARD LIGHT", "LIT - LED BATTEN", "LUXIONA - WALL LIGHT"],
  },
  VALUEACQUISITIONSHOLDINGS: {
    brands: ["BUILDCHEM", "OKO", "PROGRESSIVE DYNAMICS INC.", "PROGRESSIVE MATERIALS SOLUTIONS INC."],
    categories: [
      "SUPERPLASTICIZERS & HIGH-RANGE WATER REDUCERS",
      "SET RETARDERS & ACCELERATORS",
      "UNDERWATER CONCRETE SOLUTIONS",
      "WATERPROOFING SOLUTIONS",
    ],
  },
}

// ------------------ MAIN COMPONENT ------------------
export default function AddNewProductPageContent() {
  const pathname = usePathname()
  const pageTitle = pathname?.split("/").pop()?.replace(/-/g, " ") || "Add New Product"

  // --- PRODUCT STATES ---
  const [isPublishing, setIsPublishing] = useState(false)
  const [productName, setProductName] = useState("")
  const [sku, setSku] = useState("")
  const [regPrice, setRegPrice] = useState("")
  const [salePrice, setSalePrice] = useState("")
  const [shortDescription, setShortDescription] = useState("")
  const [description, setDescription] = useState("")

  // --- SPEC STATE ---
  const [specs, setSpecs] = useState([{ id: 1, key: "WATTS", value: "" }, { id: 2, key: "LUMENS", value: "" }])

  const [mainImage, setMainImage] = useState<File | null>(null)
  const [galleryImage, setGalleryImage] = useState<File | null>(null)
  const [selectedCats, setSelectedCats] = useState<string[]>([])
  const [selectedBrands, setSelectedBrands] = useState<string[]>([])

  // --- CLASSIFICATION STATE ---
  const [classificationData, setClassificationData] = useState<Record<string, { brands: string[]; categories: string[] }>>(INITIAL_CLASSIFICATION)
  const [selectedWebsite, setSelectedWebsite] = useState<string>("Disruptive")

  const currentClassification = classificationData[selectedWebsite]

  // --- Inputs for adding new items ---
  const [newCategoryInput, setNewCategoryInput] = useState("")
  const [newBrandInput, setNewBrandInput] = useState("")

  // --- FETCH FIRESTORE CLASSIFICATION ON MOUNT ---
  useEffect(() => {
    const fetchClassification = async () => {
      for (const site of Object.keys(INITIAL_CLASSIFICATION)) {
        const docRef = doc(db, "classifications", site)
        const snapshot = await getDoc(docRef)
        if (snapshot.exists()) {
          const data = snapshot.data() as { brands: string[]; categories: string[] }
          setClassificationData((prev) => ({
            ...prev,
            [site]: { 
              brands: Array.from(new Set([...prev[site].brands, ...data.brands])), 
              categories: Array.from(new Set([...prev[site].categories, ...data.categories])) 
            },
          }))
        } else {
          // Create doc if doesn't exist
          await setDoc(docRef, INITIAL_CLASSIFICATION[site])
        }
      }
    }
    fetchClassification()
  }, [])

  // --- HANDLERS ---
  const handleWebsiteChange = (website: string) => {
    setSelectedWebsite(website)
    setSelectedBrands([])
    setSelectedCats([])
  }

  const handleCheckbox = (val: string, type: "cat" | "brand") => {
    const setter = type === "cat" ? setSelectedCats : setSelectedBrands
    const current = type === "cat" ? selectedCats : selectedBrands
    setter(current.includes(val) ? current.filter((i) => i !== val) : [...current, val])
  }

  const addSpecRow = () => setSpecs([...specs, { id: Date.now(), key: "", value: "" }])
  const removeSpecRow = (id: number) => setSpecs(specs.filter((s) => s.id !== id))
  const updateSpec = (id: number, field: "key" | "value", newValue: string) => {
    setSpecs(specs.map((s) => (s.id === id ? { ...s, [field]: toCaps(newValue) } : s)))
  }

  // --- CATEGORY HANDLERS ---
  const addNewCategory = async () => {
    const category = toCaps(newCategoryInput)
    if (!category) return
    if (!currentClassification.categories.includes(category)) {
      const updated = [category, ...currentClassification.categories]
      setClassificationData((prev) => ({ ...prev, [selectedWebsite]: { ...prev[selectedWebsite], categories: updated } }))
      await setDoc(doc(db, "classifications", selectedWebsite), {
        brands: currentClassification.brands,
        categories: updated,
      })
    }
    setNewCategoryInput("")
  }

  const removeCategory = async (cat: string) => {
    const updated = currentClassification.categories.filter((c) => c !== cat)
    setClassificationData((prev) => ({ ...prev, [selectedWebsite]: { ...prev[selectedWebsite], categories: updated } }))
    setSelectedCats((prev) => prev.filter((c) => c !== cat))
    await setDoc(doc(db, "classifications", selectedWebsite), {
      brands: currentClassification.brands,
      categories: updated,
    })
  }

  // --- BRAND HANDLERS ---
  const addNewBrand = async () => {
    const brand = toCaps(newBrandInput)
    if (!brand) return
    if (!currentClassification.brands.includes(brand)) {
      const updated = [brand, ...currentClassification.brands]
      setClassificationData((prev) => ({ ...prev, [selectedWebsite]: { ...prev[selectedWebsite], brands: updated } }))
      await setDoc(doc(db, "classifications", selectedWebsite), {
        brands: updated,
        categories: currentClassification.categories,
      })
    }
    setNewBrandInput("")
  }

  const removeBrand = async (brand: string) => {
    const updated = currentClassification.brands.filter((b) => b !== brand)
    setClassificationData((prev) => ({ ...prev, [selectedWebsite]: { ...prev[selectedWebsite], brands: updated } }))
    setSelectedBrands((prev) => prev.filter((b) => b !== brand))
    await setDoc(doc(db, "classifications", selectedWebsite), {
      brands: updated,
      categories: currentClassification.categories,
    })
  }

  // --- CLOUDINARY ---
  const CLOUDINARY_UPLOAD_PRESET = "taskflow_preset"
  const CLOUDINARY_CLOUD_NAME = "dvmpn8mjh"

  const uploadToCloudinary = async (file: File) => {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET)
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, { method: "POST", body: formData })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.error?.message || "Cloudinary upload failed")
    return data.secure_url
  }

  // --- PUBLISH PRODUCT ---
  const handlePublish = async () => {
    if (!productName || !mainImage) return alert("Paki-lagay ang Product Name at Main Image.")
    setIsPublishing(true)
    try {
      const mainUrl = await uploadToCloudinary(mainImage)
      const galleryUrl = galleryImage ? await uploadToCloudinary(galleryImage) : ""
      const cleanSpecs = specs.filter((s) => s.key && s.value)
      await addDoc(collection(db, "products"), {
        name: toCaps(productName),
        sku: toCaps(sku),
        regularPrice: Number(regPrice) || 0,
        salePrice: Number(salePrice) || 0,
        shortDescription,
        description,
        specifications: cleanSpecs,
        mainImage: mainUrl,
        galleryImage: galleryUrl,
        categories: selectedCats.map(toCaps),
        brands: selectedBrands.map(toCaps),
        website: selectedWebsite,
        createdAt: serverTimestamp(),
      })
      alert("Product Published Successfully!")
      window.location.reload()
    } catch (error: any) {
      alert("Error: " + error.message)
    } finally {
      setIsPublishing(false)
    }
  }

  // ----- RETURN PAGE WRAPPER -----
  return (
    <PageWrapper>
      <header className="flex h-16 items-center gap-2 border-b px-4 mb-4">
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbPage className="capitalize font-black italic tracking-tighter text-[#d11a2a]">
            {pageTitle}
          </BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  </header>

  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 min-h-screen">
    {/* LEFT COLUMN */}
    <div className="md:col-span-2 space-y-6">
      {/* PRODUCT INFORMATION CARD */}
      <Card className="shadow-sm border-none ring-1 ring-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlignLeft className="w-5 h-5 text-blue-500" /> Product Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Product Name */}
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Product Name</Label>
            <Input
              className="h-12 text-lg font-bold"
              value={productName}
              onChange={(e) => setProductName(toCaps(e.target.value))}
              placeholder="e.g. ZUMTOBEL PENDANT LUMINAIRE"
            />
          </div>

          {/* Short Description */}
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Short Description</Label>
            <Input
              className="h-12 text-sm"
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              placeholder="Brief description..."
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Description</Label>
            <Textarea
              className="text-sm"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Full product description..."
              rows={4}
            />
          </div>

          {/* Website selection */}
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase text-gray-400 flex items-center gap-2">
              <Globe size={12} className="text-[#d11a2a]" /> Select Website
            </label>
            <select
              value={selectedWebsite}
              onChange={(e) => handleWebsiteChange(e.target.value)}
              className="w-full font-black text-xs uppercase outline-none bg-gray-50 p-4 rounded-2xl border-none cursor-pointer focus:ring-2 focus:ring-[#d11a2a]/10"
            >
              {Object.keys(classificationData).map((site) => (
                <option key={site} value={site}>{site}</option>
              ))}
            </select>
          </div>

          {/* Specifications */}
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-blue-50/50 p-3 rounded-xl border border-blue-100">
              <Label className="font-black text-[10px] uppercase tracking-widest text-blue-600">
                Product Specifications
              </Label>
              <Button
                variant="ghost"
                size="sm"
                className="text-blue-600 font-bold text-[10px] uppercase hover:bg-blue-100"
                onClick={addSpecRow}
              >
                <PlusCircle className="w-4 h-4 mr-1" /> Add Spec
              </Button>
            </div>

            <div className="space-y-2">
              {specs.map((spec) => (
                <div key={spec.id} className="flex gap-3 items-center group">
                  <div className="w-1/3">
                    <Input
                      placeholder="Name (e.g. WATTS)"
                      className="font-bold text-xs uppercase bg-slate-50 border-slate-200"
                      value={spec.key}
                      onChange={(e) => updateSpec(spec.id, "key", e.target.value)}
                    />
                  </div>
                  <div className="flex-1">
                    <Input
                      placeholder="Value (e.g. 15W)"
                      className="font-medium text-sm border-slate-200"
                      value={spec.value}
                      onChange={(e) => updateSpec(spec.id, "value", e.target.value)}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-300 hover:text-red-500 hover:bg-red-50"
                    onClick={() => removeSpecRow(spec.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {specs.length === 0 && (
                 <div className="text-center py-8 text-slate-400 text-xs italic border-2 border-dashed rounded-xl">
                    No specifications added.
                 </div>
              )}
            </div>
          </div>

          {/* SKU / Prices */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-100">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400">SKU</Label>
              <Input className="bg-slate-50 font-bold" value={sku} onChange={(e) => setSku(toCaps(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400">Reg. Price</Label>
              <Input type="number" className="bg-slate-50 font-bold" value={regPrice} onChange={(e) => setRegPrice(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400">Sale Price</Label>
              <Input type="number" className="bg-slate-50 font-bold" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gallery Card */}
      <Card className="border-none ring-1 ring-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-500">
            Product Gallery
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Label htmlFor="gallery-file" className="cursor-pointer">
            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-10 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 transition-all group">
              {galleryImage ? (
                <img
                  src={URL.createObjectURL(galleryImage) || "/placeholder.svg"}
                  className="h-40 object-contain rounded-lg shadow-md"
                />
              ) : (
                <>
                  <UploadCloud className="w-12 h-12 mb-2 text-slate-300 group-hover:text-blue-400" />
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Click to upload gallery image
                  </p>
                </>
              )}
            </div>
            <input
              type="file"
              id="gallery-file"
              className="hidden"
              onChange={(e) => setGalleryImage(e.target.files?.[0] || null)}
            />
          </Label>
        </CardContent>
      </Card>
    </div>

    {/* RIGHT COLUMN */}
    <div className="space-y-6">
      {/* Main Image Card */}
      <Card className="border-none ring-1 ring-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
          <CardTitle className="text-[10px] font-black uppercase text-slate-500 tracking-widest text-center">
            Featured Image
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <Label htmlFor="main-file" className="cursor-pointer">
            <div className="aspect-square border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center bg-white hover:border-blue-400 hover:bg-blue-50/30 transition-all overflow-hidden relative">
              {mainImage ? (
                <img
                  src={URL.createObjectURL(mainImage) || "/placeholder.svg"}
                  className="w-full h-full object-contain p-4"
                />
              ) : (
                <div className="text-center p-4">
                  <ImagePlus className="w-10 h-10 mb-2 text-blue-500 mx-auto opacity-50" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Set Main Image
                  </span>
                </div>
              )}
            </div>
            <input
              type="file"
              id="main-file"
              className="hidden"
              onChange={(e) => setMainImage(e.target.files?.[0] || null)}
            />
          </Label>
        </CardContent>
      </Card>

      {/* Classification Card (Brands & Categories) */}
      <Card className="border-none ring-1 ring-slate-200 shadow-sm">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
          <CardTitle className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
            Classification ({selectedWebsite})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {/* Categories Section */}
          <div className="space-y-3">
            <Label className="text-[9px] font-black uppercase text-blue-600">Categories</Label>
            <div className="flex gap-2 mb-2">
              <Input
                placeholder="Add new category..."
                className="h-8 text-[11px] bg-slate-50"
                value={newCategoryInput}
                onChange={(e) => setNewCategoryInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addNewCategory()}
              />
              <Button size="sm" onClick={addNewCategory} className="h-8 w-8 p-0 bg-blue-600 hover:bg-blue-700">
                <ListPlus className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-1 max-h-40 overflow-y-auto pr-1 custom-scrollbar border-t border-slate-100 pt-2">
              {currentClassification?.categories.map((cat) => (
                <div key={cat} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 group transition-colors">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id={cat}
                      checked={selectedCats.includes(cat)}
                      onCheckedChange={() => handleCheckbox(cat, "cat")}
                      className="border-slate-300"
                    />
                    <Label htmlFor={cat} className="text-xs font-bold text-slate-600 cursor-pointer">
                      {cat}
                    </Label>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                    onClick={() => removeCategory(cat)}
                    title="Remove Category"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Brands Section */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <Label className="text-[9px] font-black uppercase text-blue-600">Brands</Label>
            <div className="flex gap-2 mb-2">
              <Input
                placeholder="Add new brand..."
                className="h-8 text-[11px] bg-slate-50"
                value={newBrandInput}
                onChange={(e) => setNewBrandInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addNewBrand()}
              />
              <Button size="sm" onClick={addNewBrand} className="h-8 w-8 p-0 bg-blue-600 hover:bg-blue-700">
                <PlusCircle className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-1 max-h-40 overflow-y-auto pr-1 custom-scrollbar border-t border-slate-100 pt-2">
              {currentClassification?.brands.map((brand) => (
                <div key={brand} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 group transition-colors">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id={brand}
                      checked={selectedBrands.includes(brand)}
                      onCheckedChange={() => handleCheckbox(brand, "brand")}
                      className="border-slate-300"
                    />
                    <Label htmlFor={brand} className="text-xs font-bold text-slate-600 cursor-pointer">
                      {brand}
                    </Label>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                    onClick={() => removeBrand(brand)}
                    title="Remove Brand"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Publish Button */}
      <Button
        disabled={isPublishing}
        onClick={handlePublish}
        className="w-full bg-[#d11a2a] hover:bg-[#b01622] h-16 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-red-500/20 transition-all hover:scale-[1.02] active:scale-95"
      >
        {isPublishing ? (
          <>
            <Loader2 className="animate-spin mr-2" /> Publishing...
          </>
        ) : (
          "Publish Product"
        )}
      </Button>
    </div>
      </div>
    </PageWrapper>
  )
}
