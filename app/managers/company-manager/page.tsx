"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { db } from "@/lib/firebase"
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  deleteDoc,
  doc,
  addDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore"
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  X,
  Save,
  Building2,
  ImagePlus,
  UploadCloud, // Imported for the dropzone
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { uploadToCloudinary } from "@/lib/cloudinary"
import { PageWrapper } from "@/components/sidebar/page-wrapper"

type Company = {
  id: string
  companyName: string
  description: string
  mainImage?: string
  services: string[]
  keyFeatures: string[]
  partnersImage: string[]
  website: string
  link?: string
  createdAt?: any
}

const CompanyManagerContent = () => {
  const [companies, setCompanies] = useState<Company[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // --- Form States ---
  const [companyName, setCompanyName] = useState("")
  const [description, setDescription] = useState("")
  const [website, setWebsite] = useState("Disruptive")
  const [link, setLink] = useState("")
  const [mainImage, setMainImage] = useState<File | null>(null)
  const [mainImagePrev, setMainImagePrev] = useState<string | null>(null)
  
  // Arrays
  const [services, setServices] = useState<string[]>([""])
  const [keyFeatures, setKeyFeatures] = useState<string[]>([""])
  
  // Partner Images State
  const [partnersImage, setPartnersImage] = useState<(File | null)[]>([]) // Null for existing images, File for new
  const [partnersImagePrev, setPartnersImagePrev] = useState<string[]>([]) // URLs for display
  const [isDragging, setIsDragging] = useState(false) // Dropzone state

  // --- Real-time Data Sync ---
  useEffect(() => {
    const q = query(collection(db, "company"), orderBy("createdAt", "desc"))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCompanies(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Company)))
    })
    return () => unsubscribe()
  }, [])

  // --- Service & Feature Handlers ---
  const addService = () => setServices([...services, ""])
  const removeService = (index: number) => setServices(services.filter((_, i) => i !== index))
  const updateService = (index: number, value: string) => {
    const newServices = [...services]
    newServices[index] = value
    setServices(newServices)
  }

  const addKeyFeature = () => setKeyFeatures([...keyFeatures, ""])
  const removeKeyFeature = (index: number) => setKeyFeatures(keyFeatures.filter((_, i) => i !== index))
  const updateKeyFeature = (index: number, value: string) => {
    const newFeatures = [...keyFeatures]
    newFeatures[index] = value
    setKeyFeatures(newFeatures)
  }

  // --- NEW: Multi-File Dropzone Handlers ---

  const handleFiles = (files: File[]) => {
    const newFiles = Array.from(files)
    
    // Create preview URLs for the new files
    const newPreviews = newFiles.map(file => URL.createObjectURL(file))

    // Append to existing arrays
    setPartnersImage(prev => [...prev, ...newFiles])
    setPartnersImagePrev(prev => [...prev, ...newPreviews])
  }

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files))
      e.dataTransfer.clearData()
    }
  }, [])

  const removePartnerImage = (index: number) => {
    setPartnersImage(partnersImage.filter((_, i) => i !== index))
    setPartnersImagePrev(partnersImagePrev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const filteredServices = services.filter((s) => s.trim() !== "")
    const filteredFeatures = keyFeatures.filter((f) => f.trim() !== "")

    if (!companyName || !description || (!mainImagePrev && !mainImage)) {
      return alert("Company Name, Description, and Main Image are required.")
    }

    if (filteredServices.length === 0) {
      return alert("At least one service is required.")
    }

    setLoading(true)
    try {
      let finalMainImage = mainImagePrev
      if (mainImage) {
        finalMainImage = await uploadToCloudinary(mainImage)
      }

      // Handle Partner Images Upload
      // Iterate over partnersImagePrev (the visual list) to maintain order
      const finalPartnerImages: string[] = []
      
      for (let i = 0; i < partnersImagePrev.length; i++) {
        const file = partnersImage[i]      // The File object (if new)
        const preview = partnersImagePrev[i] // The URL (if existing)

        if (file) {
          // It's a new file, upload it
          const uploadedUrl = await uploadToCloudinary(file)
          finalPartnerImages.push(uploadedUrl)
        } else {
          // It's an existing image (file is null), keep the preview URL
          finalPartnerImages.push(preview)
        }
      }

      const companyData = {
        companyName,
        description,
        website,
        link,
        mainImage: finalMainImage,
        services: filteredServices,
        keyFeatures: filteredFeatures,
        partnersImage: finalPartnerImages,
        updatedAt: serverTimestamp(),
      }

      if (editingId) {
        await updateDoc(doc(db, "company", editingId), companyData)
      } else {
        await addDoc(collection(db, "company"), { ...companyData, createdAt: serverTimestamp() })
      }

      setIsModalOpen(false)
      resetForm()
    } catch (err) {
      console.error(err)
      alert("Error saving company.")
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setEditingId(null)
    setCompanyName("")
    setDescription("")
    setWebsite("Disruptive")
    setLink("")
    setMainImage(null)
    setMainImagePrev(null)
    setServices([""])
    setKeyFeatures([""])
    setPartnersImage([])
    setPartnersImagePrev([])
  }

  const handleEditClick = (company: Company) => {
    setEditingId(company.id)
    setCompanyName(company.companyName)
    setDescription(company.description)
    setWebsite(company.website || "Disruptive")
    setLink(company.link || "")
    setMainImagePrev(company.mainImage || null)
    setServices(company.services && company.services.length > 0 ? company.services : [""])
    setKeyFeatures(company.keyFeatures && company.keyFeatures.length > 0 ? company.keyFeatures : [""])
    
    // Sync existing images: 
    // prev array gets URLs, file array gets NULLs so lengths match 1:1
    const existingImages = company.partnersImage || []
    setPartnersImagePrev(existingImages)
    setPartnersImage(new Array(existingImages.length).fill(null))
    
    setMainImage(null)
    setIsModalOpen(true)
  }

  return (
    <PageWrapper>
      <div className="space-y-8">
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter italic">
              Company <span className="text-[#d11a2a]">Manager</span>
            </h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">
              Manage company profiles and information
            </p>
          </div>
          <button
            onClick={() => {
              resetForm()
              setIsModalOpen(true)
            }}
            className="bg-black text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-[#d11a2a] transition-all shadow-lg shadow-gray-200"
          >
            <Plus size={18} /> New Company
          </button>
        </div>

        {/* COMPANIES LIST - TABLE */}
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50 border-b border-gray-100 text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">
              <tr>
                <th className="px-8 py-6">Logo</th>
                <th className="px-8 py-6">Company Details</th>
                <th className="px-8 py-6">Services</th>
                <th className="px-8 py-6 text-center">Partners</th>
                <th className="px-8 py-6 text-center">Website</th>
                <th className="px-8 py-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {companies.map((company) => (
                <tr key={company.id} className="hover:bg-gray-50/30 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="w-16 h-12 rounded-xl overflow-hidden border border-gray-100 shadow-sm">
                      <img
                        src={company.mainImage || "/placeholder.svg"}
                        alt={company.companyName}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <h4 className="font-black text-gray-900 uppercase text-sm mb-1">{company.companyName}</h4>
                    <p className="text-[9px] text-gray-400 line-clamp-2">{company.description}</p>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex gap-2 flex-wrap">
                      {(company.services || []).slice(0, 2).map((service, idx) => (
                        <span key={idx} className="text-[8px] font-bold uppercase bg-gray-100 text-gray-600 px-2 py-1 rounded">
                          {service}
                        </span>
                      ))}
                      {(company.services || []).length > 2 && (
                        <span className="text-[8px] font-bold uppercase bg-gray-100 text-gray-600 px-2 py-1 rounded">
                          +{(company.services || []).length - 2}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <span className="text-[10px] font-black text-gray-600">
                      {(company.partnersImage || []).length} images
                    </span>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <span
                      className={`text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full ${
                        company.website === "Disruptive" ? "bg-green-50 text-green-500" : "bg-orange-50 text-orange-500"
                      }`}
                    >
                      {company.website}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleEditClick(company)}
                        className="p-3 bg-gray-50 text-gray-400 hover:bg-black hover:text-white rounded-xl transition-all"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => confirm("Delete this company permanently?") && deleteDoc(doc(db, "company", company.id))}
                        className="p-3 bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* FULL-HEIGHT SIDE MODAL */}
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-[100] flex justify-end">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsModalOpen(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-md"
              />
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="relative bg-white h-screen w-full max-w-3xl shadow-2xl overflow-y-auto"
              >
                {/* MODAL HEADER */}
                <div className="p-8 border-b border-gray-100 sticky top-0 bg-white/80 backdrop-blur-md z-20 flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-red-50 text-[#d11a2a] rounded-xl">
                      <Building2 size={24} />
                    </div>
                    <h3 className="font-black uppercase italic tracking-tighter text-2xl">
                      {editingId ? "Edit Company" : "Add Company"}
                    </h3>
                  </div>
                  <div className="flex items-center gap-6">
                    <button
                      onClick={() => setIsModalOpen(false)}
                      className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={loading}
                      className="bg-black text-white px-10 py-4 rounded-full font-black uppercase text-[10px] tracking-[0.2em] hover:bg-[#d11a2a] flex items-center gap-3 shadow-xl shadow-gray-200 disabled:opacity-50 transition-all"
                    >
                      {loading ? (
                        <Loader2 className="animate-spin" size={16} />
                      ) : (
                        <>
                          <Save size={16} /> Save Company
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* MODAL CONTENT */}
                <div className="p-12 space-y-12 pb-32">
                  {/* COMPANY NAME */}
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Company Name</label>
                    <input
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Enter company name..."
                      className="w-full text-4xl font-black uppercase italic outline-none border-b-4 border-gray-50 focus:border-[#d11a2a] transition-all pb-2"
                    />
                  </div>

                  {/* DESCRIPTION */}
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Description</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Enter company description..."
                      className="w-full text-sm outline-none border-2 border-gray-50 focus:border-[#d11a2a] transition-all bg-gray-50 p-4 rounded-2xl min-h-[120px] resize-none"
                    />
                  </div>

                  {/* WEBSITE SELECTOR */}
                  <div className="space-y-2">
                    <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest block">
                      Website
                    </span>
                    <select
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      className="font-black text-xs uppercase outline-none bg-transparent cursor-pointer text-gray-900 border-b-2 border-transparent focus:border-[#d11a2a] pb-1 transition-all"
                    >
                      <option>Disruptive Solutions Inc</option>
                      <option>Ecoshift Corporation</option>
                      <option>Value Acquisitions Holdings</option>
                    </select>
                  </div>

                  {/* LINK FIELD */}
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Company Website Link</label>
                    <input
                      value={link}
                      onChange={(e) => setLink(e.target.value)}
                      placeholder="https://example.com"
                      className="w-full text-sm outline-none border-2 border-gray-50 focus:border-[#d11a2a] transition-all bg-gray-50 p-4 rounded-2xl"
                    />
                  </div>

                  {/* MAIN IMAGE UPLOAD */}
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase text-gray-400 flex items-center gap-2">
                      <ImagePlus size={14} /> Main Logo / Image
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer bg-gray-900 text-white px-6 py-3 rounded-xl text-[9px] font-black uppercase hover:bg-[#d11a2a] transition-all shadow-lg w-fit">
                      <ImagePlus size={16} /> {mainImagePrev ? "Change Image" : "Upload Logo"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0]
                          if (f) {
                            setMainImage(f)
                            setMainImagePrev(URL.createObjectURL(f))
                          }
                        }}
                      />
                    </label>
                    {mainImagePrev && (
                      <div className="relative aspect-video rounded-2xl overflow-hidden border-4 border-gray-50 w-full max-w-xs">
                        <img src={mainImagePrev || "/placeholder.svg"} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>

                  {/* SERVICES */}
                  <div className="space-y-4 pt-8 border-t-2 border-gray-50">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Services</label>
                      <button
                        type="button"
                        onClick={addService}
                        className="text-[9px] font-black bg-gray-100 text-black px-4 py-2 rounded-lg hover:bg-black hover:text-white transition-all"
                      >
                        + Add Service
                      </button>
                    </div>
                    <div className="space-y-2">
                      {services.map((service, idx) => (
                        <div key={idx} className="flex gap-3 items-center">
                          <input
                            value={service}
                            onChange={(e) => updateService(idx, e.target.value)}
                            placeholder={`Service ${idx + 1}`}
                            className="flex-grow bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm outline-none focus:border-[#d11a2a]"
                          />
                          <button
                            type="button"
                            onClick={() => removeService(idx)}
                            className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* KEY FEATURES */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Key Features</label>
                      <button
                        type="button"
                        onClick={addKeyFeature}
                        className="text-[9px] font-black bg-gray-100 text-black px-4 py-2 rounded-lg hover:bg-black hover:text-white transition-all"
                      >
                        + Add Feature
                      </button>
                    </div>
                    <div className="space-y-2">
                      {keyFeatures.map((feature, idx) => (
                        <div key={idx} className="flex gap-3 items-center">
                          <input
                            value={feature}
                            onChange={(e) => updateKeyFeature(idx, e.target.value)}
                            placeholder={`Feature ${idx + 1}`}
                            className="flex-grow bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm outline-none focus:border-[#d11a2a]"
                          />
                          <button
                            type="button"
                            onClick={() => removeKeyFeature(idx)}
                            className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* PARTNER IMAGES - NEW DROPZONE UPLOAD */}
                  <div className="space-y-4 pt-8 border-t-2 border-gray-50">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Partner Logos / Images</label>
                    
                    {/* DROPZONE AREA */}
                    <div
                      onDragOver={onDragOver}
                      onDragLeave={onDragLeave}
                      onDrop={onDrop}
                      className={`
                        relative border-2 border-dashed rounded-2xl p-8 transition-all text-center
                        ${isDragging ? "border-[#d11a2a] bg-red-50" : "border-gray-200 bg-gray-50/50"}
                      `}
                    >
                      <input
                        type="file"
                        accept="image/*"
                        multiple // ENABLE MULTIPLE FILES
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            handleFiles(Array.from(e.target.files))
                          }
                        }}
                      />
                      <div className="flex flex-col items-center justify-center gap-3 pointer-events-none">
                        <div className={`p-4 rounded-full ${isDragging ? "bg-white text-[#d11a2a]" : "bg-white text-gray-400"}`}>
                          <UploadCloud size={24} />
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                          {isDragging ? "Drop files now" : "Click or Drag & Drop"}
                        </p>
                        <p className="text-[9px] text-gray-400">Support multiple uploads</p>
                      </div>
                    </div>

                    {/* IMAGE GRID PREVIEW */}
                    {partnersImagePrev.length > 0 && (
                      <div className="flex flex-wrap gap-4 mt-4">
                        {partnersImagePrev.map((preview, idx) => (
                          <div key={idx} className="group relative aspect-square rounded-xl overflow-hidden bg-white border border-gray-100 shadow-sm">
                            <img 
                              src={preview || "/placeholder.svg"} 
                              alt={`Partner ${idx + 1}`} 
                              className="w-full h-full object-cover" 
                            />
                            {/* OVERLAY REMOVE BUTTON */}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <button
                                type="button"
                                onClick={() => removePartnerImage(idx)}
                                className="bg-red-500 text-white p-2 rounded-full hover:scale-110 transition-transform"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </PageWrapper>
  )
}

export default CompanyManagerContent