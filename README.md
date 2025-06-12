# Personal Resume

A modern, minimal resume site built with [Zola](https://getzola.org/).

## Quick Start

1. Install Zola
2. Clone and serve:
   ```bash
   git clone <repo-url>
   cd zola-resume
   zola serve
   ```
3. Visit http://127.0.0.1:1111

## Build

```bash
zola build
```

Output goes to `/public` folder.

## Customization

Edit the HTML files in `templates/partials/` to update your resume content:
- `header.html` - Name, title, contact info
- `experience.html` - Work history 
- `education.html` - Education background
- `skills.html` - Technical skills
- `projects.html` - Featured projects

## Deploy (Cloudflare Pages)

You can deploy your Zola-generated static site directly to Cloudflare Pages for fast, reliable, and free hosting with custom domain support.

### Prerequisites

1. **Cloudflare Account**
2. **Zola** static site generator installed (`zola build`)
3. A repository for your resume site on GitHub

### Build & Deploy

#### 1. Build the Site (Locally, Optional)

```bash
zola build
```

This will generate the static site in the `public/` directory.  
Cloudflare Pages can also run this build step for you automatically.

#### 2. Connect to Cloudflare Pages

- Go to [Cloudflare Pages](https://pages.cloudflare.com/).
- Click **Create a Project** and connect your GitHub account.
- Select your repository.
- For **Framework preset**, choose "None" (for Zola).
- For **Build command**, enter: `zola build`
- For **Output directory**, enter: `public`
- Click **Save and Deploy**.

#### 3. Set Up Custom Domain

- In your Cloudflare Pages project, go to **Custom Domains**.
- Add your custom domain (e.g., `jonathan.vercout.re`).
- Follow the instructions to add the required DNS record(s) in your Cloudflare DNS dashboard.

Your site will be available at your Cloudflare Pages URL (e.g., `your-site.pages.dev`) and your custom domain if configured.

### Tips

- To use a custom domain, set the `base_url` in your `config.toml` to match your domain.
- For clean URLs, Zola generates them by default (no `.html` in links).
- If you need advanced redirects or headers, add a `_redirects` or `_headers` file to your project root.

### Resources

- [Zola Documentation](https://www.getzola.org/documentation/)
- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)

---
*This guide replaces the previous GitHub Pages setup. For most static sites, Cloudflare Pages is simple, fast, and offers excellent custom domain support.*