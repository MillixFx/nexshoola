import { Star, Quote } from "lucide-react"

const testimonials = [
  {
    name: "Akosua Mensah",
    role: "Headmistress",
    school: "Green Valley Academy, Accra",
    avatar: "AM",
    color: "bg-indigo-500",
    quote:
      "NexSchoola has completely transformed how we run our school. Collecting fees via Mobile Money alone saved us hours every week. Our parents love the transparency.",
    rating: 5,
  },
  {
    name: "Kwame Asante",
    role: "School Administrator",
    school: "Blessed Kids School, Kumasi",
    avatar: "KA",
    color: "bg-emerald-500",
    quote:
      "The exam and result management module is incredible. We used to spend days printing results manually. Now it takes minutes and parents can view results on their phones.",
    rating: 5,
  },
  {
    name: "Efua Boateng",
    role: "Director",
    school: "Excel International School, Takoradi",
    avatar: "EB",
    color: "bg-amber-500",
    quote:
      "Finally a school management system that understands Ghana. MoMo payments, GHS currency, and it actually works. We onboarded all 3 of our branches in one day.",
    rating: 5,
  },
]

export default function Testimonials() {
  return (
    <section className="py-24 bg-gradient-to-br from-indigo-950 to-indigo-900 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="inline-block text-sm font-semibold text-indigo-300 uppercase tracking-wider mb-4">
            Testimonials
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-5">
            Loved by Ghanaian schools
          </h2>
          <p className="text-lg text-indigo-200 max-w-xl mx-auto">
            See what administrators and headteachers are saying about NexSchoola.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-7 flex flex-col hover:bg-white/10 transition-colors"
            >
              <Quote className="w-8 h-8 text-indigo-400 mb-4 opacity-60" />
              <p className="text-indigo-100 text-sm leading-relaxed flex-1 mb-6">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="flex items-center gap-0.5 mb-4">
                {[...Array(t.rating)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full ${t.color} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                  {t.avatar}
                </div>
                <div>
                  <div className="font-semibold text-white text-sm">{t.name}</div>
                  <div className="text-xs text-indigo-300">{t.role}</div>
                  <div className="text-xs text-indigo-400">{t.school}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
