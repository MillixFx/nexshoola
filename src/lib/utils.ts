import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = "GHS") {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency,
  }).format(amount)
}

export function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("en-GH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date))
}

export function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-")
    .trim()
}
