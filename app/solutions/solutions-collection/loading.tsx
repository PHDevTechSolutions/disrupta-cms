import { PageWrapper } from "@/components/sidebar/page-wrapper"
import { Skeleton } from "@/components/ui/skeleton"

export default function SolutionsCollectionLoading() {
  return (
    <PageWrapper>
      <div className="space-y-8">
        {/* HEADER SKELETON */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <Skeleton className="h-12 w-96 mb-3" />
            <Skeleton className="h-4 w-56" />
          </div>
          <Skeleton className="h-14 w-48" />
        </div>

        {/* TABLE SKELETON */}
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-8">
            {/* Header row */}
            <div className="flex gap-8 mb-8 pb-6 border-b border-gray-100">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16 ml-auto" />
            </div>

            {/* Data rows */}
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex gap-8 py-6 border-b border-gray-50">
                <Skeleton className="h-12 w-16 rounded-xl" />
                <div className="flex-grow">
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-10 w-24" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
