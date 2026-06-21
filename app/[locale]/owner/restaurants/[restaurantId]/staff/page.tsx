'use client'
import { useState, use } from 'react'
import { useTranslations } from 'next-intl'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ownerApi } from '@/lib/api'
import { getErrorMessage } from '@/lib/utils'
import { Card, CardBody, Modal, EmptyState, Spinner, Badge } from '@/components/ui/index'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Plus, Users, Trash2, ChefHat, Coffee, CreditCard } from 'lucide-react'
import { useForm } from 'react-hook-form'

interface StaffForm {
  email: string
  password: string
  fullName: string
  role: 'CHEF' | 'WAITER' | 'CASHIER'
}

export default function StaffPage({ params }: { params: Promise<{ restaurantId: string; locale: string }> }) {
  const { restaurantId, locale } = use(params)
  const t = useTranslations('staff')
  const tc = useTranslations('common')
  const qc = useQueryClient()
  const rId = Number(restaurantId)
  const [addOpen, setAddOpen] = useState(false)

  const { data: staff = [], isLoading } = useQuery({
    queryKey: ['staff', rId],
    queryFn: () => ownerApi.getStaff(rId),
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<StaffForm>({
    defaultValues: { role: 'WAITER' }
  })

  const addMutation = useMutation({
    mutationFn: (d: StaffForm) => ownerApi.createStaff(rId, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff', rId] })
      toast.success(tc('success'))
      setAddOpen(false)
      reset()
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const removeMutation = useMutation({
    mutationFn: (userId: number) => ownerApi.removeStaff(rId, userId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['staff', rId] }); toast.success(tc('success')) },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  if (isLoading) return <Spinner />

  const chefs = staff.filter(s => s.role === 'CHEF')
  const waiters = staff.filter(s => s.role === 'WAITER')
  const cashiers = staff.filter(s => s.role === 'CASHIER')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gray-900">Personel</h3>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" />
          {t('addStaff')}
        </Button>
      </div>

      {staff.length === 0 ? (
        <EmptyState
          icon={<Users className="h-12 w-12" />}
          title={t('noStaff')}
          action={<Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" />{t('addStaff')}</Button>}
        />
      ) : (
        <div className="space-y-5">
          {chefs.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <ChefHat className="h-3.5 w-3.5" /> Aşçılar
              </p>
              <div className="space-y-2">
                {chefs.map(s => (
                  <StaffCard key={s.userId} staff={s} onRemove={() => {
                    if (confirm(t('removeConfirm'))) removeMutation.mutate(s.userId)
                  }} t={t} />
                ))}
              </div>
            </div>
          )}
          {waiters.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Coffee className="h-3.5 w-3.5" /> Garsonlar
              </p>
              <div className="space-y-2">
                {waiters.map(s => (
                  <StaffCard key={s.userId} staff={s} onRemove={() => {
                    if (confirm(t('removeConfirm'))) removeMutation.mutate(s.userId)
                  }} t={t} />
                ))}
              </div>
            </div>
          )}
          {cashiers.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5" /> Kasiyerler
              </p>
              <div className="space-y-2">
                {cashiers.map(s => (
                  <StaffCard key={s.userId} staff={s} onRemove={() => {
                    if (confirm(t('removeConfirm'))) removeMutation.mutate(s.userId)
                  }} t={t} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <Modal open={addOpen} onClose={() => { setAddOpen(false); reset() }} title={t('addStaff')}>
        <form onSubmit={handleSubmit((d) => addMutation.mutate(d))} className="space-y-4">
          <Input
            label={t('fullName')} required placeholder="Ad Soyad"
            error={errors.fullName?.message}
            {...register('fullName', { required: true })}
          />
          <Input
            label={t('email')} required type="email" placeholder="ornek@email.com"
            error={errors.email?.message}
            {...register('email', { required: true })}
          />
          <Input
            label={t('password')} required type="password" placeholder="Min. 8 karakter"
            error={errors.password?.message}
            {...register('password', { required: true, minLength: 8 })}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">{t('role')}</label>
            <select
              className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              {...register('role')}
            >
              <option value="WAITER">{t('waiter')}</option>
              <option value="CHEF">{t('chef')}</option>
              <option value="CASHIER">Kasiyer</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" fullWidth type="button" onClick={() => { setAddOpen(false); reset() }}>
              {tc('cancel')}
            </Button>
            <Button fullWidth type="submit" loading={addMutation.isPending}>
              {tc('save')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

function StaffCard({ staff, onRemove, t }: { staff: { userId: number; email: string; fullName: string; role: string; active: boolean }; onRemove: () => void; t: ReturnType<typeof useTranslations> }) {
  return (
    <Card>
      <CardBody className="flex items-center gap-3 py-3">
        <div className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold text-gray-600">
          {staff.fullName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{staff.fullName}</p>
          <p className="text-xs text-gray-400 truncate">{staff.email}</p>
        </div>
        {!staff.active && <Badge variant="danger">Pasif</Badge>}
        <button onClick={onRemove} className="p-2 rounded-lg hover:bg-red-50 text-red-400 flex-shrink-0">
          <Trash2 className="h-4 w-4" />
        </button>
      </CardBody>
    </Card>
  )
}
