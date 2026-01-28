import { PageWrapper } from "@/components/sidebar/page-wrapper"
import { Skeleton } from "@/components/ui/skeleton"

export default function ReelsManagerLoading() {
  return (
    <PageWrapper>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-10 w-40 mb-2" />
            <Skeleton className="h-4 w-60" />
          </div>
          <Skeleton className="h-12 w-32 rounded-full" />
        </div>

        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </PageWrapper>
  )
}
