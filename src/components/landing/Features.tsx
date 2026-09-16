import { Scale, Package, PartyPopper, DoorOpen, Wrench, ArrowRight, TrendingUp, Clock, Users, FileCheck } from "lucide-react";
import { Link } from "react-router-dom";

const sora = { fontFamily: "'Sora', sans-serif" };
const manrope = { fontFamily: "'Manrope', sans-serif" };

// Impact metrics for social proof
const metrics = [
  { value: "80%", label: "Menos retrabalho", icon: TrendingUp },
  { value: "5min", label: "Para ativar", icon: Clock },
  { value: "500+", label: "Condomínios", icon: Users },
  { value: "100%", label: "Prova jurídica", icon: FileCheck },
];

// Module cards with concrete benefits
const modules = [
  {
    icon: Scale,
    title: "Ocorrências",
    subtitle: "com validade jurídica",
    benefit: "Notificações com ciência automática via WhatsApp WABA. Contraditório, ampla defesa e dossiê exportável. Base legal Art. 1.336/1.337.",
    color: "indigo",
    cta: "Gerar notificação",
    href: "/auth",
    badge: "Mais usado",
  },
  {
    icon: Package,
    title: "Encomendas",
    subtitle: "sem perder nada",
    benefit: "Registre com foto, gere código de 6 dígitos e notifique o morador instantaneamente. Baixa automatizada na retirada.",
    color: "blue",
    cta: "Testar encomendas",
    href: "/auth",
    badge: null,
  },
  {
    icon: PartyPopper,
    title: "Reserva de Espaços",
    subtitle: "sem planilha",
    benefit: "Calendário visual, aprovação do síndico, checklist digital e termo de responsabilidade com assinatura eletrônica.",
    color: "violet",
    cta: "Conhecer",
    href: "/auth",
    badge: null,
  },
  {
    icon: DoorOpen,
    title: "Portaria",
    subtitle: "inteligente",
    benefit: "Livro de recados em tempo real, passagem de plantão e banners informativos. Tudo auditado.",
    color: "emerald",
    cta: "Ver portaria",
    href: "/auth",
    badge: null,
  },
  {
    icon: Wrench,
    title: "Manutenção",
    subtitle: "preventiva",
    benefit: "Dashboard de chamados, atribuição a zeladores e alertas automáticos para inspeções periódicas.",
    color: "amber",
    cta: "Agendar manutenção",
    href: "/auth",
    badge: null,
  },
];

const colorMap: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  indigo: { bg: "bg-indigo-500/15", border: "border-indigo-500/30", text: "text-indigo-300", badge: "bg-indigo-500/20 border-indigo-500/30" },
  blue:   { bg: "bg-blue-500/15",   border: "border-blue-500/30",   text: "text-blue-300",   badge: "bg-blue-500/20 border-blue-500/30" },
  violet: { bg: "bg-violet-500/15", border: "border-violet-500/30", text: "text-violet-300", badge: "bg-violet-500/20 border-violet-500/30" },
  emerald:{ bg: "bg-emerald-500/15",border: "border-emerald-500/30",text: "text-emerald-300",badge: "bg-emerald-500/20 border-emerald-500/30" },
  amber:  { bg: "bg-amber-500/15",  border: "border-amber-500/30",  text: "text-amber-300",  badge: "bg-amber-500/20 border-amber-500/30" },
};

const Features = () => {
  return (
    <section
      id="funcionalidades"
      className="relative bg-[#020617] text-slate-200 py-24 px-6"
      style={manrope}
    >
      {/* Divider */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />

      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <span className="text-indigo-400 text-xs font-semibold uppercase tracking-[0.2em]">
            O que você ganha
          </span>
          <h2
            style={sora}
            className="text-3xl md:text-5xl font-bold text-white mt-4 mb-4"
          >
            Cinco módulos.{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">
              Uma única plataforma.
            </span>
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            Tudo que síndico, portaria e moradores precisam — integrado ao WhatsApp
            com conformidade jurídica de ponta a ponta.
          </p>
        </div>

        {/* Modules grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-16">
          {modules.map((mod) => {
            const c = colorMap[mod.color];
            return (
              <div
                key={mod.title}
                className={`group relative rounded-2xl border ${c.border} ${c.bg} p-6 hover:${c.border.replace('/30', '/60')} transition-all duration-300 hover:scale-[1.02] cursor-pointer`}
              >
                {/* Badge */}
                {mod.badge && (
                  <div className={`absolute -top-2.5 left-4 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${c.badge} text-white`}>
                    {mod.badge}
                  </div>
                )}

                {/* Icon */}
                <div className={`w-11 h-11 rounded-xl ${c.bg} border ${c.border} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <mod.icon className={`w-5 h-5 ${c.text}`} />
                </div>

                {/* Title */}
                <h3 style={sora} className="text-lg font-bold text-white mb-0.5">
                  {mod.title}
                </h3>
                <p className={`text-xs ${c.text} mb-3`}>{mod.subtitle}</p>

                {/* Benefit */}
                <p className="text-slate-400 text-sm leading-relaxed mb-5">
                  {mod.benefit}
                </p>

                {/* CTA */}
                <Link
                  to={mod.href}
                  className={`inline-flex items-center gap-1.5 text-sm font-medium ${c.text} hover:text-white group/link transition-colors`}
                >
                  {mod.cta}
                  <ArrowRight className="w-3.5 h-3.5 group-hover/link:translate-x-1 transition-transform" />
                </Link>
              </div>
            );
          })}
        </div>

        {/* Impact metrics strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-white/[0.03] border border-white/8 rounded-2xl p-6">
          {metrics.map((m) => (
            <div key={m.label} className="text-center">
              <div className={`w-8 h-8 rounded-lg ${m.icon === TrendingUp ? 'bg-emerald-500/20' : m.icon === Clock ? 'bg-indigo-500/20' : m.icon === Users ? 'bg-violet-500/20' : 'bg-amber-500/20'} flex items-center justify-center mx-auto mb-2`}>
                <m.icon className={`w-4 h-4 ${m.icon === TrendingUp ? 'text-emerald-400' : m.icon === Clock ? 'text-indigo-400' : m.icon === Users ? 'text-violet-400' : 'text-amber-400'}`} />
              </div>
              <div style={sora} className="text-2xl font-extrabold text-white mb-0.5">{m.value}</div>
              <div className="text-xs text-slate-500">{m.label}</div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-12 text-center">
          <p className="text-slate-400 text-sm mb-4">
            Ainda não tem certeza? Comece pelo módulo que mais precisa.
          </p>
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-600/20 hover:scale-[1.02]"
          >
            Testar grátis por 7 dias
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default Features;
