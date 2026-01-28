"use client"

import type React from "react"
import { PageWrapper } from "@/components/sidebar/page-wrapper"
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
import { Plus, Pencil, Trash2, Loader2, X, Save, Eye, EyeOff, Link2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

type Reel = {
  id: string
  website: string
  url: string
  visibility: "public" | "private"
  createdAt?: any
}

const ReelsManagerContent = () => {
  const [reels, setReels] = useState<Reel[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Form States
  const [website, setWebsite] = useState("Disruptive")
  const [url, setUrl] = useState("")
  const [visibility, setVisibility] = useState<"public" | "private">("public")

  // Real-time Data Sync
  useEffect(() => {
    const q = query(collection(db, "reels"), orderBy("createdAt", "desc"))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setReels(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Reel)))
    })
    return () => unsubscribe()
  }, [])

  const resetForm = () => {
    setEditingId(null)
    setWebsite("Disruptive")
    setUrl("")
    setVisibility("public")
  }

  const handleEditClick = (reel: Reel) => {
    setEditingId(reel.id)
    setWebsite(reel.website)
    setUrl(reel.url)
    setVisibility(reel.visibility)
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!website || !url) return alert("Website and URL are required.")

    setLoading(true)
    try {
      const reelData = {
        website,
        url,
        visibility,
        updatedAt: serverTimestamp(),
      }

      if (editingId) {
        await updateDoc(doc(db, "reels", editingId), reelData)
      } else {
        await addDoc(collection(db, "reels"), {
          ...reelData,
          createdAt: serverTimestamp(),
        })
      }

      setIsModalOpen(false)
      resetForm()
    } catch (err) {
      console.error("Error saving reel:", err)
      alert("Error saving reel. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this reel?")) return
    try {
      await deleteDoc(doc(db, "reels", id))
    } catch (err) {
      console.error("Error deleting reel:", err)
      alert("Error deleting reel.")
    }
  }

  return (
    <PageWrapper>
      <div className="space-y-8">
        {/* Header with Add Button */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black text-gray-900">Reels Manager</h1>
            <p className="text-sm text-gray-500 mt-2">Manage your reel content across all websites</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              resetForm()
              setIsModalOpen(true)
            }}
            className="flex items-center gap-2 bg-[#d11a2a] text-white px-6 py-3 rounded-full font-black text-sm uppercase tracking-widest hover:bg-[#b01520] transition-all"
          >
            <Plus size={18} />
            Add Reel
          </motion.button>
        </div>

        {/* Reels Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="px-8 py-6 text-left">Website</th>
                <th className="px-8 py-6 text-left">URL</th>
                <th className="px-8 py-6 text-center">Visibility</th>
                <th className="px-8 py-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reels.map((reel) => (
                <tr key={reel.id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-8 py-6">
                    <span
                      className={`text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full ${
                        reel.website === "Disruptive" ? "bg-green-50 text-green-500" : "bg-orange-50 text-orange-500"
                      }`}
                    >
                      {reel.website}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <a
                      href={reel.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[13px] text-blue-600 hover:underline flex items-center gap-2 truncate"
                    >
                      <Link2 size={14} />
                      {reel.url.length > 50 ? `${reel.url.substring(0, 50)}...` : reel.url}
                    </a>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {reel.visibility === "public" ? (
                        <Eye size={16} className="text-green-500" />
                      ) : (
                        <EyeOff size={16} className="text-gray-400" />
                      )}
                      <span className="text-[10px] font-black uppercase text-gray-600 capitalize">{reel.visibility}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleEditClick(reel)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-all"
                      >
                        <Pencil size={16} className="text-blue-600" />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleDelete(reel.id)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-all"
                      >
                        <Trash2 size={16} className="text-red-600" />
                      </motion.button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {reels.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 text-sm">No reels found. Add your first reel to get started.</p>
            </div>
          )}
        </div>

        {/* Modal Form */}
        <AnimatePresence>
          {isModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
              onClick={() => setIsModalOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              >
                {/* Modal Header */}
                <div className="sticky top-0 bg-white border-b border-gray-100 px-8 py-6 flex items-center justify-between z-10">
                  <h2 className="text-2xl font-black text-gray-900">{editingId ? "Edit Reel" : "Add New Reel"}</h2>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsModalOpen(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-all"
                  >
                    <X size={20} className="text-gray-600" />
                  </motion.button>
                </div>

                {/* Modal Form Content */}
                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                  {/* Website Selector */}
                  <div className="space-y-2">
                    <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest block">Website</span>
                    <select
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      className="font-black text-xs uppercase outline-none bg-transparent cursor-pointer text-gray-900 border-b-2 border-transparent focus:border-[#d11a2a] pb-1 transition-all w-full"
                    >
                      <option>Disruptive</option>
                      <option>Ecoshift Corporation</option>
                      <option>VAH</option>
                    </select>
                  </div>

                  {/* URL Input */}
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Reel URL</label>
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://example.com/reel"
                      className="w-full text-sm outline-none border-2 border-gray-50 focus:border-[#d11a2a] transition-all bg-gray-50 p-4 rounded-2xl"
                    />
                  </div>

                  {/* Visibility Selector */}
                  <div className="space-y-2">
                    <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest block">Visibility</span>
                    <select
                      value={visibility}
                      onChange={(e) => setVisibility(e.target.value as "public" | "private")}
                      className="font-black text-xs uppercase outline-none bg-transparent cursor-pointer text-gray-900 border-b-2 border-transparent focus:border-[#d11a2a] pb-1 transition-all w-full"
                    >
                      <option value="public">Public</option>
                      <option value="private">Private</option>
                    </select>
                  </div>

                  {/* Submit Button */}
                  <div className="flex gap-3 pt-6">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={loading}
                      className="flex-1 bg-[#d11a2a] text-white px-6 py-3 rounded-full font-black text-sm uppercase tracking-widest hover:bg-[#b01520] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                      {loading ? "Saving..." : "Save Reel"}
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-6 py-3 rounded-full font-black text-sm uppercase tracking-widest border-2 border-gray-200 text-gray-900 hover:bg-gray-50 transition-all"
                    >
                      Cancel
                    </motion.button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageWrapper>
  )
}

export default ReelsManagerContent
