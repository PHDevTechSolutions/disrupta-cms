"use client"

import type React from "react"
import { useState, useEffect } from "react"
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
  getDocs,
  arrayUnion,
  writeBatch,
} from "firebase/firestore"
import { 
  Plus, Pencil, Trash2, Loader2, Save, Globe, Settings2, Check, Square, CheckSquare, X
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { PageWrapper } from "@/components/sidebar/page-wrapper"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

const SpecsManagerContent = () => {
  const [specs, setSpecs] = useState<any[]>([])
  const [productFamilies, setProductFamilies] = useState<any[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [familiesLoading, setFamiliesLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [name, setName] = useState("")
  const [selectedFamilies, setSelectedFamilies] = useState<string[]>([])
  const [selectedWebsites, setSelectedWebsites] = useState<string[]>([])

  useEffect(() => {
    const q = query(collection(db, "specs"), orderBy("createdAt", "desc"))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSpecs(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })))
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    const q = query(collection(db, "categoriesmaintenance"), orderBy("createdAt", "desc"))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setProductFamilies(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })))
      setFamiliesLoading(false)
    })
    return () => unsubscribe()
  }, [])

  const toggleSelectAll = () => {
    if (selectedIds.length === specs.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(specs.map(s => s.id))
    }
  }

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} specifications?`)) return
    setLoading(true)
    try {
      const batch = writeBatch(db)
      selectedIds.forEach((id) => batch.delete(doc(db, "specs", id)))
      await batch.commit()
      setSelectedIds([])
      toast.success("Specifications deleted successfully")
    } catch (err) {
      toast.error("Error during batch deletion")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return toast.error("Name is required")
    if (selectedFamilies.length === 0) return toast.error("Select at least one product family")

    setLoading(true)
    try {
      const cleanName = name.trim()
      const lowerName = cleanName.toLowerCase()

      if (editingId) {
        await updateDoc(doc(db, "specs", editingId), {
          name: cleanName,
          productFamilies: selectedFamilies,
          updatedAt: serverTimestamp(),
        })
      } else {
        // CASE-INSENSITIVE DUPLICATE CHECK
        const snap = await getDocs(collection(db, "specs"))
        const existingDoc = snap.docs.find(d => d.data().name?.toLowerCase() === lowerName)

        if (existingDoc) {
          // Merge product families if name matches regardless of casing
          await updateDoc(doc(db, "specs", existingDoc.id), {
            productFamilies: arrayUnion(...selectedFamilies),
            updatedAt: serverTimestamp(),
          })
          toast.info(`Merged with existing spec: ${existingDoc.data().name}`)
        } else {
          // Create new
          await addDoc(collection(db, "specs"), {
            name: cleanName,
            productFamilies: selectedFamilies,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          })
        }
      }
      setIsModalOpen(false)
      resetForm()
      toast.success("Specification saved")
    } catch (err) {
      toast.error("Error saving spec")
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setEditingId(null)
    setName("")
    setSelectedFamilies([])
    setSelectedWebsites([])
  }

  const toggleFamily = (familyId: string) => {
    setSelectedFamilies((prev) =>
      prev.includes(familyId) ? prev.filter((f) => f !== familyId) : [...prev, familyId]
    )
  }

  const getAllAvailableWebsites = () => {
    const websites = new Set<string>()
    productFamilies.forEach((family) => {
      if (family?.websites && Array.isArray(family.websites)) {
        family.websites.forEach((website: string) => websites.add(website))
      }
    })
    return Array.from(websites).sort()
  }

  const getFilteredFamilies = () => {
    if (selectedWebsites.length === 0) {
      return productFamilies
    }
    return productFamilies.filter((family) => {
      if (!family.websites || !Array.isArray(family.websites)) return false
      return selectedWebsites.some((website) => family.websites.includes(website))
    })
  }

  const toggleWebsite = (website: string) => {
    setSelectedWebsites((prev) =>
      prev.includes(website) ? prev.filter((w) => w !== website) : [...prev, website]
    )
  }

  return (
    <div className="space-y-8 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter italic">
            Specs <span className="text-purple-600">Maintenance</span>
          </h2>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">
            System-wide configuration & technical parameters
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="bg-black text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-purple-600 transition-all shadow-lg shadow-gray-200"
        >
          <Plus size={18} /> New Specification
        </button>
      </div>

      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[90] bg-black text-white px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-8 border border-white/10 backdrop-blur-xl"
          >
            <div className="flex items-center gap-4 border-r border-white/20 pr-8">
              <span className="text-[10px] font-black uppercase tracking-widest text-purple-400">
                {selectedIds.length} Selected
              </span>
              <button onClick={() => setSelectedIds([])} className="hover:text-red-400 transition-colors">
                <X size={16} />
              </button>
            </div>
            <button 
              onClick={handleBulkDelete}
              disabled={loading}
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-red-400 hover:text-red-300 transition-colors"
            >
              {loading ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}
              Delete Selected
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50/50 border-b border-gray-100 text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">
            <tr>
              <th className="px-8 py-6 w-10">
                <button onClick={toggleSelectAll} className="text-gray-300 hover:text-purple-600 transition-colors">
                  {selectedIds.length === specs.length && specs.length > 0 ? (
                    <CheckSquare size={18} className="text-purple-600" />
                  ) : (
                    <Square size={18} />
                  )}
                </button>
              </th>
              <th className="px-8 py-6">Specification Name</th>
              <th className="px-8 py-6 text-center">Product Families</th>
              <th className="px-8 py-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {specs.map((spec) => {
              const isSelected = selectedIds.includes(spec.id)
              return (
                <tr key={spec.id} className={cn("hover:bg-gray-50/30 transition-colors group", isSelected && "bg-purple-50/20")}>
                  <td className="px-8 py-6">
                    <button onClick={() => toggleSelectOne(spec.id)} className={cn("transition-colors", isSelected ? "text-purple-600" : "text-gray-200 group-hover:text-gray-400")}>
                      {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                    </button>
                  </td>
                  <td className="px-8 py-6">
                    <h4 className="font-black text-gray-900 uppercase text-sm tracking-tight">{spec.name}</h4>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-wrap justify-center gap-2">
                      {spec.productFamilies?.map((familyId: string) => {
                        const family = productFamilies.find(f => f.id === familyId)
                        return (
                          <span key={familyId} className="text-[9px] font-black uppercase tracking-widest px-3 py-1 bg-gray-100 text-gray-500 rounded-lg group-hover:bg-purple-50 group-hover:text-purple-600 transition-colors">
                            {family?.title || familyId}
                          </span>
                        )
                      })}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          setEditingId(spec.id)
                          setName(spec.name)
                          setSelectedFamilies(spec.productFamilies || [])
                          setIsModalOpen(true)
                        }}
                        className="p-3 bg-gray-50 text-gray-400 hover:bg-black hover:text-white rounded-xl transition-all"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => confirm("Delete this specification permanently?") && deleteDoc(doc(db, "specs", spec.id))}
                        className="p-3 bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {specs.length === 0 && (
          <div className="py-20 text-center">
            <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest italic">No specifications found</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex justify-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div 
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} 
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative bg-white h-screen w-full max-w-2xl shadow-2xl overflow-y-auto"
            >
              <div className="p-8 border-b border-gray-100 sticky top-0 bg-white/80 backdrop-blur-md z-20 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-50 text-purple-600 rounded-xl"><Settings2 size={24} /></div>
                  <h3 className="font-black uppercase italic tracking-tighter text-2xl">{editingId ? "Edit Spec" : "New Spec"}</h3>
                </div>
                <div className="flex items-center gap-6">
                  <button onClick={() => setIsModalOpen(false)} className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black">Discard</button>
                  <button onClick={handleSubmit} disabled={loading} className="bg-black text-white px-10 py-4 rounded-full font-black uppercase text-[10px] tracking-[0.2em] hover:bg-purple-600 flex items-center gap-3 shadow-xl shadow-gray-200">
                    {loading ? <Loader2 className="animate-spin" size={16} /> : <><Save size={16} /> Save Spec</>}
                  </button>
                </div>
              </div>
              <div className="p-12 space-y-12 pb-32">
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">Specification Name</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. VOLTAGE INPUT"
                    className="w-full text-4xl font-black uppercase italic outline-none border-b-4 border-gray-50 focus:border-purple-600 transition-all placeholder:text-gray-100 pb-2"
                  />
                </div>
                <div className="space-y-6">
                  <div className="flex items-center gap-2">
                    <Globe size={14} className="text-purple-600" />
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">Website Filter (Optional)</label>
                  </div>
                  {familiesLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 size={20} className="animate-spin text-purple-600" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      <div
                        onClick={() => setSelectedWebsites([])}
                        className={cn(
                          "flex items-center justify-between p-5 rounded-2xl border-2 cursor-pointer transition-all",
                          selectedWebsites.length === 0 ? "border-purple-600 bg-purple-50/50" : "border-gray-50 bg-gray-50/30 hover:border-gray-200"
                        )}
                      >
                        <span className={cn("text-xs font-black uppercase italic tracking-tight", selectedWebsites.length === 0 ? "text-purple-900" : "text-gray-400")}>
                          All Websites
                        </span>
                        <div className={cn("w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all", selectedWebsites.length === 0 ? "bg-purple-600 border-purple-600 shadow-lg shadow-purple-200" : "border-gray-200")}>
                          {selectedWebsites.length === 0 && <Check size={14} className="text-white" strokeWidth={4} />}
                        </div>
                      </div>
                      {getAllAvailableWebsites().map((website) => {
                        const isActive = selectedWebsites.includes(website)
                        return (
                          <div
                            key={website}
                            onClick={() => toggleWebsite(website)}
                            className={cn(
                              "flex items-center justify-between p-5 rounded-2xl border-2 cursor-pointer transition-all",
                              isActive ? "border-purple-600 bg-purple-50/50" : "border-gray-50 bg-gray-50/30 hover:border-gray-200"
                            )}
                          >
                            <span className={cn("text-xs font-black uppercase italic tracking-tight", isActive ? "text-purple-900" : "text-gray-400")}>
                              {website}
                            </span>
                            <div className={cn("w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all", isActive ? "bg-purple-600 border-purple-600 shadow-lg shadow-purple-200" : "border-gray-200")}>
                              {isActive && <Check size={14} className="text-white" strokeWidth={4} />}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
                <div className="space-y-6 border-t border-gray-100 pt-6">
                  <div className="flex items-center gap-2">
                    <Globe size={14} className="text-purple-600" />
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">Product Family Assignment</label>
                  </div>
                  {familiesLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 size={20} className="animate-spin text-purple-600" />
                    </div>
                  ) : getFilteredFamilies().length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-[10px] font-black uppercase text-gray-300 tracking-widest">No product families found for selected websites</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      {getFilteredFamilies().map((family) => {
                        const isActive = selectedFamilies.includes(family.id);
                        return (
                          <div key={family.id} onClick={() => toggleFamily(family.id)} className={cn("flex items-center justify-between p-5 rounded-2xl border-2 cursor-pointer transition-all", isActive ? "border-purple-600 bg-purple-50/50" : "border-gray-50 bg-gray-50/30 hover:border-gray-200")}>
                            <span className={cn("text-xs font-black uppercase italic tracking-tight", isActive ? "text-purple-900" : "text-gray-400")}>{family.title}</span>
                            <div className={cn("w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all", isActive ? "bg-purple-600 border-purple-600 shadow-lg shadow-purple-200" : "border-gray-200")}>
                              {isActive && <Check size={14} className="text-white" strokeWidth={4} />}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function SpecsMaintenancePage() {
  return <PageWrapper><SpecsManagerContent /></PageWrapper>
}
