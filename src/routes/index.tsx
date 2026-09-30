import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { 
  Send,
  ArrowRight,
  ExternalLink,
  Cpu,
  Layers,
  Zap,
  Globe
} from "lucide-react";
import logoAsset from "@/assets/mcx-logo.png.asset.json";
import backgroundAsset from "@/assets/mcx-background.jpg.asset.json";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "MCX Digital | Tecnologia Inteligente para Crescimento" },
      { property: "og:title", content: "MCX Digital | Tecnologia Inteligente para Crescimento" },
      { property: "og:description", content: "Automação, CRM e inteligência artificial para empresas que querem crescer." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "description", content: "A MCX Digital desenvolve soluções personalizadas em Automação, CRM e IA para empresas que buscam eficiência e crescimento." },
    ],
  }),
});

function Index() {
  const solutions = [
    {
      icon: Zap,
      title: "Automação Inteligente",
      desc: "Criamos fluxos automáticos para reduzir tarefas manuais e melhorar processos.",
      items: ["Atendimento automatizado", "Follow-up comercial", "Integrações", "Processos internos"]
    },
    {
      icon: Layers,
      title: "CRM Personalizado",
      desc: "Estruturamos o relacionamento com clientes e oportunidades de vendas.",
      items: ["Cadastro de clientes", "Funil de vendas", "Histórico de contatos", "Gestão comercial"]
    },
    {
      icon: Cpu,
      title: "Inteligência Artificial",
      desc: "Aplicamos IA para tornar operações mais rápidas e inteligentes.",
      items: ["Assistentes virtuais", "Chatbots", "Organização de informações"]
    },
    {
      icon: Globe,
      title: "Presença Digital",
      desc: "Criamos estruturas digitais para fortalecer negócios.",
      items: ["Landing Pages", "Sites", "Link na Bio Premium"]
    }
  ];

  const steps = [
    { number: "01", title: "Diagnóstico", desc: "Entendimento do negócio." },
    { number: "02", title: "Estratégia", desc: "Definição da melhor solução." },
    { number: "03", title: "Desenvolvimento", desc: "Criação e implementação." },
    { number: "04", title: "Evolução", desc: "Melhorias contínuas." }
  ];

  return (
    <div className="min-h-screen bg-mcx-surface text-mcx-ink selection:bg-mcx-brand/30 font-sans">
      {/* 1. Hero Section */}
      <section className="relative min-h-[min(720px,78svh)] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-mcx-surface/70 z-10" />
          <img 
            src={backgroundAsset.url} 
            alt="Planeta visto do espaço à noite" 
            className="w-full h-full object-cover opacity-40"
          />
        </div>

        <nav className="absolute top-0 left-0 right-0 z-50 px-4 py-4 md:px-10 md:py-6 flex justify-between items-center gap-4">
          <div className="flex items-center">
            <img src={logoAsset.url} alt="MCX Digital" className="h-10 md:h-12 w-auto" />
          </div>
          <div className="hidden lg:flex gap-8 text-xs uppercase font-medium text-mcx-soft">
            <a href="#solucoes" className="hover:text-mcx-brand transition">Soluções</a>
            <a href="#como-funciona" className="hover:text-mcx-brand transition">Como Funciona</a>
            <a href="#sobre" className="hover:text-mcx-brand transition">Sobre</a>
            <a href="#contato" className="hover:text-mcx-brand transition">Contato</a>
          </div>
          <Link to="/localpro" className="shrink-0 border border-mcx-ink/30 px-4 py-2 text-xs font-semibold uppercase text-mcx-ink transition hover:border-mcx-brand hover:text-mcx-brand focus-visible:outline-2 focus-visible:outline-mcx-brand">LocalPro CRM <ArrowRight className="inline size-3" /></Link>
        </nav>

        <div className="relative z-20 container mx-auto px-4 text-center max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-4xl md:text-7xl font-medium leading-tight tracking-tight mb-8">
              Tecnologia <span className="text-mcx-highlight">inteligente</span> para empresas que querem <span className="text-mcx-highlight">crescer</span>.
            </h1>
            <p className="text-lg md:text-xl text-mcx-soft mb-10 max-w-2xl mx-auto font-light">
              Criamos soluções com automação, CRM e inteligência artificial para otimizar processos, organizar vendas e acelerar negócios.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild className="h-14 px-10 rounded-sm bg-mcx-brand text-mcx-ink text-xs uppercase font-bold hover:bg-mcx-brand-strong"><Link to="/contato">Solicitar diagnóstico</Link></Button>
              <Button asChild variant="outline" className="h-14 px-10 rounded-sm border-mcx-ink/20 bg-transparent text-mcx-ink text-xs uppercase font-bold hover:bg-mcx-ink/10 hover:text-mcx-ink"><a href="#solucoes">Conhecer soluções</a></Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 2. Sobre a MCX Section */}
      <section id="sobre" className="py-16 md:py-32 bg-mcx-surface border-y border-mcx-ink/5">
        <div className="container mx-auto px-4 text-center max-w-4xl">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <span className="text-mcx-brand text-xs uppercase tracking-[0.3em] font-bold">Sobre a MCX</span>
            <h2 className="text-3xl md:text-5xl font-medium tracking-tight leading-snug">
              Tecnologia aplicada aos <span className="text-mcx-highlight">desafios reais</span> dos negócios.
            </h2>
            <div className="w-24 h-[1px] bg-gradient-to-r from-transparent via-mcx-brand to-transparent mx-auto" />
            <p className="text-mcx-muted text-lg font-light leading-relaxed">
              A MCX Digital desenvolve soluções personalizadas para empresas que buscam mais eficiência, organização e crescimento através da tecnologia.
            </p>
          </motion.div>
        </div>
      </section>

      {/* 3. Soluções Section */}
      <section id="solucoes" className="py-32 container mx-auto px-4">
        <div className="text-center mb-20">
          <span className="text-mcx-brand text-xs uppercase tracking-[0.3em] font-bold">Soluções</span>
          <h2 className="text-4xl md:text-5xl font-medium mt-4">Quatro pilares de atuação</h2>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {solutions.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group p-8 md:p-12 border border-mcx-ink/10 rounded-3xl bg-mcx-ink/[0.02] hover:bg-mcx-ink/[0.05] transition-all duration-500 flex flex-col gap-6"
            >
              <div className="p-4 w-fit rounded-2xl bg-mcx-brand/10 text-mcx-highlight group-hover:bg-mcx-brand group-hover:text-mcx-ink transition-colors duration-500">
                <item.icon size={32} strokeWidth={1.5} />
              </div>
              <div className="space-y-4">
                <h3 className="text-2xl font-medium tracking-tight">{item.title}</h3>
                <p className="text-mcx-muted font-light leading-relaxed">{item.desc}</p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-6 border-t border-mcx-ink/5">
                  {item.items.map((point, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-mcx-muted">
                      <span className="text-mcx-brand">›</span>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 4. Como Funciona Section */}
      <section id="como-funciona" className="py-32 bg-mcx-surface border-y border-mcx-ink/5">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-20">
            <span className="text-mcx-brand text-xs uppercase tracking-[0.3em] font-bold">Como Funciona</span>
            <h2 className="text-4xl md:text-5xl font-medium mt-4">Jornada em quatro etapas</h2>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="group relative p-8 border border-mcx-ink/10 rounded-3xl bg-mcx-ink/[0.02] hover:bg-mcx-ink/[0.05] transition-all duration-500"
              >
                <span className="text-5xl font-bold text-mcx-brand/20 group-hover:text-mcx-brand/40 transition-colors duration-500">
                  {step.number}
                </span>
                <div className="mt-6 space-y-3">
                  <h3 className="text-xl font-medium tracking-tight">{step.title}</h3>
                  <p className="text-mcx-muted font-light text-sm leading-relaxed">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Resultados Esperados Section */}
      <section className="py-32 container mx-auto px-4 max-w-6xl">
        <div className="text-center mb-20">
          <span className="text-mcx-brand text-xs uppercase tracking-[0.3em] font-bold">Resultados Esperados</span>
          <h2 className="text-4xl md:text-5xl font-medium mt-4">Transformação digital real</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-px bg-mcx-ink/10 rounded-3xl overflow-hidden border border-mcx-ink/10">
          <div className="p-12 bg-mcx-surface/40">
            <h3 className="text-xs uppercase tracking-widest text-mcx-muted font-bold mb-10 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500/50" /> Antes
            </h3>
            <ul className="space-y-6">
              <li className="flex items-center gap-4 text-lg text-mcx-muted font-light">
                <span className="text-red-500/50 text-2xl">×</span>
                Processos desorganizados
              </li>
              <li className="flex items-center gap-4 text-lg text-mcx-muted font-light">
                <span className="text-red-500/50 text-2xl">×</span>
                Perda de oportunidades
              </li>
              <li className="flex items-center gap-4 text-lg text-mcx-muted font-light">
                <span className="text-red-500/50 text-2xl">×</span>
                Falta de acompanhamento
              </li>
            </ul>
          </div>
          <div className="p-12 bg-mcx-brand/5">
            <h3 className="text-xs uppercase tracking-widest text-mcx-brand font-bold mb-10 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-mcx-brand" /> Depois
            </h3>
            <ul className="space-y-6">
              <li className="flex items-center gap-4 text-lg text-mcx-ink font-light">
                <span className="text-mcx-brand text-2xl">✓</span>
                Processos inteligentes
              </li>
              <li className="flex items-center gap-4 text-lg text-mcx-ink font-light">
                <span className="text-mcx-brand text-2xl">✓</span>
                Clientes organizados
              </li>
              <li className="flex items-center gap-4 text-lg text-mcx-ink font-light">
                <span className="text-mcx-brand text-2xl">✓</span>
                Mais controle comercial
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* 6. CTA Final Section */}
      <section id="contato" className="py-32 relative overflow-hidden bg-mcx-brand-strong">
        <div className="container mx-auto px-4 text-center relative z-10 max-w-4xl">
          <span className="text-mcx-ink/70 text-xs uppercase font-bold mb-6 block">MCX Digital</span>
          <h2 className="text-4xl md:text-6xl font-medium tracking-tight mb-8">
            Sua empresa está pronta para trabalhar de forma mais inteligente?
          </h2>
          <p className="text-mcx-ink/80 text-lg md:text-xl mb-12 font-light">
            Solicite um diagnóstico com a MCX Digital.
          </p>
          <Button asChild className="h-14 px-10 rounded-sm bg-mcx-ink text-mcx-brand-strong text-xs uppercase font-bold hover:bg-mcx-ink/90"><Link to="/contato">Solicitar diagnóstico</Link></Button>
        </div>
      </section>

      {/* 6. Footer */}
      <footer className="py-20 border-t border-mcx-ink/5">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-10">
            <div className="flex items-center">
              <img src={logoAsset.url} alt="MCX Digital" className="h-8 w-auto opacity-80" />
            </div>
            
            <div className="flex gap-6">
              <Link to="/contato" aria-label="Contato" className="p-3 border border-mcx-ink/10 hover:bg-mcx-ink/10 transition"><Send size={20} /></Link>
              <Link to="/localpro" aria-label="LocalPro CRM" className="p-3 border border-mcx-ink/10 hover:bg-mcx-ink/10 transition"><ExternalLink size={20} /></Link>
            </div>

            <p className="text-mcx-muted text-xs uppercase font-light">
              © {new Date().getFullYear()} MCX Digital. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
