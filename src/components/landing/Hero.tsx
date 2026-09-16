import { useState } from "react";
import { ArrowRight, Play, CheckCircle2, Shield, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import ScreenshotsModal from "./ScreenshotsModal";

const sora = { fontFamily: "'Sora', sans-serif" };
const manrope = { fontFamily: "'Manrope', sans-serif" };

// Social proof data
const proof = [
  "+500 condomínios",
  "98% de aceitação",
  "5min para ativar",
];

const Hero = () => {
  const [screenshotsOpen, setScreenshotsOpen] = useState(false);

  return (
    <section
      className="relative bg-[#020617] text-slate-200 overflow-hidden pt-28 pb-20 px-6"
      style={manrope}
    >
      {/* Background layers */}
      <div className="absolute inset-0">
        {/* Glows */}
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-indigo-600/25 blur-[140px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-violet-600/15 blur-[120px] rounded-full pointer-events-none" />
        {/* Grid */}
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Social proof strip */}
        <div className="flex items-center justify-center gap-6 mb-12 flex-wrap">
          {proof.map((item) => (
            <div key={item} className="flex items-center gap-2 text-sm text-slate-400">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{item}</span>
            </div>
          ))}
        </div>

        {/* Main headline */}
        <div className="text-center mb-10">
          <h1
            style={sora}
            className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-white mb-6 leading-[1.05]"
          >
            Síndico que perde tempo
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-400 to-indigo-400">
              com papelada?
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-lg md:text-xl text-slate-300 mb-10 leading-relaxed">
            NotificaCondo automatiza notificações, encomendas e portaria — com prova jurídica que
            <span className="text-indigo-300 font-medium">dispensa advogado</span>.
            Sua gestão, enfin, sem dor de cabeça.
          </p>
        </div>

        {/* CTA group */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
          <Link
            to="/auth"
            className="group relative px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-xl shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:scale-[1.03] active:scale-[0.98] inline-flex items-center gap-3 text-base"
          >
            <Zap className="w-5 h-5" />
            Começar 7 dias grátis
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            {/* Glow */}
            <div className="absolute -inset-px rounded-xl bg-gradient-to-r from-indigo-400 via-violet-400 to-indigo-400 opacity-0 group-hover:opacity-60 blur-sm transition-opacity pointer-events-none" />
          </Link>
          <button
            onClick={() => setScreenshotsOpen(true)}
            className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/15 text-white font-semibold rounded-xl transition-all inline-flex items-center gap-3 text-base"
          >
            <Play className="w-5 h-5" />
            Ver como funciona
          </button>
        </div>

        <ScreenshotsModal open={screenshotsOpen} onOpenChange={setScreenshotsOpen} />

        {/* Trust badges */}
        <div className="flex items-center justify-center gap-6 flex-wrap">
          {[
            { icon: Shield, label: "LGPD compliant" },
            { icon: CheckCircle2, label: "Sem cartão no teste" },
            { icon: Zap, label: "Ativação em 5 min" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2 text-xs text-slate-500">
              <Icon className="w-4 h-4" />
              {label}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Hero;
