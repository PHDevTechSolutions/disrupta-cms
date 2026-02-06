"use client"

import React, { useEffect, useState } from "react"
import { db } from "@/lib/firebase"
import { collection, addDoc, updateDoc, deleteDoc, doc, query, orderBy, onSnapshot, getDocs, serverTimestamp } from "firebase/firestore"
import { PageWrapper } from "@/components/sidebar/page-wrapper"
import { Plus, Pencil, Trash2, Loader2, Save, X, Image as ImageIcon, Check, Search, Globe, Smartphone, Monitor } from "lucide-react"
import { uploadToCloudinary } from "@/lib/cloudinary"

// --- Types ---
type Solution = {
  id: string
  title: string
  description: string
  mainImage: string
  websites: string[]
  series: string[]
  label: string
  seo: {
    title: string
    slug: string
    description: string
  }
  createdAt?: any
}

const WEBSITE_OPTIONS = ["Disruptive Solutions Inc", "Ecoshift Corporation", "Value Acquisitions Holdings"]
const LABEL_OPTIONS = ["build", "protect", "finish", "repair"]

const SolutionsManagerContent = () => {
  // --- Data States ---
  const [solutionsList, setSolutionsList] = useState<Solution[]>([])
  const [availableSeries, setAvailableSeries] = useState<{ id: string; name: string }[]>([])
  
  // --- UI States ---
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [seriesSearchTerm, setSeriesSearchTerm] = useState("") 
  const [previewMode, setPreviewMode] = useState<"mobile" | "desktop">("mobile")

  // --- Form States ---
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [mainImage, setMainImage] = useState("")
  const [selectedWebsites, setSelectedWebsites] = useState<string[]>([])
  const [selectedSeries, setSelectedSeries] = useState<string[]>([])
  const [label, setLabel] = useState("")
  
  // SEO Specific States
  const [seoTitle, setSeoTitle] = useState("")
  const [seoSlug, setSeoSlug] = useState("")
  const [seoDescription, setSeoDescription] = useState("")

  // --- Auto-Slug & SEO Title Logic ---
  useEffect(() => {
    if (!editingId && title) {
      if (!seoTitle) setSeoTitle(title)
      if (!seoSlug) {
        setSeoSlug(title.toLowerCase().replace(/[^\w ]+/g, "").replace(/ +/g, "-"))
      }
    }
  }, [title, editingId])

  // --- Firebase Sync ---
  useEffect(() => {
    const q = query(collection(db, "solutions"), orderBy("createdAt", "desc"))
    return onSnapshot(q, (snapshot) => {
      setSolutionsList(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Solution)))
    })
  }, [])

  useEffect(() => {
    const fetchSeries = async () => {
      const q = query(collection(db, "series"), orderBy("name", "asc"))
      const snapshot = await getDocs(q)
      setAvailableSeries(snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name })))
    }
    fetchSeries()
  }, [])

  // --- Handlers ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !mainImage || !label) return alert("Missing required fields.")

    setLoading(true)
    try {
      const solutionData = {
        title: title.trim(),
        description: description.trim(),
        mainImage,
        websites: selectedWebsites,
        series: selectedSeries,
        label,
        seo: {
          title: seoTitle || title,
          slug: seoSlug || title.toLowerCase().replace(/ /g, "-"),
          description: seoDescription
        },
        updatedAt: serverTimestamp(),
      }

      if (editingId) {
        await updateDoc(doc(db, "solutions", editingId), solutionData)
      } else {
        await addDoc(collection(db, "solutions"), { ...solutionData, createdAt: serverTimestamp() })
      }
      setIsModalOpen(false)
      resetForm()
    } catch (err) {
      console.error(err)
      alert("Error saving data.")
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setEditingId(null)
    setTitle(""); setDescription(""); setMainImage(""); setLabel("")
    setSelectedWebsites([]); setSelectedSeries([])
    setSeoTitle(""); setSeoSlug(""); setSeoDescription("")
  }

  const handleEditClick = (sol: Solution) => {
    setEditingId(sol.id)
    setTitle(sol.title); setDescription(sol.description); setMainImage(sol.mainImage); setLabel(sol.label)
    setSelectedWebsites(sol.websites || []); setSelectedSeries(sol.series || [])
    setSeoTitle(sol.seo?.title || ""); setSeoSlug(sol.seo?.slug || ""); setSeoDescription(sol.seo?.description || "")
    setIsModalOpen(true)
  }

  const handleImageFile = async (files: File[]) => {
    setUploadingImage(true)
    try {
      const url = await uploadToCloudinary(files[0])
      setMainImage(url)
    } finally { setUploadingImage(false) }
  }

  return (
    <PageWrapper>
      <div className="space-y-8">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter italic">Solutions <span className="text-[#d11a2a]">Manager</span></h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Inventory & SEO Control</p>
          </div>
          <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="bg-black text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] flex items-center gap-3 hover:bg-[#d11a2a] transition-all shadow-lg shadow-gray-200">
            <Plus size={18} /> New Solution
          </button>
        </div>

        {/* LIST TABLE */}
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50 border-b border-gray-100 text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">
              <tr>
                <th className="px-8 py-6">Solution</th>
                <th className="px-8 py-6">Status</th>
                <th className="px-8 py-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {solutionsList.map((sol) => (
                <tr key={sol.id} className="hover:bg-gray-50/30 transition-colors">
                  <td className="px-8 py-6 flex items-center gap-4">
                    <img src={sol.mainImage} className="w-10 h-10 rounded-lg object-cover bg-gray-100" />
                    <div>
                      <h4 className="font-black text-gray-900 uppercase text-sm">{sol.title}</h4>
                      <p className="text-[9px] text-gray-400 font-mono">/{sol.seo?.slug || "no-slug"}</p>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="bg-gray-100 text-gray-500 text-[8px] font-black px-2 py-1 rounded uppercase tracking-widest">{sol.label}</span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleEditClick(sol)} className="p-2 hover:bg-black hover:text-white rounded-lg transition-all"><Pencil size={14} /></button>
                      <button onClick={() => confirm("Delete?") && deleteDoc(doc(db, "solutions", sol.id))} className="p-2 hover:text-red-500 rounded-lg transition-all"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* MODAL */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-[2.5rem] w-full max-w-7xl h-[92vh] overflow-hidden shadow-2xl flex flex-col lg:flex-row relative">
              
              {/* LEFT: MAIN CONTENT FORM */}
              <div className="flex-1 overflow-y-auto custom-scrollbar bg-white p-12 space-y-10 pb-32">
                <header className="flex justify-between items-center mb-4">
                    <h3 className="font-black uppercase italic tracking-tighter text-2xl">{editingId ? "Edit" : "New"} Solution</h3>
                    <button onClick={() => setIsModalOpen(false)} className="lg:hidden p-2"><X /></button>
                </header>

                <form id="solution-form" onSubmit={handleSubmit} className="space-y-10">
                  {/* Title */}
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Solution Title</label>
                    <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full text-3xl font-black uppercase italic outline-none border-b-4 border-gray-50 focus:border-[#d11a2a] transition-all pb-2" placeholder="Post Title..." />
                  </div>

                  {/* Label Selector */}
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Category Label</label>
                    <div className="grid grid-cols-4 gap-2">
                      {LABEL_OPTIONS.map((opt) => (
                        <button key={opt} type="button" onClick={() => setLabel(opt)} className={`p-4 rounded-xl border-2 text-[10px] font-black uppercase italic transition-all ${label === opt ? "bg-black text-white border-black" : "bg-white text-gray-400 border-gray-100 hover:border-gray-200"}`}>{opt}</button>
                      ))}
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Description</label>
                    <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full text-sm font-medium text-gray-600 bg-gray-50 rounded-2xl p-6 outline-none focus:ring-2 focus:ring-[#d11a2a]/20 resize-none" />
                  </div>

                  {/* Image Dropzone */}
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Main Image</label>
                    <div 
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleImageFile(Array.from(e.dataTransfer.files)); }}
                        className={`relative border-2 border-dashed rounded-2xl h-44 flex flex-col items-center justify-center transition-all overflow-hidden ${isDragging ? "border-[#d11a2a] bg-red-50" : "border-gray-200"}`}
                    >
                      {mainImage ? (
                        <>
                          <img src={mainImage} className="absolute inset-0 w-full h-full object-cover opacity-30" />
                          <button type="button" onClick={() => setMainImage("")} className="relative z-10 bg-white px-4 py-2 rounded-lg text-[9px] font-black uppercase shadow-sm">Change Image</button>
                        </>
                      ) : (
                        <div className="text-center">
                          <ImageIcon className="mx-auto mb-2 text-gray-300" size={24} />
                          <input type="file" className="hidden" id="img-input" onChange={(e) => e.target.files && handleImageFile(Array.from(e.target.files))} />
                          <label htmlFor="img-input" className="cursor-pointer text-[9px] font-black uppercase bg-black text-white px-4 py-2 rounded-lg hover:bg-[#d11a2a]">Upload Image</label>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Multi Selectors (Websites/Series) ... (Keep your original logic here) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Target Websites</label>
                        <div className="flex flex-wrap gap-2">
                           {WEBSITE_OPTIONS.map(s => (
                             <button key={s} type="button" onClick={() => setSelectedWebsites(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase border-2 transition-all ${selectedWebsites.includes(s) ? "bg-black text-white border-black" : "border-gray-100 text-gray-400"}`}>{s}</button>
                           ))}
                        </div>
                     </div>
                  </div>
                </form>
              </div>

              {/* RIGHT: SEO & PREVIEW SIDEBAR */}
              <div className="w-full lg:w-[30rem] bg-gray-50 border-l border-gray-100 overflow-y-auto custom-scrollbar p-8 space-y-8">
                <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6 shadow-sm">
                  <header className="flex items-center gap-2 border-b border-gray-100 pb-4">
                    <Globe size={16} className="text-emerald-500" />
                    <h4 className="font-black text-xs uppercase tracking-widest text-slate-800">SEO Optimization</h4>
                  </header>

                  {/* SEO Inputs */}
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className="text-[9px] font-black text-slate-500 uppercase">SEO Title</label>
                        <span className={`text-[8px] font-bold ${seoTitle.length > 60 ? "text-red-500" : "text-emerald-500"}`}>{seoTitle.length}/60</span>
                      </div>
                      <input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:border-emerald-500 outline-none" placeholder={title} />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-500 uppercase">URL Slug</label>
                      <input value={seoSlug} onChange={(e) => setSeoSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))} className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-mono focus:border-emerald-500 outline-none" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className="text-[9px] font-black text-slate-500 uppercase">Meta Description</label>
                        <span className={`text-[8px] font-bold ${seoDescription.length > 160 ? "text-red-500" : "text-emerald-500"}`}>{seoDescription.length}/160</span>
                      </div>
                      <textarea value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} rows={3} className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm resize-none focus:border-emerald-500 outline-none" placeholder="Brief summary for search engines..." />
                    </div>
                  </div>
                </div>

                {/* Google Preview */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <span className="text-[9px] font-black text-slate-400 uppercase">Search Preview</span>
                    <div className="flex bg-gray-200 rounded-lg p-1">
                      <button onClick={() => setPreviewMode("mobile")} className={`p-1.5 rounded-md transition-all ${previewMode === "mobile" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500"}`}><Smartphone size={12} /></button>
                      <button onClick={() => setPreviewMode("desktop")} className={`p-1.5 rounded-md transition-all ${previewMode === "desktop" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500"}`}><Monitor size={12} /></button>
                    </div>
                  </div>

                  <div className={`bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-1 ${previewMode === "mobile" ? "max-w-[320px] mx-auto" : "w-full"}`}>
                    <div className="text-[12px] text-[#202124] flex items-center gap-1 mb-1 truncate">
                      <span>https://vah.com.ph</span>
                      <span className="text-gray-400">› solutions › {seoSlug || "slug"}</span>
                    </div>
                    <h3 className="text-[18px] text-[#1a0dab] font-medium leading-tight hover:underline cursor-pointer line-clamp-2">
                      {seoTitle || title || "SEO Title Preview"}
                    </h3>
                    <p className="text-[13px] text-[#4d5156] line-clamp-2 leading-snug">
                      {seoDescription || "Provide a meta description to see how this solution appears in Google search results..."}
                    </p>
                    {mainImage && (
                        <div className="mt-2 h-20 w-full rounded-lg overflow-hidden border border-gray-100">
                           <img src={mainImage} className="w-full h-full object-cover" />
                        </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ACTION FOOTER */}
              <div className="absolute bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-gray-100 p-8 flex justify-end gap-4 z-50">
                <button type="button" onClick={() => setIsModalOpen(false)} className="bg-gray-100 text-gray-600 px-8 py-3 rounded-xl font-black uppercase text-[10px]">Cancel</button>
                <button form="solution-form" type="submit" disabled={loading} className="bg-black text-white px-10 py-3 rounded-xl font-black uppercase text-[10px] flex items-center gap-2 hover:bg-[#d11a2a] transition-all disabled:opacity-50">
                  {loading ? <Loader2 className="animate-spin" size={16} /> : <><Save size={16} /> Save Solution</>}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  )
}

export default SolutionsManagerContent