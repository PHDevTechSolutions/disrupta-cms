"use client"

import React from "react"

import { useEffect, useState } from "react"
import { db } from "@/lib/firebase"
import { collection, addDoc, updateDoc, deleteDoc, doc, query, orderBy, onSnapshot } from "firebase/firestore"
import { serverTimestamp } from "firebase/firestore"
import { PageWrapper } from "@/components/sidebar/page-wrapper"
import { Plus, Pencil, Trash2, Loader2, Save, X, Upload, File } from "lucide-react"
import { uploadToCloudinary } from "@/lib/cloudinary"

type Product = {
  name: string
  pdfUrl: string
  fileName: string
}

type Series = {
  id: string
  name: string
  website: string
  products?: Product[]
  createdAt?: any
}

const SeriesManagerContent = () => {
  const [seriesList, setSeriesList] = useState<Series[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadingFiles, setUploadingFiles] = useState(false)

  // --- Form States ---
  const [name, setName] = useState("")
  const [website, setWebsite] = useState("Disruptive Solutions Inc")
  const [products, setProducts] = useState<Product[]>([])

  // --- Real-time Data Sync ---
  useEffect(() => {
    const q = query(collection(db, "series"), orderBy("createdAt", "desc"))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSeriesList(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Series)))
    })
    return () => unsubscribe()
  }, [])

  // --- PDF Processing ---
  const parsePdfFileName = (fileName: string): string => {
    // Remove file extension
    let name = fileName.replace(/\.pdf$/i, "")
    // Remove "TDS" or "tds" from the name
    name = name.replace(/\s*TDS\s*/gi, "").trim()
    // Replace (r) with ®
    name = name.replace(/\(r\)/gi, "®")
    return name
  }

  const handleFiles = async (files: File[]) => {
    const pdfFiles = Array.from(files).filter((f) => f.type === "application/pdf" || f.name.endsWith(".pdf"))
    
    if (pdfFiles.length === 0) {
      alert("Please drop PDF files only.")
      return
    }

    setUploadingFiles(true)
    try {
      const newProducts: Product[] = []
      
      for (const file of pdfFiles) {
        const pdfUrl = await uploadToCloudinary(file)
        const productName = parsePdfFileName(file.name)
        
        newProducts.push({
          name: productName,
          pdfUrl,
          fileName: file.name,
        })
      }

      setProducts([...products, ...newProducts])
    } catch (error) {
      console.error("[v0] Error uploading PDFs:", error)
      alert("Error uploading PDF files.")
    } finally {
      setUploadingFiles(false)
    }
  }

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files))
      e.dataTransfer.clearData()
    }
  }

  const removeProduct = (index: number) => {
    setProducts(products.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      return alert("Series name is required.")
    }

    setLoading(true)
    try {
      const seriesData = {
        name: name.trim(),
        website,
        products: products.length > 0 ? products : [],
        updatedAt: serverTimestamp(),
      }

      if (editingId) {
        await updateDoc(doc(db, "series", editingId), seriesData)
      } else {
        await addDoc(collection(db, "series"), { ...seriesData, createdAt: serverTimestamp() })
      }

      setIsModalOpen(false)
      resetForm()
    } catch (err) {
      console.error("[v0] Error saving series:", err)
      alert("Error saving series.")
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setEditingId(null)
    setName("")
    setWebsite("Disruptive Solutions Inc")
    setProducts([])
  }

  const handleEditClick = (series: Series) => {
    setEditingId(series.id)
    setName(series.name)
    setWebsite(series.website)
    setProducts(series.products || [])
    setIsModalOpen(true)
  }

  return (
    <PageWrapper>
      <div className="space-y-8">
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter italic">
              Series <span className="text-[#d11a2a]">Manager</span>
            </h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">
              Manage product series across websites
            </p>
          </div>
          <button
            onClick={() => {
              resetForm()
              setIsModalOpen(true)
            }}
            className="bg-black text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-[#d11a2a] transition-all shadow-lg shadow-gray-200"
          >
            <Plus size={18} /> New Series
          </button>
        </div>

        {/* SERIES LIST - TABLE */}
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50 border-b border-gray-100 text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">
              <tr>
                <th className="px-8 py-6">Series Name</th>
                <th className="px-8 py-6 text-center">Website</th>
                <th className="px-8 py-6 text-center">Products</th>
                <th className="px-8 py-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {seriesList.map((series) => (
                <tr key={series.id} className="hover:bg-gray-50/30 transition-colors group">
                  <td className="px-8 py-6">
                    <h4 className="font-black text-gray-900 uppercase text-sm">{series.name}</h4>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <span
                      className={`text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full ${
                        series.website === "Disruptive Solutions Inc"
                          ? "bg-green-50 text-green-500"
                          : series.website === "Ecoshift Corporation"
                            ? "bg-blue-50 text-blue-500"
                            : "bg-orange-50 text-orange-500"
                      }`}
                    >
                      {series.website}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <span className="text-[10px] font-black text-gray-600">
                      {(series.products || []).length} product{(series.products || []).length !== 1 ? "s" : ""}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleEditClick(series)}
                        className="p-3 bg-gray-50 text-gray-400 hover:bg-black hover:text-white rounded-xl transition-all"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => confirm("Delete this series permanently?") && deleteDoc(doc(db, "series", series.id))}
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

        {/* MODAL */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              {/* MODAL HEADER */}
              <div className="sticky top-0 bg-white border-b border-gray-100 px-12 py-8 flex justify-between items-center">
                <div>
                  <h3 className="font-black uppercase italic tracking-tighter text-2xl">
                    {editingId ? "Edit Series" : "Add Series"}
                  </h3>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              {/* MODAL CONTENT */}
              <form onSubmit={handleSubmit} className="p-12 space-y-12 pb-32">
                {/* SERIES NAME */}
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
                    Series Name
                  </label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter series name..."
                    className="w-full text-4xl font-black uppercase italic outline-none border-b-4 border-gray-50 focus:border-[#d11a2a] transition-all pb-2"
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

                {/* PDF DROPZONE */}
                <div className="space-y-4 pt-8 border-t-2 border-gray-50">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
                    Product Data Sheets (PDFs)
                  </label>
                  <div
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                    className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
                      isDragging
                        ? "border-[#d11a2a] bg-red-50/50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <Upload className="mx-auto mb-3 text-gray-400" size={32} />
                    <p className="text-sm font-black uppercase text-gray-600 mb-1">
                      Drag and drop PDF files here
                    </p>
                    <p className="text-[10px] text-gray-400 mb-3">or</p>
                    <label className="bg-black text-white px-6 py-2 rounded-lg text-[9px] font-black uppercase cursor-pointer hover:bg-[#d11a2a] transition-all inline-block">
                      Select Files
                      <input
                        type="file"
                        accept=".pdf"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files) {
                            handleFiles(Array.from(e.target.files))
                          }
                        }}
                      />
                    </label>
                  </div>

                  {/* PRODUCT LIST */}
                  {products.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest">
                        Products ({products.length})
                      </p>
                      <div className="space-y-2">
                        {products.map((product, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100"
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <File size={14} className="text-gray-400 flex-shrink-0" />
                              <div className="min-w-0 flex-1">
                                <p className="text-[10px] font-black text-gray-900 uppercase truncate">
                                  {product.name}
                                </p>
                                <p className="text-[8px] text-gray-400 truncate">{product.fileName}</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeProduct(idx)}
                              className="p-1.5 text-gray-300 hover:text-red-500 transition-colors flex-shrink-0"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {uploadingFiles && (
                    <div className="flex items-center justify-center gap-2 text-[10px] font-black text-gray-600">
                      <Loader2 className="animate-spin" size={14} />
                      Uploading files...
                    </div>
                  )}
                </div>

                {/* SUBMIT BUTTON */}
                <div className="pt-8 border-t-2 border-gray-50 flex gap-4 justify-end">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="bg-gray-100 text-gray-600 px-10 py-4 rounded-full font-black uppercase text-[10px] tracking-[0.2em] hover:bg-gray-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-black text-white px-10 py-4 rounded-full font-black uppercase text-[10px] tracking-[0.2em] hover:bg-[#d11a2a] flex items-center gap-3 shadow-xl shadow-gray-200 disabled:opacity-50 transition-all"
                  >
                    {loading ? (
                      <Loader2 className="animate-spin" size={16} />
                    ) : (
                      <>
                        <Save size={16} /> Save Series
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  )
}

export default SeriesManagerContent
