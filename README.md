# AFIM - Associação Filhos de Maria

Site/PWA (instalável no celular) da Associação Filhos de Maria: informativos (newsletter), liturgia diária e pedidos de oração.

## Arquitetura

Site estático (HTML/CSS/JS puro, sem framework/build) + **Netlify Functions** + **Netlify Blobs** como "banco de dados" em JSON. Sem servidor de banco de dados externo — mesmo padrão usado no projeto [Ministério Chave de Davi](https://github.com/Cercadu/ministeriochavededavi).

- `index.html`, `liturgia.html`, `oracao.html`, `inscricao.html` — páginas públicas
- `admin/index.html` — painel administrativo (login individual por usuário/senha)
- `netlify/functions/posts.mjs` — CRUD de publicações (armazenado em Netlify Blobs)
- `netlify/functions/prayers.mjs` — pedidos de oração (envio público + moderação admin, mural mostra só últimos 7 dias)
- `netlify/functions/candles.mjs` — velas digitais (gesto simbólico, sem moderação, some após 24h)
- `netlify/functions/testimonials.mjs` — mural de testemunhos (envio público + moderação admin)
- `netlify/functions/forms.mjs` — links de formulários externos (ex: Google Forms) geridos pelo admin
- `netlify/functions/users.mjs` + `login.mjs` — contas de admin (usuário/senha com hash, sessão via token assinado)
- `netlify/functions/upload.mjs` — upload de imagens/documentos (admin)
- `netlify/functions/media.mjs` — entrega dos arquivos enviados
- `manifest.json` + `sw.js` — PWA (instalável, funciona offline para conteúdo já visitado)
- Liturgia diária consumida da API pública [`liturgia.up.railway.app`](https://liturgia.up.railway.app/v2/)

## Configuração necessária no Netlify

1. **Variável de ambiente** `SESSION_SECRET` — uma string aleatória longa, usada para assinar as sessões de login do admin (não é uma senha de pessoa, é só uma chave interna do sistema).
2. Nenhuma outra configuração manual é necessária: o Netlify Blobs funciona automaticamente em qualquer site hospedado na Netlify.

## Contas de administrador

Não existe senha compartilhada nem senha guardada no código. Ao acessar `/admin/` pela primeira vez (sem nenhuma conta ainda cadastrada), o próprio site oferece a tela "Criar primeira conta" — a pessoa escolhe usuário e senha ali mesmo, no navegador dela. As senhas ficam com hash (scrypt) no Netlify Blobs, nunca em texto puro. Depois da primeira conta, novas contas são criadas de dentro do painel (aba "Usuários"), por quem já tem acesso.

## Limites de upload (plano gratuito)

- Imagens: até **3 MB** por arquivo (jpg, png, webp, gif)
- Documentos: até **5 MB** por arquivo (pdf, doc, docx, xls, xlsx, ppt, pptx)
- Máximo de **4 anexos** por publicação

## Desenvolvimento local

```bash
npm install
npx netlify dev
```

Isso sobe o site com as Functions e o Netlify Blobs emulado localmente em `http://localhost:8888`.

## Publicação de conteúdo

Acesse `/admin/`, entre com seu usuário e senha e clique em "Nova publicação". O editor permite colar texto formatado (Ctrl+C/Ctrl+V do Word, por exemplo), inserir imagens no corpo do texto e anexar imagens/documentos ao final da publicação.
