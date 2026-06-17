import { ReactNode } from 'react'

interface ButtonProps {
  children: ReactNode
  onClick?: (e?: React.MouseEvent<HTMLButtonElement>) => void
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  className?: string
  type?: 'button' | 'submit'
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
  type = 'button',
}: ButtonProps) {
  const variants = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600',
    secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-200',
    danger: 'bg-red-600 hover:bg-red-700 text-white border-red-600',
    success: 'bg-green-600 hover:bg-green-700 text-white border-green-600',
    warning: 'bg-amber-500 hover:bg-amber-600 text-white border-amber-500',
    ghost: 'bg-transparent hover:bg-gray-50 text-gray-600 border-transparent',
  }
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 rounded-md font-medium border transition-colors
        ${variants[variant]} ${sizes[size]}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}`}
    >
      {children}
    </button>
  )
}

interface BadgeProps {
  children: ReactNode
  color?: 'blue' | 'green' | 'red' | 'amber' | 'gray' | 'purple' | 'cyan' | 'orange'
  className?: string
}

export function Badge({ children, color = 'blue', className = '' }: BadgeProps) {
  const colors = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    gray: 'bg-gray-50 text-gray-700 border-gray-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    cyan: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${colors[color]} ${className}`}>
      {children}
    </span>
  )
}

interface TagProps {
  children: ReactNode
  className?: string
  title?: string
}

export function Tag({ children, className = '', title }: TagProps) {
  return (
    <span
      className={`inline-block px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs ${className}`}
      title={title}
    >
      {children}
    </span>
  )
}

interface CardProps {
  children: ReactNode
  className?: string
  title?: ReactNode
  extra?: ReactNode
}

export function Card({ children, className = '', title, extra }: CardProps) {
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-100 ${className}`}>
      {(title || extra) && (
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          {title && <div className="text-base font-semibold text-gray-800">{title}</div>}
          {extra && <div>{extra}</div>}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  )
}

interface EmptyStateProps {
  title?: string
  description?: string
  icon?: ReactNode
}

export function EmptyState({
  title = '暂无数据',
  description = '这里什么都没有',
  icon,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 mb-4">
        {icon || (
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        )}
      </div>
      <div className="text-sm font-medium text-gray-700 mb-1">{title}</div>
      <div className="text-xs text-gray-400">{description}</div>
    </div>
  )
}

interface ToastProps {
  message: string
  type?: 'success' | 'error' | 'warning' | 'info'
}

export function Toast({ message, type = 'info' }: ToastProps) {
  const colors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-amber-500',
    info: 'bg-blue-500',
  }
  return (
    <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 ${colors[type]} text-white px-5 py-2.5 rounded-lg shadow-lg text-sm font-medium animate-fade-in`}>
      {message}
    </div>
  )
}

interface ModalProps {
  open: boolean
  title: ReactNode
  children: ReactNode
  onClose: () => void
  footer?: ReactNode
  width?: string
}

export function Modal({ open, title, children, onClose, footer, width = 'max-w-2xl' }: ModalProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/40">
      <div className={`w-full ${width} bg-white rounded-xl shadow-xl max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="text-lg font-semibold text-gray-800">{title}</div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-md hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-auto px-6 py-5 scrollbar-thin">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

interface InputProps {
  label?: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  className?: string
  error?: string
  min?: number | string
  max?: number | string
  step?: number | string
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
}

export function Input({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  error,
  required,
  disabled,
  className = '',
  min,
  max,
  step,
  onKeyDown,
}: InputProps) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        onKeyDown={onKeyDown}
        min={min}
        max={max}
        step={step}
        className={`w-full px-3 py-2 text-sm border rounded-md transition-colors
          ${error ? 'border-red-300 focus:ring-red-200 focus:border-red-400 bg-red-50'
                 : 'border-gray-200 focus:ring-blue-200 focus:border-blue-400'}
          ${disabled ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : 'bg-white'}
          focus:outline-none focus:ring-2`}
      />
      {error && <div className="mt-1 text-xs text-red-500">{error}</div>}
    </div>
  )
}

interface SelectProps {
  label?: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
  error?: string
  required?: boolean
  disabled?: boolean
  className?: string
}

export function Select({
  label,
  value,
  onChange,
  options,
  placeholder = '请选择',
  error,
  required,
  disabled,
  className = '',
}: SelectProps) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`w-full px-3 py-2 text-sm border rounded-md transition-colors bg-white
          ${error ? 'border-red-300 focus:ring-red-200 focus:border-red-400'
                 : 'border-gray-200 focus:ring-blue-200 focus:border-blue-400'}
          ${disabled ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : ''}
          focus:outline-none focus:ring-2`}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <div className="mt-1 text-xs text-red-500">{error}</div>}
    </div>
  )
}

interface TextareaProps {
  label?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  required?: boolean
  disabled?: boolean
  rows?: number
  className?: string
  error?: string
}

export function Textarea({
  label,
  value,
  onChange,
  placeholder,
  required,
  disabled,
  rows = 3,
  className = '',
  error,
}: TextareaProps) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        className={`w-full px-3 py-2 text-sm border rounded-md transition-colors
          ${error ? 'border-red-300 focus:ring-red-200 focus:border-red-400 bg-red-50'
                 : 'border-gray-200 focus:ring-blue-200 focus:border-blue-400'}
          ${disabled ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : 'bg-white'}
          focus:outline-none focus:ring-2 resize-none`}
      />
      {error && <div className="mt-1 text-xs text-red-500">{error}</div>}
    </div>
  )
}
