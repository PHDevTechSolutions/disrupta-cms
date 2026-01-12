"use client"
import { useState } from "react"
import { usePathname } from "next/navigation"
import { db } from "@/lib/firebase"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"
import { ImagePlus, UploadCloud, PlusCircle, X, Loader2, AlignLeft, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb"
import { PageWrapper } from "@/components/sidebar/page-wrapper"

const WEBSITE_CLASSIFICATION = {
  Ecoshift: {
    brands: ["Ecoshift"],
    categories: [
      "weatherproof fixture",
      "wall lamp",
      "uv disinfection light",
      "tube light",
      "track light",
      "swimming pool light",
      "strip light",
      "streetlight",
      "spotlight",
      "solar street light",
    ],
  },
  Disruptive: {
    brands: ["Buildchem", "JISO", "LIT", "ZUMTOBEL", "LUXIONA"],
    categories: ["Uncategorized", "JISO - Bollard Light", "LIT - LED Batten", "LUXIONA - Wall Light"],
  },
  VAH: {
    brands: ["buildchem", "oko", "progressive dynamics inc.", "progressive materials solutions inc."],
    categories: [
      "Superplasticizers & High-Range Water Reducers",
      "Set Retarders & Accelerators",
      "Underwater Concrete Solutions",
      "Waterproofing Solutions",
      "Soil Stabilization & Road Foundation",
      "Mould Release Agents",
      "Corrosion Protection Solutions",
      "Curing Compounds",
      "Cement Processing & Grinding Aids",
      "Cleaning & Surface Preparation Chemicals",
    ],
  },
}

function AddNewProductPageContent() {
  const pathname = usePathname()
  const pageTitle = pathname?.split("/").pop()?.replace(/-/g, " ") || "Add New Product"

  // --- PRODUCT STATES ---
  const [isPublishing, setIsPublishing] = useState(false)
  const [productName, setProductName] = useState("")
  const [sku, setSku] = useState("")
  const [regPrice, setRegPrice] = useState("")
  const [salePrice, setSalePrice] = useState("")
  const [descBlocks, setDescBlocks] = useState([
    {
      id: 1,
      type: "text",
      label: "Technical Specifications",
      value: "WATTS: \nVOLTAGE: \nLUMENS: \nCOLOR TEMP: \nBEAM ANGLE: \nMATERIAL: ",
    },
  ])
  const [mainImage, setMainImage] = useState<File | null>(null)
  const [galleryImage, setGalleryImage] = useState<File | null>(null)
  const [selectedCats, setSelectedCats] = useState<string[]>([])
  const [selectedBrands, setSelectedBrands] = useState<string[]>([])

  const [selectedWebsite, setSelectedWebsite] = useState("Disruptive")

  const currentClassification = WEBSITE_CLASSIFICATION[selectedWebsite as keyof typeof WEBSITE_CLASSIFICATION]
  const categories = currentClassification?.categories || []
  const brands = currentClassification?.brands || []

  const handleWebsiteChange = (website: string) => {
    setSelectedWebsite(website)
    const newBrands = WEBSITE_CLASSIFICATION[website as keyof typeof WEBSITE_CLASSIFICATION]?.brands || []
    const newCategories = WEBSITE_CLASSIFICATION[website as keyof typeof WEBSITE_CLASSIFICATION]?.categories || []
    setSelectedBrands([newBrands[0]])
    setSelectedCats([])
  }

  const handleCheckbox = (val: string, type: "cat" | "brand") => {
    const setter = type === "cat" ? setSelectedCats : setSelectedBrands
    const current = type === "cat" ? selectedCats : selectedBrands
    setter(current.includes(val) ? current.filter((i) => i !== val) : [...current, val])
  }

  const CLOUDINARY_UPLOAD_PRESET = "taskflow_preset"
  const CLOUDINARY_CLOUD_NAME = "dvmpn8mjh"

  const uploadToCloudinary = async (file: File) => {
  const formData = new FormData()
  formData.append("file", file)
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET)

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    {
      method: "POST",
      body: formData,
    }
  )

  const data = await res.json()
  console.log("Cloudinary response:", data)

  if (!res.ok) {
    throw new Error(data?.error?.message || "Cloudinary upload failed")
  }

  return data.secure_url
}


  const handlePublish = async () => {
    if (!productName || !mainImage) return alert("Paki-lagay ang Product Name at Main Image.")
    setIsPublishing(true)
    try {
      const mainUrl = await uploadToCloudinary(mainImage)
      let galleryUrl = ""
      if (galleryImage) galleryUrl = await uploadToCloudinary(galleryImage)

      await addDoc(collection(db, "products"), {
        name: productName,
        sku,
        regularPrice: Number(regPrice) || 0,
        salePrice: Number(salePrice) || 0,
        descriptionBlocks: descBlocks,
        mainImage: mainUrl,
        galleryImage: galleryUrl,
        categories: selectedCats,
        brands: selectedBrands,
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

  return (
    <>
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
        <div className="md:col-span-2 space-y-6">
          <Card className="shadow-sm border-none ring-1 ring-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlignLeft className="w-5 h-5 text-blue-500" /> Product Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Product Name</Label>
                <Input
                  className="h-12 text-lg font-bold"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="e.g. ZUMTOBEL PENDANT LUMINAIRE"
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase text-gray-400 flex items-center gap-2">
                  <Globe size={12} className="text-[#d11a2a]" /> Select Website
                </label>
                <select
                  value={selectedWebsite}
                  onChange={(e) => handleWebsiteChange(e.target.value)}
                  className="w-full font-black text-xs uppercase outline-none bg-gray-50 p-4 rounded-2xl border-none cursor-pointer focus:ring-2 focus:ring-[#d11a2a]/10"
                >
                  
                  <option value="Disruptive">Disruptive</option>
                  <option value="Ecoshift">Ecoshift</option>
                  <option value="VAH">VAH</option>
                </select>
              </div>

              {/* --- DYNAMIC DESCRIPTION AREA --- */}
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                  <Label className="font-black text-[10px] uppercase tracking-widest text-blue-600">
                    Product Specifications
                  </Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-blue-600 font-bold text-[10px] uppercase hover:bg-blue-100"
                    onClick={() =>
                      setDescBlocks([
                        ...descBlocks,
                        { id: Date.now(), type: "text", label: "New Spec Section", value: "" },
                      ])
                    }
                  >
                    <PlusCircle className="w-4 h-4 mr-1" /> Add Section
                  </Button>
                </div>

                {descBlocks.map((block, index) => (
                  <div
                    key={block.id}
                    className="p-5 border-2 border-slate-100 rounded-2xl relative bg-white shadow-sm transition-all focus-within:border-blue-200"
                  >
                    <button
                      className="absolute right-3 top-3 text-slate-300 hover:text-red-500 transition-colors"
                      onClick={() => setDescBlocks(descBlocks.filter((b) => b.id !== block.id))}
                    >
                      <X className="w-5 h-5" />
                    </button>

                    <Input
                      placeholder="Section Label (e.g. Dimensions)"
                      className="mb-3 h-9 text-[11px] font-black uppercase tracking-wider w-1/2 border-slate-100 bg-slate-50 focus:bg-white"
                      value={block.label}
                      onChange={(e) => {
                        const newBlocks = [...descBlocks]
                        newBlocks[index].label = e.target.value
                        setDescBlocks(newBlocks)
                      }}
                    />

                    <Textarea
                      placeholder="Enter details..."
                      className="min-h-[180px] text-sm leading-relaxed font-medium border-slate-100 focus:ring-0 focus:border-blue-400"
                      value={block.value}
                      onChange={(e) => {
                        const newBlocks = [...descBlocks]
                        newBlocks[index].value = e.target.value
                        setDescBlocks(newBlocks)
                      }}
                    />
                    <p className="mt-2 text-[9px] text-slate-400 font-medium italic">
                      * Fill in the values after the colon ( : )
                    </p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-100">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400">SKU</Label>
                  <Input className="bg-slate-50 font-bold" value={sku} onChange={(e) => setSku(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Reg. Price</Label>
                  <Input
                    type="number"
                    className="bg-slate-50 font-bold"
                    value={regPrice}
                    onChange={(e) => setRegPrice(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Sale Price</Label>
                  <Input
                    type="number"
                    className="bg-slate-50 font-bold"
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* --- GALLERY CARD (Remains same but with styling) --- */}
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

        <div className="space-y-6">
          {/* --- MAIN IMAGE CARD --- */}
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

          <Card className="border-none ring-1 ring-slate-200 shadow-sm">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100">
              <CardTitle className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
                Classification ({selectedWebsite})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-3">
                <Label className="text-[9px] font-black uppercase text-blue-600">Categories</Label>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                  {categories.map((cat) => (
                    <div key={cat} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-slate-50">
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
                  ))}
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-100">
                <Label className="text-[9px] font-black uppercase text-blue-600">Brands</Label>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                  {brands.map((brand) => (
                    <div key={brand} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-slate-50">
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
    </>
  )
}

export default function AddNewProductPage() {
  return (
    <PageWrapper>
      <AddNewProductPageContent />
    </PageWrapper>
  )
}