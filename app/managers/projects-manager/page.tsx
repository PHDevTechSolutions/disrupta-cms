"use client"
import { useState, useEffect, Suspense } from "react"
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
import { Plus, Pencil, Trash2, Loader2, ImagePlus, X, Save } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { uploadToCloudinary } from "@/lib/cloudinary"
import { PageWrapper } from "@/components/sidebar/page-wrapper"

const ProjectsManagerContent = () => {
  const [projects, setProjects] = useState<any[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Form States
  const [projectTitle, setProjectTitle] = useState("")
  const [projectDetails, setProjectDetails] = useState("")
  const [website, setWebsite] = useState("Disruptive")
  const [mainImage, setMainImage] = useState<File | null>(null)
  const [mainImagePrev, setMainImagePrev] = useState<string | null>(null)
  const [logoImage, setLogoImage] = useState<File | null>(null)
  const [logoImagePrev, setLogoImagePrev] = useState<string | null>(null)
  const [status, setStatus] = useState("Published")

  useEffect(() => {
    const q = query(collection(db, "projects"), orderBy("createdAt", "desc"))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setProjects(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })))
    })
    return () => unsubscribe()
  }, [])

  const resetForm = () => {
    setProjectTitle("")
    setProjectDetails("")
    setWebsite("Disruptive")
    setMainImage(null)
    setMainImagePrev(null)
    setLogoImage(null)
    setLogoImagePrev(null)
    setStatus("Published")
    setEditingId(null)
  }

  const handleSubmit = async () => {
    if (!projectTitle.trim()) {
      alert("Please enter a project title")
      return
    }

    setLoading(true)

    try {
      let mainImageUrl = mainImagePrev
      let logoImageUrl = logoImagePrev

      if (mainImage) {
        mainImageUrl = await uploadToCloudinary(mainImage)
      }

      if (logoImage) {
        logoImageUrl = await uploadToCloudinary(logoImage)
      }

      const projectData = {
        title: projectTitle,
        details: projectDetails,
        website,
        mainImage: mainImageUrl,
        logo: logoImageUrl,
        status,
        updatedAt: serverTimestamp(),
      }

      if (editingId) {
        await updateDoc(doc(db, "projects", editingId), projectData)
      } else {
        await addDoc(collection(db, "projects"), {
          ...projectData,
          createdAt: serverTimestamp(),
        })
      }

      resetForm()
      setIsModalOpen(false)
    } catch (error) {
      console.error("Error saving project:", error)
      alert("Error saving project")
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (project: any) => {
    setEditingId(project.id)
    setProjectTitle(project.title)
    setProjectDetails(project.details)
    setWebsite(project.website)
    setMainImagePrev(project.mainImage)
    setLogoImagePrev(project.logo)
    setStatus(project.status)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this project?")) {
      try {
        await deleteDoc(doc(db, "projects", id))
      } catch (error) {
        console.error("Error deleting project:", error)
      }
    }
  }

  return (
    <div className="space-y-8">
      {/* HEADER & ADD BUTTON */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-4xl font-black uppercase italic tracking-tighter">Projects</h2>
          <p className="text-gray-500 text-sm mt-2">Manage all your project portfolios</p>
        </div>
        <button
          onClick={() => {
            resetForm()
            setIsModalOpen(true)
          }}
          className="flex items-center gap-3 bg-[#d11a2a] text-white px-8 py-4 rounded-full font-black uppercase text-xs tracking-[0.2em] hover:bg-black transition-all shadow-lg"
        >
          <Plus size={20} /> Add Project
        </button>
      </div>

      {/* PROJECTS GRID */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {projects.map((project) => (
          <motion.div
            key={project.id}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-3xl border-2 border-gray-100 overflow-hidden hover:border-[#d11a2a] transition-all group hover:shadow-xl"
          >
            {/* Project Image */}
            <div className="relative aspect-video bg-gray-100 overflow-hidden">
              {project.mainImage ? (
                <img
                  src={project.mainImage || "/placeholder.svg"}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                  <ImagePlus className="text-gray-300" size={40} />
                </div>
              )}
            </div>

            {/* Project Content */}
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                {project.logo && (
                  <img
                    src={project.logo || "/placeholder.svg"}
                    alt="logo"
                    className="w-12 h-12 rounded-lg object-cover border border-gray-200"
                  />
                )}
                <div className="flex-1">
                  <h3 className="font-black text-lg uppercase italic tracking-tight line-clamp-2">{project.title}</h3>
                  <p className="text-xs text-gray-400 uppercase font-bold mt-1">{project.website}</p>
                </div>
              </div>

              <p className="text-sm text-gray-600 line-clamp-2">{project.details}</p>

              <div className="flex items-center gap-2 text-xs">
                <span
                  className={`px-3 py-1 rounded-full font-bold uppercase ${
                    project.status === "Published" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {project.status}
                </span>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-3 border-t border-gray-100">
                <button
                  onClick={() => handleEdit(project)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-50 hover:bg-[#d11a2a] text-gray-600 hover:text-white rounded-lg transition-all font-bold text-xs uppercase"
                >
                  <Pencil size={14} /> Edit
                </button>
                <button
                  onClick={() => handleDelete(project.id)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-50 hover:bg-red-100 text-gray-600 hover:text-red-600 rounded-lg transition-all font-bold text-xs uppercase"
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>
          </motion.div>
        ))}
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
                    <Plus size={24} />
                  </div>
                  <h3 className="font-black uppercase italic tracking-tighter text-2xl">
                    {editingId ? "Edit Project" : "New Project"}
                  </h3>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black"
                >
                  <X size={24} />
                </button>
              </div>

              {/* MODAL FORM CONTENT */}
              <div className="p-12 space-y-12 pb-32">
                {/* Title Input */}
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">
                    Project Title
                  </label>
                  <input
                    value={projectTitle}
                    onChange={(e) => setProjectTitle(e.target.value)}
                    placeholder="e.g. E-Commerce Platform Redesign"
                    className="w-full text-4xl font-black uppercase italic outline-none border-b-4 border-gray-50 focus:border-[#d11a2a] transition-all placeholder:text-gray-100 pb-2"
                  />
                </div>

                {/* Website Selector */}
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">
                    Website / Brand
                  </label>
                  <select
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    className="w-full font-black text-lg uppercase outline-none bg-gray-50 p-4 rounded-2xl border-2 border-gray-100 focus:border-[#d11a2a] cursor-pointer transition-all"
                  >
                    <option>Disruptive Solutions Inc</option>
                    <option>Ecoshift Corp</option>
                    <option>VAH</option>
                  </select>
                </div>

                {/* Main Project Image */}
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">
                    Project Image
                  </label>
                  <div className="relative aspect-video bg-white rounded-3xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden hover:border-[#d11a2a] transition-all group/img">
                    {mainImagePrev ? (
                      <img src={mainImagePrev || "/placeholder.svg"} className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center space-y-2 text-gray-300 group-hover/img:text-[#d11a2a]">
                        <ImagePlus className="mx-auto" size={40} />
                        <span className="text-[9px] font-black uppercase tracking-widest block">
                          Upload Project Image
                        </span>
                      </div>
                    )}
                    <input
                      type="file"
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          setMainImage(e.target.files[0])
                          setMainImagePrev(URL.createObjectURL(e.target.files[0]))
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Logo Image */}
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">Logo</label>
                  <div className="relative aspect-square bg-white rounded-3xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden hover:border-[#d11a2a] transition-all group/img w-32">
                    {logoImagePrev ? (
                      <img src={logoImagePrev || "/placeholder.svg"} className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center space-y-1 text-gray-300 group-hover/img:text-[#d11a2a]">
                        <ImagePlus className="mx-auto" size={24} />
                        <span className="text-[8px] font-black uppercase tracking-widest block">Logo</span>
                      </div>
                    )}
                    <input
                      type="file"
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          setLogoImage(e.target.files[0])
                          setLogoImagePrev(URL.createObjectURL(e.target.files[0]))
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Project Details */}
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">
                    Project Details
                  </label>
                  <textarea
                    value={projectDetails}
                    onChange={(e) => setProjectDetails(e.target.value)}
                    placeholder="Write detailed information about the project, deliverables, technologies used..."
                    className="w-full outline-none border-2 border-gray-100 focus:border-[#d11a2a] text-gray-600 text-lg leading-relaxed p-6 rounded-2xl resize-none h-40 transition-all"
                  />
                </div>

                {/* Status */}
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full font-black text-lg uppercase outline-none bg-gray-50 p-4 rounded-2xl border-2 border-gray-100 focus:border-[#d11a2a] cursor-pointer transition-all"
                  >
                    <option>Published</option>
                    <option>Draft</option>
                    <option>Archived</option>
                  </select>
                </div>

                {/* Submit Button */}
                <div className="flex gap-4 pt-8">
                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex-1 bg-black text-white px-10 py-4 rounded-full font-black uppercase text-[10px] tracking-[0.2em] hover:bg-[#d11a2a] flex items-center justify-center gap-3 shadow-xl shadow-gray-200 transition-all disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 className="animate-spin" size={16} />
                    ) : (
                      <>
                        <Save size={16} /> Save Project
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="px-8 py-4 rounded-full font-black uppercase text-[10px] tracking-[0.2em] border-2 border-gray-100 hover:border-[#d11a2a] text-gray-600 hover:text-[#d11a2a] transition-all"
                  >
                    Cancel
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

export default function ProjectsManagePage() {
  return (
      <PageWrapper>
        <Suspense fallback={null}>
          <ProjectsManagerContent />
        </Suspense>
      </PageWrapper>
    )
}
