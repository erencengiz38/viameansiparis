'use client'
import { useState, use } from 'react'
import { useTranslations } from 'next-intl'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { adminApi } from '@/lib/api'
import { getErrorMessage } from '@/lib/utils'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardBody, Modal, EmptyState, Spinner, Badge } from '@/components/ui/index'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Users, Store, Plus, UserCheck, UserX, LogIn, Layers, ShoppingCart, UserCog } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useAuthStore } from '@/store/auth'
import { useRouter } from 'next/navigation'

export default function AdminPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params)
  const t = useTranslations('admin')
  const tc = useTranslations('common')
  const qc = useQueryClient()
  const { impersonate } = useAuthStore()
  const router = useRouter()
  const [addOwnerOpen, setAddOwnerOpen] = useState(false)
  const [transferModal, setTransferModal] = useState<{ restaurantId: number; name: string } | null>(null)
  const [selectedOwnerId, setSelectedOwnerId] = useState<number | null>(null)

  const { data: owners = [], isLoading: ownersLoading } = useQuery({
    queryKey: ['admin-owners'],
    queryFn: adminApi.getOwners,
  })

  const { data: restaurants = [], isLoading: restaurantsLoading } = useQuery({
    queryKey: ['admin-restaurants'],
    queryFn: adminApi.getAllRestaurants,
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<{
    email: string; password: string; fullName: string
  }>()

  const createOwnerMutation = useMutation({
    mutationFn: adminApi.createOwner,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-owners'] })
      toast.success(tc('success'))
      setAddOwnerOpen(false)
      reset()
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const deactivateMutation = useMutation({
    mutationFn: adminApi.deactivateUser,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-owners'] }); toast.success(tc('success')) },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const activateMutation = useMutation({
    mutationFn: adminApi.activateUser,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-owners'] }); toast.success(tc('success')) },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const impersonateMutation = useMutation({
    mutationFn: adminApi.impersonate,
    onSuccess: (data) => {
      impersonate(data.accessToken, data.userId, data.fullName, data.role)
      router.push(`/${locale}/owner/restaurants`)
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const transferOwnerMutation = useMutation({
    mutationFn: ({ restaurantId, toOwnerId }: { restaurantId: number; toOwnerId: number }) =>
      adminApi.transferRestaurantOwner(restaurantId, toOwnerId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-restaurants'] })
      toast.success('Sahip atandı')
      setTransferModal(null)
      setSelectedOwnerId(null)
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const setPlanMutation = useMutation({
    mutationFn: ({ restaurantId, planType }: { restaurantId: number; planType: 'SIMPLE' | 'FULL' }) =>
      adminApi.setRestaurantPlan(restaurantId, planType),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-restaurants'] }); toast.success('Plan güncellendi') },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  return (
    <AppShell title={t('dashboard')} locale={locale}>
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardBody className="text-center py-5">
              <Store className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{restaurants.length}</p>
              <p className="text-xs text-gray-500">{t('totalRestaurants')}</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="text-center py-5">
              <Users className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{owners.length}</p>
              <p className="text-xs text-gray-500">{t('totalOwners')}</p>
            </CardBody>
          </Card>
        </div>

        {/* Owners */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900">Restoran Sahipleri</h3>
            <Button size="sm" onClick={() => setAddOwnerOpen(true)}>
              <Plus className="h-4 w-4" />
              {t('addOwner')}
            </Button>
          </div>

          {ownersLoading ? <Spinner /> : owners.length === 0 ? (
            <EmptyState
              icon={<Users className="h-10 w-10" />}
              title="Henüz sahip yok"
              action={<Button onClick={() => setAddOwnerOpen(true)}><Plus className="h-4 w-4" />{t('addOwner')}</Button>}
            />
          ) : (
            <div className="space-y-2">
              {owners.map(owner => (
                <Card key={owner.userId}>
                  <CardBody className="flex items-center gap-3 py-3">
                    <div className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center font-bold text-gray-600 flex-shrink-0">
                      {owner.fullName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{owner.fullName}</p>
                      <p className="text-xs text-gray-400 truncate">{owner.email}</p>
                    </div>
                    <Badge variant={owner.active ? 'success' : 'danger'}>
                      {owner.active ? tc('active') : tc('inactive')}
                    </Badge>
                    <button
                      onClick={() => impersonateMutation.mutate(owner.userId)}
                      disabled={!owner.active || impersonateMutation.isPending}
                      title="Hesabına gir"
                      className="p-2 rounded-lg hover:bg-blue-50 text-blue-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <LogIn className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => owner.active
                        ? deactivateMutation.mutate(owner.userId)
                        : activateMutation.mutate(owner.userId)
                      }
                      className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"
                    >
                      {owner.active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                    </button>
                  </CardBody>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Restaurants */}
        <div>
          <h3 className="font-bold text-gray-900 mb-3">Tüm Restoranlar</h3>
          {restaurantsLoading ? <Spinner /> : restaurants.length === 0 ? (
            <EmptyState icon={<Store className="h-10 w-10" />} title="Henüz restoran yok" />
          ) : (
            <div className="space-y-2">
              {restaurants.map(r => (
                <Card key={r.id}>
                  <CardBody className="flex items-center gap-3 py-3">
                    <div className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Store className="h-4 w-4 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{r.name}</p>
                      {r.address && <p className="text-xs text-gray-400 truncate">{r.address}</p>}
                    </div>
                    <Badge variant={r.active ? 'success' : 'gray'}>
                      {r.active ? tc('active') : tc('inactive')}
                    </Badge>
                    <button
                      onClick={() => { setSelectedOwnerId(null); setTransferModal({ restaurantId: r.id, name: r.name }) }}
                      title="Sahip Ata"
                      className="p-2 rounded-lg hover:bg-amber-50 text-amber-500 transition-colors"
                    >
                      <UserCog className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setPlanMutation.mutate({
                        restaurantId: r.id,
                        planType: r.planType === 'SIMPLE' ? 'FULL' : 'SIMPLE',
                      })}
                      disabled={setPlanMutation.isPending}
                      title={r.planType === 'SIMPLE' ? 'Şu an: Basit Usul — Gerçek Usule geç' : 'Şu an: Gerçek Usul — Basit Usule geç'}
                      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                        r.planType === 'SIMPLE'
                          ? 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                          : 'bg-purple-50 text-purple-600 hover:bg-purple-100'
                      }`}
                    >
                      {r.planType === 'SIMPLE'
                        ? <><Layers className="h-3 w-3" /> Basit</>
                        : <><ShoppingCart className="h-3 w-3" /> Gerçek</>
                      }
                    </button>
                  </CardBody>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sahip Ata Modal */}
      <Modal
        open={!!transferModal}
        onClose={() => { setTransferModal(null); setSelectedOwnerId(null) }}
        title="Sahip Ata"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            <span className="font-semibold text-gray-700">{transferModal?.name}</span> restoranına sahip atayın.
          </p>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {owners.filter(o => o.active).map(owner => (
              <label
                key={owner.userId}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                  selectedOwnerId === owner.userId
                    ? 'border-gray-900 bg-gray-50'
                    : 'border-gray-100 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="owner"
                  value={owner.userId}
                  checked={selectedOwnerId === owner.userId}
                  onChange={() => setSelectedOwnerId(owner.userId)}
                  className="accent-gray-900"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{owner.fullName}</p>
                  <p className="text-xs text-gray-400 truncate">{owner.email}</p>
                </div>
              </label>
            ))}
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" fullWidth type="button" onClick={() => { setTransferModal(null); setSelectedOwnerId(null) }}>
              İptal
            </Button>
            <Button
              fullWidth
              type="button"
              loading={transferOwnerMutation.isPending}
              disabled={!selectedOwnerId || transferOwnerMutation.isPending}
              onClick={() => {
                if (transferModal && selectedOwnerId)
                  transferOwnerMutation.mutate({ restaurantId: transferModal.restaurantId, toOwnerId: selectedOwnerId })
              }}
            >
              Sahip Ata
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={addOwnerOpen} onClose={() => { setAddOwnerOpen(false); reset() }} title={t('addOwner')}>
        <form onSubmit={handleSubmit((d) => createOwnerMutation.mutate(d))} className="space-y-4">
          <Input label={t('ownerName')} required placeholder="Ad Soyad"
            error={errors.fullName?.message}
            {...register('fullName', { required: true })} />
          <Input label={t('ownerEmail')} required type="email" placeholder="ornek@email.com"
            error={errors.email?.message}
            {...register('email', { required: true })} />
          <Input label={t('ownerPassword')} required type="password" placeholder="Min. 8 karakter"
            error={errors.password?.message}
            {...register('password', { required: true, minLength: 8 })} />
          <div className="flex gap-3 pt-2">
            <Button variant="outline" fullWidth type="button" onClick={() => { setAddOwnerOpen(false); reset() }}>
              {tc('cancel')}
            </Button>
            <Button fullWidth type="submit" loading={createOwnerMutation.isPending}>
              {tc('save')}
            </Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  )
}
