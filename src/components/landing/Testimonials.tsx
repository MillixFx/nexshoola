import { Star, Quote } from "lucide-react"

const testimonials = [
  {
    name: "Mr. Isaac Duut",
    role: "Parent",
    school: "Christ Foundation Academy",
    avatar: "ID",
    color: "bg-indigo-500",
    quote:
      "My son's performance has improved a lot. We can now track his attendance and see his results directly on our phones. NexSchoola has made things so much easier for us as parents.",
    rating: 5,
  },
  {
    name: "Madam Ruth Kombat",
    role: "Parent",
    school: "Christ Foundation Academy",
    avatar: "RK",
    color: "bg-emerald-500",
    quote:
      "The teachers really pay attention to every child. And with NexSchoola, I can see my child's fees, attendance and report card anytime. It gives me peace of mind.",
    rating: 5,
  },
  {
    name: "Mr. Joseph Langbong",
    role: "Parent",
    school: "Christ Foundation Academy",
    avatar: "JL",
    color: "bg-amber-500",
    quote:
      "Discipline in this school is very strong, and the system supports it. Fee payments via Mobile Money, notices sent instantly — this is exactly what Ghanaian schools need.",
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
