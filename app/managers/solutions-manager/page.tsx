"use client"

import React from "react"
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
} from "firebase/firestore"
import { 
  Plus, Pencil, Trash2, Loader2, X, Save, Package, 
  ImagePlus, FileUp, ChevronDown, ChevronRight, FileText, Layers 
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { uploadToCloudinary } from "@/lib/cloudinary"
import { PageWrapper } from "@/components/sidebar/page-wrapper"

// --- Types ---
type Product = {
  id: string
  name: string
  pdfUrl?: string
  pdfFile?: File | null
  createdAt?: any
}

type Series = {
  id: string
  name: string
  products: Product[]
  createdAt?: any
}

type Solution = {
  id: string
  title: string
  description: string
  mainImage?: string
  series: Series[]
  createdAt?: any
}

const SolutionsManagerContent = () => {
  const [solutions, setSolutions] = useState<Solution[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  
  // FIX: Moved editingId to state so it persists during re-renders
  const [editingId, setEditingId] = useState<string | null>(null)
  
  // New UI State: Track which table row is expanded
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null)

  // --- Form States ---
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [mainImage, setMainImage] = useState<File | null>(null)
  const [mainImagePrev, setMainImagePrev] = useState<string | null>(null)
  const [series, setSeries] = useState<Series[]>([])

  // --- Real-time Data Sync ---
  useEffect(() => {
    const q = query(collection(db, "solutions"), orderBy("createdAt", "desc"))
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const solsData = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const seriesSnapshot = await getDocs(collection(db, "solutions", doc.id, "series"))
          const seriesData = await Promise.all(
            seriesSnapshot.docs.map(async (seriesDoc) => {
              const productsSnapshot = await getDocs(collection(db, "solutions", doc.id, "series", seriesDoc.id, "products"))
              return {
                id: seriesDoc.id,
                ...seriesDoc.data(),
                products: productsSnapshot.docs.map((p) => ({ id: p.id, ...p.data() })),
              } as Series
            }),
          )
          return {
            id: doc.id,
            ...doc.data(),
            series: seriesData,
          } as Solution
        }),
      )
      setSolutions(solsData)
    })
    return () => unsubscribe()
  }, [])

  // --- Handlers ---
  const addSeries = () => {
    setSeries([...series, { id: Date.now().toString(), name: "", products: [] }])
  }

  const removeSeries = (index: number) => {
    setSeries(series.filter((_, i) => i !== index))
  }

  const updateSeries = (index: number, data: Partial<Series>) => {
    const newSeries = [...series]
    newSeries[index] = { ...newSeries[index], ...data }
    setSeries(newSeries)
  }

  const addProduct = (seriesIndex: number) => {
    const newSeries = [...series]
    newSeries[seriesIndex].products.push({
      id: Date.now().toString(),
      name: "",
      pdfFile: null,
      pdfUrl: "",
    })
    setSeries(newSeries)
  }

  const removeProduct = (seriesIndex: number, productIndex: number) => {
    const newSeries = [...series]
    newSeries[seriesIndex].products = newSeries[seriesIndex].products.filter((_, i) => i !== productIndex)
    setSeries(newSeries)
  }

  const updateProduct = (seriesIndex: number, productIndex: number, data: Partial<Product>) => {
    const newSeries = [...series]
    newSeries[seriesIndex].products[productIndex] = {
      ...newSeries[seriesIndex].products[productIndex],
      ...data,
    }
    setSeries(newSeries)
  }

  const resetForm = () => {
    setEditingId(null)
    setTitle("")
    setDescription("")
    setMainImage(null)
    setMainImagePrev(null)
    setSeries([])
  }

  // ... inside SolutionsManagerContent ...

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!title || !description || (!mainImagePrev && !mainImage)) {
    return alert("Required: Title, Description, and Main Image.");
  }

  setLoading(true);
  try {
    let finalMainImage = mainImagePrev;
    if (mainImage) finalMainImage = await uploadToCloudinary(mainImage);

    // 1. Initialize a Batch
    const { writeBatch, doc, collection } = await import("firebase/firestore");
    const batch = writeBatch(db);

    let currentSolId = editingId;
    const timestamp = serverTimestamp();

    if (editingId) {
      // UPDATE EXISTING
      const solRef = doc(db, "solutions", editingId);
      batch.update(solRef, {
        title,
        description,
        mainImage: finalMainImage,
        updatedAt: timestamp, // This trigger is what makes the UI update live
      });

      // Clear old sub-collections (using a helper or manual refs)
      const existingSeries = await getDocs(collection(db, "solutions", editingId, "series"));
      existingSeries.docs.forEach((d) => batch.delete(d.ref));
    } else {
      // CREATE NEW
      const newSolRef = doc(collection(db, "solutions"));
      currentSolId = newSolRef.id;
      batch.set(newSolRef, {
        title,
        description,
        mainImage: finalMainImage,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }

    // 2. Add Series and Products to the Batch
    for (const s of series) {
      const sRef = doc(collection(db, "solutions", currentSolId!, "series"));
      batch.set(sRef, { name: s.name, createdAt: timestamp });

      for (const p of s.products) {
        const pRef = doc(collection(db, "solutions", currentSolId!, "series", sRef.id, "products"));
        // Note: PDF upload is still async, we do it before the batch commit
        const pdfUrl = p.pdfFile ? await uploadToCloudinary(p.pdfFile) : p.pdfUrl;
        
        batch.set(pRef, {
          name: p.name,
          pdfUrl: pdfUrl || "",
          createdAt: timestamp,
        });
      }
    }

    // 3. Commit the batch - This is ONE atomic operation
    await batch.commit();

    setIsModalOpen(false);
    resetForm();
    // No need to refresh or fetch! onSnapshot handles the rest.
  } catch (err) {
    console.error("Save Error:", err);
    alert("Save failed. Check console.");
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter italic">
            Solutions <span className="text-[#d11a2a]">Catalog</span>
          </h2>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">
            Hierarchy: Solution → Series → PDF Products
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="bg-black text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-[#d11a2a] transition-all shadow-lg"
        >
          <Plus size={18} /> New Solution
        </button>
      </div>

      {/* SOLUTIONS TABLE */}
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50/50 border-b border-gray-100 text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">
            <tr>
              <th className="px-8 py-6 w-10"></th>
              <th className="px-8 py-6">Solution</th>
              <th className="px-8 py-6">Content Overview</th>
              <th className="px-8 py-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {solutions.map((solution) => (
              <React.Fragment key={solution.id}>
                <tr className="hover:bg-gray-50/30 transition-colors group">
                  <td className="px-8 py-6">
                    <button 
                      onClick={() => setExpandedRowId(expandedRowId === solution.id ? null : solution.id)}
                      className="text-gray-400 hover:text-black transition-colors"
                    >
                      {expandedRowId === solution.id ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                    </button>
                  </td>
                  <td className="px-8 py-6">
                    <h4 className="font-black text-gray-900 uppercase text-sm tracking-tight">{solution.title}</h4>
                    <p className="text-[10px] text-gray-400 mt-1 line-clamp-1">{solution.description}</p>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex gap-2">
                      <span className="text-[9px] font-black uppercase text-gray-600 bg-gray-100 px-3 py-1 rounded-full flex items-center gap-1">
                        <Layers size={10} /> {solution.series.length} Series
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setEditingId(solution.id);
                          setTitle(solution.title);
                          setDescription(solution.description);
                          setMainImagePrev(solution.mainImage || null);
                          setSeries(solution.series);
                          setIsModalOpen(true);
                        }}
                        className="p-3 bg-gray-50 text-gray-400 hover:bg-black hover:text-white rounded-xl transition-all"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => confirm("Delete permanently?") && deleteDoc(doc(db, "solutions", solution.id))}
                        className="p-3 bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
                
                {/* EXPANDABLE SECTION IN TABLE */}
                <AnimatePresence>
                  {expandedRowId === solution.id && (
                    <tr>
                      <td colSpan={4} className="bg-gray-50/50 px-12 py-6">
                        <motion.div 
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                        >
                          {solution.series.map((s) => (
                            <div key={s.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                              <h5 className="font-black text-[10px] uppercase text-[#d11a2a] mb-3 flex items-center gap-2">
                                <Layers size={12} /> {s.name}
                              </h5>
                              <div className="space-y-2">
                                {s.products.map((p) => (
                                  <div key={p.id} className="flex items-center gap-2 text-xs text-gray-500 group/item">
                                    <FileText size={12} className="text-gray-300" />
                                    <span className="truncate">{p.name}</span>
                                    <a href={p.pdfUrl} target="_blank" className="ml-auto opacity-0 group-hover/item:opacity-100 text-[#d11a2a] text-[9px] font-bold uppercase">View PDF</a>
                                  </div>
                                ))}
                                {s.products.length === 0 && <p className="text-[9px] italic text-gray-300">No products listed</p>}
                              </div>
                            </div>
                          ))}
                          {solution.series.length === 0 && <div className="col-span-full py-4 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">No Series Data Found</div>}
                        </motion.div>
                      </td>
                    </tr>
                  )}
                </AnimatePresence>
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* FULL-HEIGHT SIDE MODAL (EDIT VIEW) */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex justify-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 25 }} className="relative bg-white h-screen w-full max-w-2xl shadow-2xl overflow-y-auto">
              
              {/* MODAL HEADER */}
              <div className="p-8 border-b border-gray-100 sticky top-0 bg-white/80 backdrop-blur-md z-20 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-red-50 text-[#d11a2a] rounded-xl"><Package size={24} /></div>
                  <h3 className="font-black uppercase italic tracking-tighter text-2xl">{editingId ? "Update" : "Create"} Solution</h3>
                </div>
                <div className="flex items-center gap-4">
                  <button onClick={() => setIsModalOpen(false)} className="text-[10px] font-black uppercase tracking-widest text-gray-400">Cancel</button>
                  <button onClick={handleSubmit} disabled={loading} className="bg-black text-white px-8 py-4 rounded-full font-black uppercase text-[10px] tracking-[0.2em] hover:bg-[#d11a2a] flex items-center gap-3 disabled:opacity-50 transition-all shadow-xl">
                    {loading ? <Loader2 className="animate-spin" size={16} /> : <><Save size={16} /> Save Changes</>}
                  </button>
                </div>
              </div>

              {/* MODAL FORM */}
              <div className="p-12 space-y-12 pb-32">
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Global Title</label>
                  <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. WATERPROOFING SYSTEMS" className="w-full text-4xl font-black uppercase italic outline-none border-b-4 border-gray-50 focus:border-[#d11a2a] transition-all pb-2" />
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Detailed Description</label>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What makes this solution unique?" className="w-full text-sm outline-none border-2 border-gray-50 focus:border-[#d11a2a] transition-all bg-gray-50 p-4 rounded-2xl min-h-[100px] resize-none" />
                </div>

                {/* IMAGE UPLOAD */}
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase text-gray-400 flex items-center gap-2"><ImagePlus size={14} /> Thumbnail Image</label>
                  <label className="flex items-center gap-3 cursor-pointer bg-gray-900 text-white px-6 py-3 rounded-xl text-[9px] font-black uppercase hover:bg-[#d11a2a] transition-all shadow-lg w-fit">
                    <ImagePlus size={16} /> {mainImagePrev ? "Change Image" : "Upload Thumbnail"}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setMainImage(f); setMainImagePrev(URL.createObjectURL(f)); } }} />
                  </label>
                  {mainImagePrev && (
                    <div className="relative aspect-video rounded-2xl overflow-hidden border-4 border-gray-50">
                      <img src={mainImagePrev} className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>

                {/* NESTED SERIES & PRODUCTS MANAGER */}
                <div className="space-y-6 pt-8 border-t-2 border-gray-50">
                  <div className="flex justify-between items-center">
                    <h4 className="text-[11px] font-black uppercase tracking-widest text-gray-900 flex items-center gap-2">
                      <Layers size={16} className="text-[#d11a2a]" /> Series Architecture
                    </h4>
                    <button type="button" onClick={addSeries} className="text-[9px] font-black bg-gray-100 text-black px-4 py-2 rounded-lg hover:bg-black hover:text-white transition-all">+ Add New Series</button>
                  </div>

                  <div className="space-y-4">
                    {series.map((s, sIdx) => (
                      <div key={s.id} className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 relative group">
                        <div className="flex gap-4 mb-4">
                          <input 
                            value={s.name} 
                            onChange={(e) => updateSeries(sIdx, { name: e.target.value })} 
                            placeholder="Series Name (e.g. MasterSeal Series)" 
                            className="flex-grow bg-white border border-gray-200 rounded-xl px-4 py-2 font-black uppercase text-xs outline-none focus:border-[#d11a2a]" 
                          />
                          <button onClick={() => removeSeries(sIdx)} className="p-2 text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                        </div>

                        {/* NESTED PRODUCTS */}
                        <div className="space-y-2 ml-4 border-l-2 border-gray-200 pl-4">
                          {s.products.map((p, pIdx) => (
                            <div key={p.id} className="flex items-center gap-3 bg-white p-2 border border-gray-100 rounded-lg">
                              <input 
                                value={p.name} 
                                onChange={(e) => updateProduct(sIdx, pIdx, { name: e.target.value })} 
                                placeholder="Product Name" 
                                className="flex-grow text-[10px] font-bold outline-none" 
                              />
                              <label className="cursor-pointer text-gray-400 hover:text-[#d11a2a] p-1">
                                <FileUp size={14} />
                                <input type="file" accept=".pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) updateProduct(sIdx, pIdx, { pdfFile: f }); }} />
                              </label>
                              {(p.pdfFile || p.pdfUrl) && <span className="text-[8px] font-black text-green-500 bg-green-50 px-2 py-0.5 rounded">PDF LOADED</span>}
                              <button onClick={() => removeProduct(sIdx, pIdx)} className="text-gray-300 hover:text-red-500"><X size={12} /></button>
                            </div>
                          ))}
                          <button onClick={() => addProduct(sIdx)} className="w-full py-2 text-[9px] font-black text-gray-400 border-2 border-dashed border-gray-200 rounded-lg hover:border-[#d11a2a] hover:text-[#d11a2a] transition-all mt-2">+ Add Product to {s.name || 'Series'}</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function SolutionsManagerPage() {
  return (
    <PageWrapper>
      <SolutionsManagerContent />
    </PageWrapper>
  )
}