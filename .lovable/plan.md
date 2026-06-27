## Plano de SEO Técnico — LocalPro CRM

Objetivo: maximizar indexação no Google das páginas públicas (landing, auth, agendamento público) e proteger as rotas autenticadas de serem indexadas.

Domínio canônico: `https://localprocrm.lovable.app`

---

### 1. Arquitetura de rotas públicas (criar landing dedicada)

Hoje `/` apenas redireciona para `/inicio` (rota autenticada) → Google vê uma página vazia. Vou:

- Transformar `src/routes/index.tsx` em uma **landing page real** com hero, módulos, benefícios, FAQ e CTA para `/auth`. Se houver sessão ativa, redireciona para `/inicio` no client.
- Adicionar rotas públicas SEO-friendly:
  - `/` — Home (landing)
  - `/recursos` — Recursos/módulos (CRM, Agenda, PDV, OS, IA, WhatsApp)
  - `/segmentos` — Segmentos atendidos (Barbearia, Clínica, Oficina, Assistência Técnica…)
  - `/precos` — Planos
  - `/contato` — Contato
- `/auth`, `/reset-password` e `/agendar/$slug` já são públicas — adicionar metadados próprios.

---

### 2. Meta tags por rota (head() do TanStack)

Cada rota pública recebe `head()` com:

- `<title>` único (<60 chars) com palavra-chave + marca
- `meta description` único (<160 chars)
- `og:title`, `og:description`, `og:url`, `og:type`, `og:image`, `og:site_name`
- `twitter:card=summary_large_image`, `twitter:title`, `twitter:description`, `twitter:image`
- `<link rel="canonical">` self-referente (apenas nas folhas)
- Idioma `pt-BR` (já no `__root.tsx`)

No `__root.tsx`: remover título/descrição genéricos das páginas (manter apenas defaults sitewide: viewport, charset, og:site_name, og:type=website) e remover o `og:image` global para não sobrescrever os das folhas.

**Rotas autenticadas (`/_authenticated/*`)**: adicionar `<meta name="robots" content="noindex, nofollow">` no layout `_authenticated/route.tsx` — dashboards e dados de cliente não devem ser indexados.

---

### 3. Hierarquia de headings

- Um único `<h1>` por página, com a keyword principal.
- `<h2>` para seções principais, `<h3>` para subtítulos.
- Auditar `PageHeader` para garantir que renderize `<h1>` apenas em páginas públicas; nas internas, usar `<h2>` ou aria-labels.
- HTML semântico: `<header>`, `<main>`, `<section>`, `<nav>`, `<footer>` na landing.

---

### 4. Sitemap dinâmico

Criar `src/routes/sitemap[.]xml.ts` como server route gerando XML com:

- `/`, `/recursos`, `/segmentos`, `/precos`, `/contato`, `/auth`
- Exclui rotas autenticadas e `/agendar/$slug` (geradas por tenant, podem entrar opcionalmente via loader futuro)
- `lastmod`, `changefreq`, `priority` adequados

---

### 5. robots.txt

Criar `public/robots.txt`:

```
User-agent: *
Allow: /
Disallow: /inicio
Disallow: /hoje
Disallow: /crm
Disallow: /agenda
Disallow: /pdv
Disallow: /os
Disallow: /vendas
Disallow: /financeiro
Disallow: /caixa
Disallow: /dashboard
Disallow: /relatorios
Disallow: /configuracoes
Disallow: /equipe
Disallow: /ia
Disallow: /whatsapp
Disallow: /planejamento
Disallow: /funil
Disallow: /guia
Disallow: /super-admin
Disallow: /onboarding

Sitemap: https://localprocrm.lovable.app/sitemap.xml
```

---

### 6. Dados estruturados (JSON-LD)

Via `scripts` no `head()`:

- `__root.tsx`: `Organization` + `WebSite` (com `SearchAction` apontando para `/recursos?q=`)
- `/` (landing): `SoftwareApplication` (categoria BusinessApplication, sistema operacional Web, oferta)
- `/precos`: `Product` + `Offer` para cada plano
- `/contato`: `LocalBusiness`/`ContactPage`
- `/recursos` ou FAQ na home: `FAQPage`

---

### 7. Performance e Core Web Vitals (sinais de ranking)

- Preconnect já existe para Google Fonts (manter).
- Adicionar `display=swap` nas fontes (já presente).
- Garantir `loading="lazy"` e `width`/`height` em imagens da landing.
- `alt` descritivo em todas as imagens.
- Imagens em formato moderno quando possível.

---

### 8. Configurações auxiliares

- `lang="pt-BR"` já está correto no `__root.tsx`.
- Adicionar `<meta name="theme-color">` para mobile.
- Adicionar `<link rel="manifest">` opcional (PWA leve, melhora sinais mobile).
- `og:image` 1200×630 dedicada por rota principal (usar a já existente da Lovable preview por enquanto; gerar nova só se aprovado).

---

### Arquivos que vão ser criados/editados

**Criar:**
- `src/routes/recursos.tsx`
- `src/routes/segmentos.tsx`
- `src/routes/precos.tsx`
- `src/routes/contato.tsx`
- `src/routes/sitemap[.]xml.ts`
- `public/robots.txt`
- `src/components/site-header.tsx` (nav pública)
- `src/components/site-footer.tsx`

**Editar:**
- `src/routes/index.tsx` — virar landing real com JSON-LD
- `src/routes/__root.tsx` — limpar meta genéricos, adicionar JSON-LD Organization/WebSite, theme-color
- `src/routes/_authenticated/route.tsx` — `noindex,nofollow`
- `src/routes/auth.tsx`, `src/routes/reset-password.tsx`, `src/routes/agendar.$slug.tsx` — head() apropriado

**Zero impacto** em CRM, PDV, OS, Vendas, IA, autenticação ou banco de dados.

---

### Saída esperada

- Google consegue indexar 5–6 páginas públicas com títulos/descrições únicos.
- Rotas com dados de cliente ficam fora do índice.
- Rich snippets candidatos: Organization, SoftwareApplication, FAQ, Pricing.
- Sitemap descoberto via `/sitemap.xml` e robots.txt.

Posso prosseguir com a implementação?
