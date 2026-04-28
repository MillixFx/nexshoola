import Link from "next/link"
import { GraduationCap, Mail, Phone } from "lucide-react"

const links = {
  Product: ["Features", "Pricing", "Changelog", "Roadmap"],
  Company: ["About", "Blog", "Contact", "Careers"],
  Legal: ["Privacy Policy", "Terms of Service", "Cookie Policy"],
  Support: ["Documentation", "Help Center", "Status", "Community"],
}

export default function Footer() {
  return (
    <footer className="bg-gray-950 text-gray-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-white text-lg">
                Nex<span className="text-indigo-400">Schoool</span>a
              </span>
            </Link>
            <p className="text-sm leading-relaxed mb-5 max-w-xs">
              The modern school management platform built for Ghanaian schools. Manage everything from one dashboard.
            </p>
            <div className="space-y-2 text-sm">
              <a href="mailto:hello@nexschoola.com" className="flex items-center gap-2 hover:text-white transition-colors">
                <Mail className="w-4 h-4 text-indigo-400" />
                hello@nexschoola.com
              </a>
              <a href="tel:+233000000000" className="flex items-center gap-2 hover:text-white transition-colors">
                <Phone className="w-4 h-4 text-indigo-400" />
                +233 XXX XXX XXX
              </a>
            </div>
          </div>

          {/* Links */}
          {Object.entries(links).map(([section, items]) => (
            <div key={section}>
              <h4 className="text-white font-semibold text-sm mb-4">{section}</h4>
              <ul className="space-y-2.5">
                {items.map((item) => (
                  <li key={item}>
                    <Link
                      href="#"
                      className="text-sm hover:text-white transition-colors"
                    >
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm">
            © {new Date().getFullYear()} NexSchoola. Made with ❤️ for Ghanaian schools 🇬🇭
          </p>
          <div className="flex items-center gap-2 text-sm">
            <span>Payments by</span>
            <span className="bg-gray-800 text-white px-2.5 py-1 rounded-md font-semibold text-xs">
              Paystack
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
