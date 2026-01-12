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
} from "firebase/firestore"
import { Plus, Pencil, Trash2, Loader2, ImagePlus, X, AlignLeft, Layout, Save, FileText } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { uploadToCloudinary } from "@/lib/cloudinary"
import { PageWrapper } from "@/components/sidebar/page-wrapper"

type Section = {
  id: string
  type: "paragraph" | "image-detail"
  title?: string
  description?: string
  imageUrl?: string
  imageFile?: File | null
}

const BlogManagerContent = () => {
  const [blogs, setBlogs] = useState<any[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [mainTitle, setMainTitle] = useState("")
  const [category, setCategory] = useState("Industry News")
  const [status, setStatus] = useState("Published")
  const [mainImage, setMainImage] = useState<File | null>(null)
  const [mainImagePrev, setMainImagePrev] = useState<string | null>(null)
  const [sections, setSections] = useState<Section[]>([])

  useEffect(() => {
    const q = query(collection(db, "blogs"), orderBy("createdAt", "desc"))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setBlogs(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })))
    })
    return () => unsubscribe()
  }, [])

  const addParagraph = () => {
    setSections([...sections, { id: Date.now().toString(), type: "paragraph", description: "" }])
  }

  const addImageDetail = () => {
    setSections([
      ...sections,
      { id: Date.now().toString(), type: "image-detail", title: "", description: "", imageUrl: "" },
    ])
  }

  const removeSection = (id: string) => {
    setSections(sections.filter((s) => s.id !== id))
  }

  const updateSection = (id: string, data: Partial<Section>) => {
    setSections(sections.map((s) => (s.id === id ? { ...s, ...data } : s)))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!mainTitle || (!mainImagePrev && !mainImage)) return alert("Headline and Header Image are required.")

    setLoading(true)
    try {
      let finalMainImage = mainImagePrev
      if (mainImage) {
        finalMainImage = await uploadToCloudinary(mainImage)
      }

      const updatedSections = await Promise.all(
        sections.map(async (sec) => {
          if (sec.type === "image-detail" && sec.imageFile) {
            const uploadedUrl = await uploadToCloudinary(sec.imageFile)
            return { ...sec, imageUrl: uploadedUrl, imageFile: null }
          }
          return sec
        }),
      )

      const blogData = {
        title: mainTitle,
        category,
        status,
        coverImage: finalMainImage,
        sections: updatedSections,
        updatedAt: serverTimestamp(),
        slug: mainTitle
          .toLowerCase()
          .replace(/[^\w ]+/g, "")
          .replace(/ +/g, "-"),
      }

      if (editingId) {
        await updateDoc(doc(db, "blogs", editingId), blogData)
      } else {
        await addDoc(collection(db, "blogs"), { ...blogData, createdAt: serverTimestamp() })
      }

      setIsModalOpen(false)
      resetForm()
    } catch (err) {
      console.error(err)
      alert("Error saving story.")
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setEditingId(null)
    setMainTitle("")
    setMainImagePrev(null)
    setMainImage(null)
    setSections([])
    setStatus("Published")
  }

  return (
    <div className="space-y-8">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter italic">
            Editorial <span className="text-[#d11a2a]">Suite</span>
          </h2>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">
            Craft and publish your brand stories
          </p>
        </div>
        <button
          onClick={() => {
            resetForm()
            setIsModalOpen(true)
          }}
          className="bg-black text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-[#d11a2a] transition-all shadow-lg shadow-gray-200"
        >
          <Plus size={18} /> New Story
        </button>
      </div>

      {/* BLOG LIST - MODERN TABLE */}
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50/50 border-b border-gray-100 text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">
            <tr>
              <th className="px-8 py-6">Preview</th>
              <th className="px-8 py-6">Story Details</th>
              <th className="px-8 py-6 text-center">Status</th>
              <th className="px-8 py-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {blogs.map((blog) => (
              <tr key={blog.id} className="hover:bg-gray-50/30 transition-colors group">
                <td className="px-8 py-6">
                  <div className="w-20 h-14 rounded-xl overflow-hidden border border-gray-100 shadow-sm">
                    <img
                      src={blog.coverImage || "/placeholder.svg"}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  </div>
                </td>
                <td className="px-8 py-6">
                  <h4 className="font-black text-gray-900 uppercase text-sm mb-1 truncate max-w-[300px]">
                    {blog.title}
                  </h4>
                  <span className="text-[9px] font-black text-[#d11a2a] uppercase tracking-widest">
                    {blog.category}
                  </span>
                </td>
                <td className="px-8 py-6 text-center">
                  <span
                    className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                      blog.status === "Published" ? "bg-green-50 text-green-500" : "bg-orange-50 text-orange-500"
                    }`}
                  >
                    {blog.status}
                  </span>
                </td>
                <td className="px-8 py-6 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setEditingId(blog.id)
                        setMainTitle(blog.title)
                        setCategory(blog.category)
                        setStatus(blog.status || "Published")
                        setMainImagePrev(blog.coverImage)
                        setSections(blog.sections || [])
                        setIsModalOpen(true)
                      }}
                      className="p-3 bg-gray-50 text-gray-400 hover:bg-black hover:text-white rounded-xl transition-all"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => confirm("Delete this story permanently?") && deleteDoc(doc(db, "blogs", blog.id))}
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
              className="relative bg-white h-screen w-full max-w-5xl shadow-2xl overflow-y-auto"
            >
              {/* MODAL HEADER */}
              <div className="p-8 border-b border-gray-100 sticky top-0 bg-white/80 backdrop-blur-md z-20 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-red-50 text-[#d11a2a] rounded-xl">
                    <FileText size={24} />
                  </div>
                  <h3 className="font-black uppercase italic tracking-tighter text-2xl">
                    {editingId ? "Edit Story" : "Compose Story"}
                  </h3>
                </div>
                <div className="flex items-center gap-6">
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black"
                  >
                    Discard
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="bg-black text-white px-10 py-4 rounded-full font-black uppercase text-[10px] tracking-[0.2em] hover:bg-[#d11a2a] flex items-center gap-3 shadow-xl shadow-gray-200 disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 className="animate-spin" size={16} />
                    ) : (
                      <>
                        <Save size={16} /> Publish Story
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* EDITOR CONTENT */}
              <div className="p-12 md:p-20 space-y-16 pb-40">
                {/* HEADLINE SECTION */}
                <div className="space-y-8">
                  <textarea
                    value={mainTitle}
                    onChange={(e) => setMainTitle(e.target.value)}
                    placeholder="ENTER YOUR HEADLINE..."
                    className="w-full text-6xl font-black uppercase italic outline-none border-none placeholder:text-gray-100 resize-none leading-tight tracking-tighter"
                    rows={2}
                  />

                  <div className="flex flex-wrap gap-10 items-center border-y border-gray-50 py-8">
                    <div className="space-y-2">
                      <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest block">
                        Category
                      </span>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="font-black text-xs uppercase outline-none bg-transparent cursor-pointer text-gray-900 border-b-2 border-transparent focus:border-[#d11a2a] pb-1 transition-all"
                      >
                        <option>Industry News</option>
                        <option>Engineering</option>
                        <option>Tech Updates</option>
                        <option>Case Study</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest block">
                        Visibility
                      </span>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="font-black text-xs uppercase outline-none bg-transparent cursor-pointer text-gray-900 border-b-2 border-transparent focus:border-[#d11a2a] pb-1 transition-all"
                      >
                        <option>Published</option>
                        <option>Draft</option>
                      </select>
                    </div>

                    <label className="ml-auto flex items-center gap-3 cursor-pointer bg-gray-900 text-white px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-[#d11a2a] transition-all shadow-lg">
                      <ImagePlus size={16} /> {mainImagePrev ? "Replace Cover" : "Upload Cover"}
                      <input
                        type="file"
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
                  </div>

                  {mainImagePrev && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="relative aspect-[21/9] rounded-[2.5rem] overflow-hidden shadow-2xl group"
                    >
                      <img src={mainImagePrev || "/placeholder.svg"} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-all" />
                    </motion.div>
                  )}
                </div>

                {/* DYNAMIC BUILDER */}
                <div className="space-y-20 relative">
                  {sections.map((section, index) => (
                    <div key={section.id} className="relative group pl-12 border-l-4 border-gray-50 space-y-6">
                      <div className="absolute -left-[18px] top-0 w-8 h-8 bg-white border-4 border-gray-50 rounded-full flex items-center justify-center text-[10px] font-black text-gray-300">
                        {index + 1}
                      </div>

                      <button
                        onClick={() => removeSection(section.id)}
                        className="absolute -right-4 top-0 bg-white border border-gray-100 rounded-full p-2 text-gray-300 hover:text-red-500 hover:border-red-100 shadow-sm opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100"
                      >
                        <X size={14} />
                      </button>

                      {section.type === "paragraph" ? (
                        <textarea
                          placeholder="Continue the story..."
                          className="w-full text-2xl text-gray-700 outline-none border-none resize-none min-h-[150px] leading-[1.6] placeholder:text-gray-200 font-medium"
                          value={section.description}
                          onChange={(e) => updateSection(section.id, { description: e.target.value })}
                        />
                      ) : (
                        <div className="space-y-8 bg-gray-50/50 p-8 rounded-[2rem] border border-gray-50">
                          <input
                            placeholder="SECTION SUB-HEADER"
                            className="w-full font-black uppercase italic text-lg outline-none border-none tracking-tight bg-transparent"
                            value={section.title}
                            onChange={(e) => updateSection(section.id, { title: e.target.value })}
                          />
                          <div className="grid md:grid-cols-2 gap-10 items-center">
                            <div className="relative aspect-square bg-white rounded-3xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden hover:border-[#d11a2a] transition-all group/img">
                              {section.imageUrl || section.imageFile ? (
                                <img
                                  src={section.imageFile ? URL.createObjectURL(section.imageFile) : section.imageUrl}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="text-center space-y-2 text-gray-300 group-hover/img:text-[#d11a2a]">
                                  <ImagePlus className="mx-auto" size={40} />
                                  <span className="text-[9px] font-black uppercase tracking-widest block">
                                    Insert Image
                                  </span>
                                </div>
                              )}
                              <input
                                type="file"
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                onChange={(e) => updateSection(section.id, { imageFile: e.target.files?.[0] })}
                              />
                            </div>
                            <textarea
                              placeholder="Write a detailed caption or side-story for this image..."
                              className="w-full h-full min-h-[150px] outline-none border-none text-gray-600 text-lg leading-relaxed italic resize-none bg-transparent"
                              value={section.description}
                              onChange={(e) => updateSection(section.id, { description: e.target.value })}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* BUILDER TOOLS */}
                <div className="flex flex-col md:flex-row gap-6 border-t border-gray-50 pt-16">
                  <button
                    onClick={addParagraph}
                    className="flex-1 flex items-center gap-6 p-8 rounded-[2rem] border-2 border-dashed border-gray-100 hover:border-[#d11a2a] hover:bg-red-50/30 transition-all text-gray-300 hover:text-[#d11a2a] group"
                  >
                    <div className="p-4 bg-gray-50 rounded-2xl group-hover:bg-white transition-colors">
                      <AlignLeft size={24} />
                    </div>
                    <div className="text-left">
                      <span className="text-xs font-black uppercase block tracking-widest">Text Block</span>
                      <span className="text-[10px] font-bold text-gray-400 group-hover:text-[#d11a2a]">
                        Add a new paragraph
                      </span>
                    </div>
                  </button>
                  <button
                    onClick={addImageDetail}
                    className="flex-1 flex items-center gap-6 p-8 rounded-[2rem] border-2 border-dashed border-gray-100 hover:border-[#d11a2a] hover:bg-red-50/30 transition-all text-gray-300 hover:text-[#d11a2a] group"
                  >
                    <div className="p-4 bg-gray-50 rounded-2xl group-hover:bg-white transition-colors">
                      <Layout size={24} />
                    </div>
                    <div className="text-left">
                      <span className="text-xs font-black uppercase block tracking-widest">Visual Section</span>
                      <span className="text-[10px] font-bold text-gray-400 group-hover:text-[#d11a2a]">
                        Add image with description
                      </span>
                    </div>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function BlogManagePage() {
  return (
    <PageWrapper>
      <BlogManagerContent />
    </PageWrapper>
  )
}
