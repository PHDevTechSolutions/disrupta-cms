"use client";

import * as React from "react";
import { useEffect, useState, useMemo } from "react";
import {
  Pencil,
  Trash2,
  Loader2,
  Search,
  PlusCircle,
  Package,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// UI Components
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ExpandableScreen,
  ExpandableScreenContent,
  ExpandableScreenTrigger,
} from "@/components/ui/expandable-screen";

// Firebase
import { db } from "@/lib/firebase";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  deleteDoc,
} from "firebase/firestore";
import { toast } from "sonner";

// Components
import AddProductForm from "@/components/products/add-product-form";
import { PageWrapper } from "@/components/sidebar/page-wrapper";

export default function AllProducts() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [brandFilter, setBrandFilter] = useState("All Brands");
  const [websiteFilter, setWebsiteFilter] = useState("All Websites");

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modal States
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // --- 1. FETCH DATA ---
  useEffect(() => {
    const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const productList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setProducts(productList);
        setLoading(false);
      },
      (error) => {
        console.error("Fetch error:", error);
        toast.error("Failed to load products");
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // --- 2. FILTER LOGIC ---
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesBrand =
        brandFilter === "All Brands" || p.brand === brandFilter;
      const matchesWeb =
        websiteFilter === "All Websites" || p.website === websiteFilter;
      const matchesSearch =
        p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesBrand && matchesWeb && matchesSearch;
    });
  }, [products, brandFilter, websiteFilter, searchQuery]);

  // --- 3. PAGINATION LOGIC ---
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, brandFilter, websiteFilter]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredProducts, currentPage]);

  const uniqueBrands = useMemo(() => {
    const brandsSet = new Set<string>();
    products.forEach((p: any) => {
      if (p.brand) brandsSet.add(p.brand);
    });
    return Array.from(brandsSet).sort();
  }, [products]);

  const uniqueWebsites = useMemo(() => {
    const websSet = new Set<string>();
    products.forEach((p: any) => {
      if (p.website) websSet.add(p.website);
    });
    return Array.from(websSet).sort();
  }, [products]);

  // --- 4. ACTIONS ---
  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await deleteDoc(doc(db, "products", id));
      toast.success("Product deleted successfully");
    } catch (error) {
      toast.error("Failed to delete product");
    }
  };

  const handleEditClick = (product: any) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleAddNewClick = () => {
    setSelectedProduct(null);
    setIsModalOpen(true);
  };

  const handleFormFinished = () => {
    setSelectedProduct(null);
    setIsModalOpen(false);
  };

  return (
    <PageWrapper>
      <ExpandableScreen>
        <div className="w-full space-y-4 p-2 animate-in fade-in duration-500">
          {/* HEADER */}
          <div className="flex justify-between items-end mb-6">
            <div>
              <h2 className="text-3xl font-black uppercase italic tracking-tighter text-gray-900 flex items-center gap-2">
                <Package className="text-blue-600" size={28} /> Inventory
              </h2>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Manage and update your products
              </p>
            </div>
            <ExpandableScreenTrigger>
              <Button
                onClick={handleAddNewClick}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl px-6 font-black uppercase text-[10px] tracking-widest h-12 shadow-lg shadow-blue-100 transition-all active:scale-95"
              >
                <PlusCircle className="mr-2 w-4 h-4" /> Add Product
              </Button>
            </ExpandableScreenTrigger>
          </div>

          {/* FILTERS */}
          <div className="flex flex-wrap gap-3 items-center bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <div className="relative flex-1 max-w-sm">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={16}
              />
              <Input
                placeholder="Search name or SKU..."
                className="pl-10 rounded-xl border-gray-100 bg-gray-50/50"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <select
              className="border rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider bg-gray-50/50 border-gray-100 outline-none cursor-pointer"
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
            >
              <option>All Brands</option>
              {uniqueBrands.map((brand) => (
                <option key={brand} value={brand}>
                  {brand}
                </option>
              ))}
            </select>

            <select
              className="border rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider bg-gray-50/50 border-gray-100 outline-none cursor-pointer"
              value={websiteFilter}
              onChange={(e) => setWebsiteFilter(e.target.value)}
            >
              <option>All Websites</option>
              {uniqueWebsites.map((web: string) => (
                <option key={web} value={web}>
                  {web}
                </option>
              ))}
            </select>
          </div>

          {/* TABLE */}
          <div className="rounded-3xl border border-gray-100 bg-white shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-gray-50/50">
                <TableRow className="hover:bg-transparent border-none">
                  <TableHead className="w-[80px] pl-6 py-4">Image</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">
                    Product Info
                  </TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">
                    SKU
                  </TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">
                    Brand / Web
                  </TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-right pr-6">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-60 text-center">
                      <Loader2
                        className="animate-spin mx-auto text-blue-500"
                        size={32}
                      />
                    </TableCell>
                  </TableRow>
                ) : paginatedProducts.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="h-60 text-center text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]"
                    >
                      No products found
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedProducts.map((product) => (
                    <TableRow
                      key={product.id}
                      className="group hover:bg-blue-50/30 transition-all cursor-pointer border-b border-gray-50"
                      onClick={() => handleEditClick(product)}
                    >
                      {/* MAIN IMAGE */}
                      <TableCell className="pl-6 py-4">
                        <div className="w-14 h-14 bg-white rounded-2xl p-1 border border-gray-100 shadow-sm overflow-hidden group-hover:scale-105 transition-transform">
                          <img
                            src={product.mainImage || "/placeholder.svg"}
                            alt={product.name}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      </TableCell>

                      {/* PRODUCT INFO */}
                      <TableCell>
                        <div className="flex flex-col max-w-[250px]">
                          <span className="font-black text-sm text-gray-900 line-clamp-1">
                            {product.name}
                          </span>
                          <span className="text-[9px] text-blue-600 font-black uppercase tracking-tighter">
                            {product.category || "No Category"}
                          </span>
                        </div>
                      </TableCell>

                      {/* SKU */}
                      <TableCell className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">
                        {product.sku || "---"}
                      </TableCell>

                      {/* BRAND / WEBSITE */}
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="w-fit text-[8px] font-black bg-slate-100 px-2 py-0.5 rounded text-slate-500 uppercase">
                            {product.brand || "Generic"}
                          </span>
                          <span className="w-fit text-[8px] font-black bg-blue-50 px-2 py-0.5 rounded text-blue-500 uppercase">
                            {product.website || "N/A"}
                          </span>
                        </div>
                      </TableCell>

                      {/* ACTIONS */}
                      <TableCell className="text-right pr-6">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-blue-500 hover:bg-blue-100 rounded-lg"
                          >
                            <Pencil size={14} />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Trash2 size={14} />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="rounded-[40px] border-none shadow-2xl">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-2xl font-black uppercase italic tracking-tighter">
                                  Delete Product?
                                </AlertDialogTitle>
                                <AlertDialogDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                  You are about to delete{" "}
                                  <span className="text-red-500">
                                    {product.name}
                                  </span>
                                  . This action is permanent.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter className="gap-2 pt-4">
                                <AlertDialogCancel className="rounded-2xl border-none bg-slate-100 font-black text-[10px] uppercase tracking-widest h-12 px-6">
                                  Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={(e) => handleDelete(e, product.id)}
                                  className="rounded-2xl bg-red-600 hover:bg-red-700 font-black text-[10px] uppercase tracking-widest h-12 px-6 shadow-lg shadow-red-200"
                                >
                                  Confirm Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* PAGINATION */}
          {!loading && totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-8 mb-4">
              <Button
                variant="ghost"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => prev - 1)}
                className="rounded-xl h-9 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600"
              >
                <ChevronLeft size={16} className="mr-1" /> Prev
              </Button>

              <div className="flex gap-1.5">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (pageNum) => (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`h-9 w-9 rounded-xl text-[11px] font-black transition-all transform active:scale-90 ${
                        currentPage === pageNum
                          ? "bg-blue-600 text-white shadow-xl shadow-blue-200 scale-110"
                          : "bg-white text-blue-400 border border-slate-100 hover:border-blue-200 hover:bg-blue-50"
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                )}
              </div>

              <Button
                variant="ghost"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((prev) => prev + 1)}
                className="rounded-xl h-9 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600"
              >
                Next <ChevronRight size={16} className="ml-1" />
              </Button>
            </div>
          )}
        </div>

        {/* EXPANDABLE MODAL - ADD/EDIT PRODUCT */}
        <ExpandableScreenContent
          className="bg-slate-50"
          showCloseButton={true}
          closeButtonClassName="text-slate-400 hover:bg-slate-200"
        >
          <div className="max-w-full p-6 sm:p-10">
            <div className="mb-6">
              <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900">
                {selectedProduct
                  ? `Editing: ${selectedProduct?.name}`
                  : "Add New Product"}
              </h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                {selectedProduct
                  ? "Update product information"
                  : "Create a new product"}
              </p>
            </div>
            <AddProductForm
              editData={selectedProduct}
              onFinished={handleFormFinished}
            />
          </div>
        </ExpandableScreenContent>
      </ExpandableScreen>
    </PageWrapper>
  );
}