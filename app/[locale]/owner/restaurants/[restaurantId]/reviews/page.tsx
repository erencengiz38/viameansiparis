'use client'
import { use } from 'react'
import { useQuery } from '@tanstack/react-query'
import { reviewApi } from '@/lib/api'
import { Spinner } from '@/components/ui/index'
import { Star, MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { timeAgo } from '@/lib/utils'

export default function ReviewsPage({
  params,
}: {
  params: Promise<{ locale: string; restaurantId: string }>
}) {
  const { restaurantId } = use(params)
  const id = Number(restaurantId)

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['reviews', id],
    queryFn: () => reviewApi.getRestaurantReviews(id),
  })

  if (isLoading) return <div className="flex justify-center py-16"><Spinner /></div>

  if (reviews.length === 0) return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
      <MessageCircle className="h-10 w-10 mx-auto mb-2 opacity-30" />
      <p className="text-sm">Henüz yorum yok</p>
    </div>
  )

  const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length

  return (
    <div className="space-y-4 pb-8">
      {/* Summary */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4">
        <div className="text-center">
          <p className="text-4xl font-black text-gray-900">{avg.toFixed(1)}</p>
          <div className="flex gap-0.5 mt-1 justify-center">
            {[1, 2, 3, 4, 5].map(s => (
              <Star key={s} className={cn('h-3.5 w-3.5', s <= Math.round(avg) ? 'fill-amber-400 text-amber-400' : 'text-gray-200')} />
            ))}
          </div>
        </div>
        <div className="flex-1">
          {[5, 4, 3, 2, 1].map(star => {
            const count = reviews.filter(r => r.rating === star).length
            const pct = Math.round((count / reviews.length) * 100)
            return (
              <div key={star} className="flex items-center gap-2 mb-1">
                <span className="text-xs text-gray-400 w-4 text-right">{star}</span>
                <Star className="h-3 w-3 text-amber-300 fill-amber-300 flex-shrink-0" />
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs text-gray-400 w-5">{count}</span>
              </div>
            )
          })}
        </div>
        <div className="text-center">
          <p className="text-2xl font-black text-gray-900">{reviews.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">yorum</p>
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {reviews.map(review => (
          <div key={review.id} className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map(s => (
                  <Star key={s} className={cn('h-4 w-4', s <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200')} />
                ))}
              </div>
              <span className="text-xs text-gray-400">{timeAgo(review.createdAt)}</span>
            </div>
            {review.comment ? (
              <p className="text-sm text-gray-700 leading-relaxed">{review.comment}</p>
            ) : (
              <p className="text-xs text-gray-300 italic">Yorum yazılmamış</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
