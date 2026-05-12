<div align="center">
  <img src="public/icon-512.png" alt="noted logo" width="120" />
  
  # 📝 noted.
  **notes for programmers, everywhere.**

  [![Next.js](https://img.shields.io/badge/Next.js_16-black?style=flat-square&logo=next.js)](https://nextjs.org/)
  [![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_v4-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
  [![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com/)

  [Live Demo](https://noted-dev-app.vercel.app/) • [Report a Bug](https://github.com/fernandohalim/noted/issues)

</div>

## 👋 what is noted?

**noted.** is a minimalist, fast, and reliable markdown note-taking app built for programmers. organize your thoughts with a nested file tree, write in a beautiful markdown editor, and sync everything securely to the cloud. completely installable on any device as a progressive web app (pwa).

## ✨ features

* 📝 **markdown first:** beautiful, fast markdown editing with syntax highlighting powered by codemirror.
* ☁️ **cloud sync:** seamlessly and securely synced across all your devices using supabase.
* 📱 **pwa ready:** install noted as a native-feeling app on your desktop or android/ios device for quick access.
* 🗂️ **file system:** organize your thoughts intuitively with a drag-and-drop nested file tree structure.
* 📦 **export anything:** export your markdown notes as beautiful images or download your entire workspace as a `.zip` file.
* 🔒 **secure & authenticated:** simple, fast sign-in with google, github, or email.

## 🛠️ tech stack

* **framework:** [Next.js 16](https://nextjs.org/) (App Router)
* **library:** [React 19](https://react.dev/)
* **styling:** [TailwindCSS v4](https://tailwindcss.com/)
* **database & auth:** [Supabase](https://supabase.com/)
* **editor:** [CodeMirror 6](https://codemirror.net/)
* **utilities:** html-to-image, jszip, lucide-react

## 🚀 getting started

```bash
# clone the repository
git clone [https://github.com/fernandohalim/noted.git](https://github.com/fernandohalim/noted.git)

# jump into the directory
cd noted

# install the dependencies
npm install

# add your supabase keys to .env.local
# NEXT_PUBLIC_SUPABASE_URL=...
# NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# start the local development server
npm run dev
```