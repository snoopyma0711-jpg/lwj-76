import type { OrderStatus, TransferStatus, TransferType } from '../types'

export const transferTypeMap: Record<TransferType, { label: string; color: string; bgColor: string }> = {
  replenish: { label: '补货申请', color: 'text-blue-700', bgColor: 'bg-blue-50 border-blue-200' },
  transfer: { label: '门店调拨', color: 'text-purple-700', bgColor: 'bg-purple-50 border-purple-200' },
}

export const transferStatusMap: Record<TransferStatus, { label: string; color: string; bgColor: string }> = {
  pending: { label: '待处理', color: 'text-amber-700', bgColor: 'bg-amber-50 border-amber-200' },
  approved: { label: '待出库', color: 'text-blue-700', bgColor: 'bg-blue-50 border-blue-200' },
  outbound: { label: '已出库', color: 'text-cyan-700', bgColor: 'bg-cyan-50 border-cyan-200' },
  in_transit: { label: '运输中', color: 'text-indigo-700', bgColor: 'bg-indigo-50 border-indigo-200' },
  inbound: { label: '待入库', color: 'text-orange-700', bgColor: 'bg-orange-50 border-orange-200' },
  completed: { label: '已完成', color: 'text-green-700', bgColor: 'bg-green-50 border-green-200' },
  rejected: { label: '已拒绝', color: 'text-red-700', bgColor: 'bg-red-50 border-red-200' },
}

export const orderStatusMap: Record<OrderStatus, { label: string; color: string; bgColor: string }> = {
  pending: { label: '待确认', color: 'text-amber-700', bgColor: 'bg-amber-50 border-amber-200' },
  confirmed: { label: '已确认', color: 'text-blue-700', bgColor: 'bg-blue-50 border-blue-200' },
  ready: { label: '待取货', color: 'text-cyan-700', bgColor: 'bg-cyan-50 border-cyan-200' },
  picked_up: { label: '已完成', color: 'text-green-700', bgColor: 'bg-green-50 border-green-200' },
  delayed: { label: '已延期', color: 'text-purple-700', bgColor: 'bg-purple-50 border-purple-200' },
  failed: { label: '自提失败', color: 'text-red-700', bgColor: 'bg-red-50 border-red-200' },
  cancelled: { label: '已取消', color: 'text-gray-700', bgColor: 'bg-gray-50 border-gray-200' },
  partial: { label: '部分完成', color: 'text-orange-700', bgColor: 'bg-orange-50 border-orange-200' },
}

export const contactTypeMap: Record<'phone' | 'sms' | 'wechat' | 'onsite', string> = {
  phone: '电话',
  sms: '短信',
  wechat: '微信',
  onsite: '到店',
}

export const stockChangeTypeMap: Record<'in' | 'out' | 'adjust', { label: string; color: string }> = {
  in: { label: '入库', color: 'text-green-600' },
  out: { label: '出库', color: 'text-red-600' },
  adjust: { label: '调整', color: 'text-blue-600' },
}

export function formatMoney(n: number): string {
  return '¥' + n.toFixed(2)
}

export function isValidPhone(s: string): boolean {
  return /^1[3-9]\d{9}$/.test(s.trim())
}

export function isValidOrderNo(s: string): boolean {
  return s.trim().length >= 6
}

export function maskPhone(s: string): string {
  if (s.length !== 11) return s
  return s.slice(0, 3) + '****' + s.slice(7)
}

export function getDateString(offset = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function getDateStringShort(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function getTimeString(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function isOverdue(scheduledTime: string, status: string): boolean {
  if (['picked_up', 'failed', 'cancelled', 'partial'].includes(status)) return false
  return new Date(scheduledTime).getTime() < Date.now()
}
