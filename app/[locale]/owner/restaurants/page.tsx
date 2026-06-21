'use client'
import { useState, use } from 'react'
import { useTranslations } from 'next-intl'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { ownerApi } from '@/lib/api'
import { getErrorMessage } from '@/lib/utils'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardBody, Modal, EmptyState, Spinner } from '@/components/ui/index'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Plus, Store, ChevronRight, MapPin, Phone } from 'lucide-react'
import { useForm } from 'react-hook-form'

interface RestaurantForm {
  name: string
  address?: string
  phone?: string
}

export default function RestaurantsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params)
  const t = useTranslations('restaurant')
  const tc = useTranslations('common')
  const router = useRouter()
  const qc = useQueryClient()
  const [addOpen, setAddOpen] = useState(false)

  const { data: restaurants = [], isLoading } = useQuery({
    queryKey: ['owner-restaurants'],
    queryFn: ownerApi.getRestaurants,
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<RestaurantForm>()

  const createMutation = useMutation({
    mutationFn: (data: RestaurantForm) => ownerApi.createRestaurant(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner-restaurants'] })
      toast.success(tc('success'))
      setAddOpen(false)
      reset()
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  if (isLoading) return (
    <AppShell title={t('addRestaurant')} locale={locale}>
      <Spinner />
    </AppShell>
  )

  return (
    <AppShell title="Restoranlarım" locale={locale}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Restoranlarım</h2>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />
            {t('addRestaurant')}
          </Button>
        </div>

        {restaurants.length === 0 ? (
          <EmptyState
            icon={<Store className="h-12 w-12" />}
            title={t('noRestaurants')}
            action={
              <Button onClick={() => setAddOpen(true)}>
                <Plus className="h-4 w-4" />
                {t('addRestaurant')}
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            {restaurants.map((r) => (
              <Card
                key={r.id}
                className="cursor-pointer active:scale-[0.98] transition-transform"
                onClick={() => router.push(`/${locale}/owner/restaurants/${r.id}/menu`)}
              >
                <CardBody className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Store className="h-5 w-5 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{r.name}</p>
                    {r.address && (
                      <p className="text-xs text-gray-500 truncate flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3" />{r.address}
                      </p>
                    )}
                    {r.phone && (
                      <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                        <Phone className="h-3 w-3" />{r.phone}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-300 flex-shrink-0" />
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Modal open={addOpen} onClose={() => { setAddOpen(false); reset() }} title={t('addRestaurant')}>
        <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
          <Input
            label={t('name')} required
            placeholder={t('namePlaceholder')}
            error={errors.name?.message}
            {...register('name', { required: 'Restoran adı zorunlu' })}
          />
          <Input
            label={t('address')}
            placeholder={t('addressPlaceholder')}
            {...register('address')}
          />
          <Input
            label={t('phone')}
            placeholder={t('phonePlaceholder')}
            type="tel"
            {...register('phone')}
          />
          <div className="flex gap-3 pt-2">
            <Button variant="outline" fullWidth type="button" onClick={() => { setAddOpen(false); reset() }}>
              {tc('cancel')}
            </Button>
            <Button fullWidth type="submit" loading={createMutation.isPending}>
              {tc('save')}
            </Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  )
}
