export function formatDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

export function nowStr(): string {
  return formatDate(new Date())
}

export function isValidPhone(phone: string): boolean {
  return /^1[3-9]\d{9}$/.test(phone.trim())
}

export function isOverdue(scheduledTime: string, status: string): boolean {
  if (['picked_up', 'cancelled', 'failed', 'partial'].includes(status)) return false
  return new Date(scheduledTime).getTime() < Date.now()
}

export const orderStatusMap: Record<string, { label: string; color: string; bgColor: string }> = {
  pending: { label: '待确认', color: 'text-amber-700', bgColor: 'bg-amber-50 border-amber-200' },
  confirmed: { label: '已确认', color: 'text-blue-700', bgColor: 'bg-blue-50 border-blue-200' },
  ready: { label: '待取货', color: 'text-cyan-700', bgColor: 'bg-cyan-50 border-cyan-200' },
  delayed: { label: '已延期', color: 'text-purple-700', bgColor: 'bg-purple-50 border-purple-200' },
  picked_up: { label: '已完成', color: 'text-green-700', bgColor: 'bg-green-50 border-green-200' },
  partial: { label: '部分完成', color: 'text-orange-700', bgColor: 'bg-orange-50 border-orange-200' },
  failed: { label: '自提失败', color: 'text-red-700', bgColor: 'bg-red-50 border-red-200' },
  cancelled: { label: '已取消', color: 'text-gray-700', bgColor: 'bg-gray-50 border-gray-200' },
}

export function generateOrderNo(orderCount: number): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const seq = String(orderCount + 1).padStart(4, '0')
  return `TP${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${seq}`
}

export function generateTransferNo(transferCount: number): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const seq = String(transferCount + 1).padStart(4, '0')
  return `TR${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${seq}`
}

export const transferStatusMap: Record<string, { label: string; color: string; bgColor: string }> = {
  pending: { label: '待处理', color: 'text-amber-700', bgColor: 'bg-amber-50 border-amber-200' },
  approved: { label: '待出库', color: 'text-blue-700', bgColor: 'bg-blue-50 border-blue-200' },
  outbound: { label: '已出库', color: 'text-cyan-700', bgColor: 'bg-cyan-50 border-cyan-200' },
  in_transit: { label: '运输中', color: 'text-indigo-700', bgColor: 'bg-indigo-50 border-indigo-200' },
  inbound: { label: '待入库', color: 'text-orange-700', bgColor: 'bg-orange-50 border-orange-200' },
  completed: { label: '已完成', color: 'text-green-700', bgColor: 'bg-green-50 border-green-200' },
  rejected: { label: '已拒绝', color: 'text-red-700', bgColor: 'bg-red-50 border-red-200' },
}

export const purchaseStatusMap: Record<string, { label: string; color: string; bgColor: string }> = {
  pending_approval: { label: '待审批', color: 'text-amber-700', bgColor: 'bg-amber-50 border-amber-200' },
  approved: { label: '待下单', color: 'text-blue-700', bgColor: 'bg-blue-50 border-blue-200' },
  pending_order: { label: '待下单', color: 'text-blue-700', bgColor: 'bg-blue-50 border-blue-200' },
  ordered: { label: '待到货', color: 'text-cyan-700', bgColor: 'bg-cyan-50 border-cyan-200' },
  pending_arrival: { label: '待到货', color: 'text-cyan-700', bgColor: 'bg-cyan-50 border-cyan-200' },
  partial_arrival: { label: '部分到货', color: 'text-orange-700', bgColor: 'bg-orange-50 border-orange-200' },
  completed: { label: '已完成', color: 'text-green-700', bgColor: 'bg-green-50 border-green-200' },
  cancelled: { label: '已取消', color: 'text-gray-700', bgColor: 'bg-gray-50 border-gray-200' },
}

export function generatePurchaseNo(purchaseCount: number): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const seq = String(purchaseCount + 1).padStart(4, '0')
  return `PU${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${seq}`
}
