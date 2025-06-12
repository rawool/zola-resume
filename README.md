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

## Deploy (GitHub Pages)

You can deploy your Zola-generated static site directly to GitHub Pages for fast, reliable, and free hosting.

### Prerequisites

1. **GitHub Account**
2. **Zola** static site generator installed (`zola build`)
3. A repository for your resume site on GitHub

### Build & Deploy

#### 1. Build the Site

```bash
zola build
```

This will generate the static site in the `public/` directory.

#### 2. Push to GitHub

Commit and push your changes to your repository:

```bash
git add .
git commit -m "Build site for GitHub Pages"
git push origin main
```

#### 3. Configure GitHub Pages

- Go to your repository on GitHub.
- Click **Settings** > **Pages**.
- Under **Source**, select the `main` branch and `/ (root)` or `/public` folder (depending on your setup).
- Save.

Your site will be available at `https://<username>.github.io/<repository>/` or your custom domain if configured.

### Custom Domain (Optional)

1. In **Settings > Pages**, add your custom domain.
2. Update your DNS provider to point your domain to GitHub Pages.
3. GitHub will automatically provision HTTPS.

### Tips

- To use a custom domain, set the `base_url` in your `config.toml` to match your domain.
- For clean URLs, Zola generates them by default (no `.html` in links).
- If you need advanced redirects or headers, consider using a `_headers` or `_redirects` file, or configure via your domain provider.

### Resources

- [Zola Documentation](https://www.getzola.org/documentation/)
- [GitHub Pages Documentation](https://docs.github.com/en/pages)

---
*This guide replaces the previous Cloudflare Worker setup. For most static sites, GitHub Pages is sufficient and much simpler to maintain.*