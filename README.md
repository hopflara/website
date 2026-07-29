# Personal Site

A blank-canvas static website. Just `index.html`, `styles.css`, and `script.js`
— no build tools, no npm. GSAP (with ScrollTrigger and Draggable) is loaded from
a CDN, so powerful animation is ready to use out of the box.

## Preview locally

You have two easy options:

1. **Simplest:** double-click `index.html` to open it in your browser.
2. **Recommended (some things behave better over a real server):** run a tiny
   local server from this folder, then visit the address it prints.
   - If you have Python installed:
     ```
     python3 -m http.server 8000
     ```
     Then open <http://localhost:8000> in your browser.

To check GSAP is working: open the browser's developer console (right-click →
Inspect → Console) and you should see a line like `GSAP loaded: 3.12.5`.

## Push it live (free) with GitHub Pages

1. **Create a repo** on GitHub (e.g. `website`).
2. **Push this folder** to it:
   ```
   git add .
   git commit -m "Initial site"
   git push
   ```
3. On GitHub, go to **Settings → Pages**.
4. Under **Build and deployment**, set **Source** to **Deploy from a branch**,
   pick your branch (usually `main`) and the `/ (root)` folder, then **Save**.
5. Wait a minute, then refresh — GitHub shows the live URL at the top of the
   Pages settings (something like `https://your-username.github.io/website/`).

## Custom domain (optional, later)

When you're ready to use your own domain (e.g. `yourname.com`):

1. Add a file named `CNAME` (no extension) at the root of the repo containing
   only your domain, for example:
   ```
   yourname.com
   ```
2. In your domain registrar's settings, point the domain at GitHub Pages
   (GitHub's Pages docs walk you through the exact DNS records).
3. Commit and push the `CNAME` file. GitHub Pages picks it up automatically.
