"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Menu, X, GraduationCap } from "lucide-react"
import { cn } from "@/lib/utils"

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How it Works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener("scroll", onScroll)
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-white/90 backdrop-blur-md shadow-sm border-b border-indigo-100"
          : "bg-transparent"
      )}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-md group-hover:bg-indigo-700 transition-colors">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <span className={cn("font-bold text-xl tracking-tight transition-colors", scrolled ? "text-gray-900" : "text-white")}>
            Nex<span className="text-indigo-400">Schoola</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <ul className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className={cn("text-sm font-medium transition-colors hover:text-indigo-400", scrolled ? "text-gray-600" : "text-white/80")}
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/login"
            className={cn("text-sm font-medium transition-colors px-4 py-2", scrolled ? "text-gray-700 hover:text-indigo-600" : "text-white/80 hover:text-white")}
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="text-sm font-semibold bg-indigo-600 text-white px-5 py-2.5 rounded-full hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200"
          >
            Get Started Free
          </Link>
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden p-2 rounded-lg text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-white border-b border-gray-100 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="py-2.5 px-3 rounded-lg text-sm font-medium text-gray-700 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
              >
                {link.label}
              </a>
            ))}
            <div className="pt-3 mt-2 border-t border-gray-100 flex flex-col gap-2">
              <Link
                href="/login"
                className="py-2.5 px-3 rounded-lg text-sm font-medium text-center text-gray-700 hover:bg-gray-50"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="py-2.5 px-3 rounded-full text-sm font-semibold text-center bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Get Started Free
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
