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
import { Plus, Pencil, Trash2, Loader2, X, Save, Briefcase, MapPin, Clock, ListChecks } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { PageWrapper } from "@/components/sidebar/page-wrapper"

const CareersManagerContent = () => {
  const [jobs, setJobs] = useState<any[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // --- Form States ---
  const [jobTitle, setJobTitle] = useState("")
  const [category, setCategory] = useState("Sales")
  const [jobType, setJobType] = useState("Full Time")
  const [location, setLocation] = useState("")
  const [qualifications, setQualifications] = useState<string[]>([""])
  const [status, setStatus] = useState("Open")

  useEffect(() => {
    const q = query(collection(db, "careers"), orderBy("createdAt", "desc"))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setJobs(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })))
    })
    return () => unsubscribe()
  }, [])

  const addQualification = () => setQualifications([...qualifications, ""])

  const removeQualification = (index: number) => {
    setQualifications(qualifications.filter((_, i) => i !== index))
  }

  const updateQualification = (index: number, value: string) => {
    const newQuals = [...qualifications]
    newQuals[index] = value
    setQualifications(newQuals)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const filteredQuals = qualifications.filter((q) => q.trim() !== "")

    if (!jobTitle || filteredQuals.length === 0 || !location) {
      return alert("Headline, Location, and at least one Qualification are required.")
    }

    setLoading(true)
    try {
      const jobData = {
        title: jobTitle,
        category,
        jobType,
        location,
        qualifications: filteredQuals,
        status,
        updatedAt: serverTimestamp(),
      }

      if (editingId) {
        await updateDoc(doc(db, "careers", editingId), jobData)
      } else {
        await addDoc(collection(db, "careers"), { ...jobData, createdAt: serverTimestamp() })
      }

      setIsModalOpen(false)
      resetForm()
    } catch (err) {
      console.error(err)
      alert("Error saving job vacancy.")
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setEditingId(null)
    setJobTitle("")
    setCategory("Sales")
    setJobType("Full Time")
    setLocation("")
    setQualifications([""])
    setStatus("Open")
  }

  return (
    <div className="space-y-8">
      {/* HEADER PANEL */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter italic">
            Talent <span className="text-[#d11a2a]">Acquisition</span>
          </h2>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">
            Recruit and manage team opportunities
          </p>
        </div>
        <button
          onClick={() => {
            resetForm()
            setIsModalOpen(true)
          }}
          className="bg-black text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-[#d11a2a] transition-all shadow-lg shadow-gray-200"
        >
          <Plus size={18} /> Post Job Vacancy
        </button>
      </div>

      {/* JOB LIST TABLE */}
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50/50 border-b border-gray-100 text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">
            <tr>
              <th className="px-8 py-6">Position / Role</th>
              <th className="px-8 py-6">Category</th>
              <th className="px-8 py-6">Location</th>
              <th className="px-8 py-6">Type</th>
              <th className="px-8 py-6 text-center">Status</th>
              <th className="px-8 py-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {jobs.map((job) => (
              <tr key={job.id} className="hover:bg-gray-50/30 transition-colors group">
                <td className="px-8 py-6">
                  <h4 className="font-black text-gray-900 uppercase text-sm tracking-tight">{job.title}</h4>
                </td>
                <td className="px-8 py-6">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{job.category}</span>
                </td>
                <td className="px-8 py-6">
                  <div className="flex items-center gap-2 text-gray-500 font-bold text-xs">
                    <MapPin size={14} className="text-[#d11a2a]" /> {job.location}
                  </div>
                </td>
                <td className="px-8 py-6">
                  <span className="text-[10px] font-black uppercase text-gray-900 bg-gray-100 px-3 py-1 rounded-lg">
                    {job.jobType}
                  </span>
                </td>
                <td className="px-8 py-6 text-center">
                  <span
                    className={`text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full ${
                      job.status === "Open" ? "bg-green-50 text-green-500" : "bg-red-50 text-red-500"
                    }`}
                  >
                    {job.status}
                  </span>
                </td>
                <td className="px-8 py-6 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setEditingId(job.id)
                        setJobTitle(job.title)
                        setCategory(job.category)
                        setJobType(job.jobType)
                        setLocation(job.location)
                        setQualifications(Array.isArray(job.qualifications) ? job.qualifications : [job.qualifications])
                        setStatus(job.status)
                        setIsModalOpen(true)
                      }}
                      className="p-3 bg-gray-50 text-gray-400 hover:bg-black hover:text-white rounded-xl transition-all"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() =>
                        confirm("Delete this job vacancy permanently?") && deleteDoc(doc(db, "careers", job.id))
                      }
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
              className="relative bg-white h-screen w-full max-w-2xl shadow-2xl overflow-y-auto"
            >
              {/* MODAL HEADER */}
              <div className="p-8 border-b border-gray-100 sticky top-0 bg-white/80 backdrop-blur-md z-20 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-red-50 text-[#d11a2a] rounded-xl">
                    <Briefcase size={24} />
                  </div>
                  <h3 className="font-black uppercase italic tracking-tighter text-2xl">
                    {editingId ? "Edit Job" : "New Vacancy"}
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
                    className="bg-black text-white px-10 py-4 rounded-full font-black uppercase text-[10px] tracking-[0.2em] hover:bg-[#d11a2a] flex items-center gap-3 shadow-xl shadow-gray-200"
                  >
                    {loading ? (
                      <Loader2 className="animate-spin" size={16} />
                    ) : (
                      <>
                        <Save size={16} /> Save Post
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* MODAL FORM CONTENT */}
              <div className="p-12 space-y-12 pb-32">
                {/* Title Input */}
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">
                    Position Title
                  </label>
                  <input
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="e.g. TERRITORY SALES MANAGER"
                    className="w-full text-4xl font-black uppercase italic outline-none border-b-4 border-gray-50 focus:border-[#d11a2a] transition-all placeholder:text-gray-100 pb-2"
                  />
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-gray-400 flex items-center gap-2">
                      <Briefcase size={12} className="text-[#d11a2a]" /> Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full font-black text-xs uppercase outline-none bg-gray-50 p-4 rounded-2xl border-none cursor-pointer focus:ring-2 focus:ring-[#d11a2a]/10"
                    >
                      <option>Sales</option>
                      <option>Engineering</option>
                      <option>Admin & HR</option>
                      <option>Logistics</option>
                      <option>Marketing</option>
                    </select>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-gray-400 flex items-center gap-2">
                      <Clock size={12} className="text-[#d11a2a]" /> Job Type
                    </label>
                    <select
                      value={jobType}
                      onChange={(e) => setJobType(e.target.value)}
                      className="w-full font-black text-xs uppercase outline-none bg-gray-50 p-4 rounded-2xl border-none cursor-pointer focus:ring-2 focus:ring-[#d11a2a]/10"
                    >
                      <option>Full Time</option>
                      <option>Part Time</option>
                      <option>Contractual</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-gray-400 flex items-center gap-2">
                      <MapPin size={12} className="text-[#d11a2a]" /> Location
                    </label>
                    <input
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. CDO, Manila"
                      className="w-full font-black text-xs uppercase outline-none bg-gray-50 p-4 rounded-2xl border-none focus:ring-2 focus:ring-[#d11a2a]/10"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-gray-400">Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full font-black text-xs uppercase outline-none bg-gray-50 p-4 rounded-2xl border-none cursor-pointer focus:ring-2 focus:ring-[#d11a2a]/10"
                    >
                      <option>Open</option>
                      <option>Closed</option>
                    </select>
                  </div>
                </div>

                {/* DYNAMIC QUALIFICATIONS */}
                <div className="space-y-6 pt-6">
                  <div className="flex justify-between items-end border-b-2 border-gray-50 pb-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-gray-400 flex items-center gap-2 tracking-widest">
                        <ListChecks size={16} className="text-[#d11a2a]" /> Job Qualifications
                      </label>
                      <p className="text-[9px] font-bold text-gray-300 uppercase">
                        Add specific requirements for this role
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={addQualification}
                      className="text-[9px] font-black bg-black text-white px-5 py-2 rounded-xl flex items-center gap-2 hover:bg-[#d11a2a] transition-all shadow-lg shadow-gray-100"
                    >
                      <Plus size={14} /> Add Requirement
                    </button>
                  </div>

                  <div className="space-y-3">
                    <AnimatePresence mode="popLayout">
                      {qualifications.map((qual, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="flex items-center gap-4 group bg-white p-3 border border-gray-100 rounded-2xl hover:border-[#d11a2a]/30 transition-all shadow-sm"
                        >
                          <span className="text-[10px] font-black text-[#d11a2a] w-8 h-8 flex items-center justify-center bg-red-50 rounded-xl shrink-0 italic shadow-inner">
                            {index + 1}
                          </span>
                          <input
                            value={qual}
                            onChange={(e) => updateQualification(index, e.target.value)}
                            placeholder="Enter requirement..."
                            className="flex-grow bg-transparent outline-none text-sm font-bold text-gray-700 placeholder:text-gray-200"
                          />
                          <button
                            type="button"
                            onClick={() => removeQualification(index)}
                            className="opacity-0 group-hover:opacity-100 p-2 text-gray-300 hover:text-red-500 transition-all scale-90 group-hover:scale-100"
                          >
                            <X size={16} />
                          </button>
                        </motion.div>
                      ))}
                    </AnimatePresence>

                    {qualifications.length === 0 && (
                      <div className="text-center py-10 border-2 border-dashed border-gray-100 rounded-[2rem]">
                        <p className="text-[10px] font-black text-gray-200 uppercase tracking-widest italic">
                          No qualifications defined
                        </p>
                      </div>
                    )}
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

export default function CareersManagerPage() {
  return (
    <PageWrapper>
      <CareersManagerContent />
    </PageWrapper>
  )
}
