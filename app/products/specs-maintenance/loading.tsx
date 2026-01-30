import { Skeleton } from "@/components/ui/skeleton";

export default function SpecsManagerLoading() {
  return (
    <div className="p-4 space-y-8 max-w-7xl mx-auto">
      {/* Header Skeleton */}
      <div className="flex items-center gap-4 border-b border-gray-100 pb-6">
        <Skeleton className="h-12 w-12 rounded-2xl" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Form Skeleton */}
        <div className="lg:col-span-4">
          <div className="bg-white p-6 rounded-[32px] border border-gray-100 space-y-5">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-12 w-full rounded-2xl" />
            <Skeleton className="h-12 w-full rounded-2xl" />
            <Skeleton className="h-14 w-full rounded-2xl" />
          </div>
        </div>

        {/* Table Skeleton */}
        <div className="lg:col-span-8">
          <div className="bg-white rounded-[32px] border border-gray-100">
            <div className="space-y-4 p-6">
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
