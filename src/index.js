/**
 * Cloudflare Worker for Zola Resume Site
 * Handles routing, security headers, clean URLs, and analytics
 */

// Configuration
const CONFIG = {
  // Cache settings
  CACHE_TTL: {
    html: 3600,        // 1 hour for HTML
    assets: 31536000,  // 1 year for static assets
    api: 300          // 5 minutes for API responses
  },
  
  // Security headers
  SECURITY_HEADERS: {
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
  },

  // Clean URL mappings
  CLEAN_URLS: {
    '/resume': '/resume.html',
    '/contact': '/contact.html',
    '/projects': '/projects.html',
    '/blog': '/blog.html'
  },

  // Redirect mappings
  REDIRECTS: {
    '/cv': '/resume',
    '/portfolio': '/projects',
    '/linkedin': 'https://linkedin.com/in/jonathan-vercoutre',
    '/github': 'https://github.com/jvercoutre'
  }
};

// Main event listener
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

// Scheduled event listener for analytics
addEventListener('scheduled', event => {
  event.waitUntil(handleScheduled(event));
});

/**
 * Main request handler
 * @param {Request} request - The incoming request
 * @returns {Promise<Response>} The response
 */
async function handleRequest(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  try {
    // Handle health check
    if (pathname === '/health') {
      return new Response(JSON.stringify({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Handle redirects
    if (CONFIG.REDIRECTS[pathname]) {
      const redirectUrl = CONFIG.REDIRECTS[pathname];
      const isExternal = redirectUrl.startsWith('http');
      
      return Response.redirect(
        isExternal ? redirectUrl : `${url.origin}${redirectUrl}`,
        301
      );
    }

    // Handle API endpoints
    if (pathname.startsWith('/api/')) {
      return handleApi(request);
    }

    // Track analytics (fire and forget)
    trackPageView(request).catch(console.error);

    // Get the response from origin
    let response = await getOriginResponse(request);

    // Apply transformations
    response = await applyTransformations(request, response);

    return response;

  } catch (error) {
    console.error('Worker error:', error);
    return new Response('Internal Server Error', { 
      status: 500,
      headers: CONFIG.SECURITY_HEADERS
    });
  }
}

/**
 * Get response from origin with clean URL handling
 * @param {Request} request - The incoming request
 * @returns {Promise<Response>} The origin response
 */
async function getOriginResponse(request) {
  const url = new URL(request.url);
  let pathname = url.pathname;

  // Handle root
  if (pathname === '/') {
    pathname = '/index.html';
  }
  
  // Handle clean URLs
  if (CONFIG.CLEAN_URLS[pathname]) {
    pathname = CONFIG.CLEAN_URLS[pathname];
  }
  
  // Try to serve clean URLs (add .html if missing)
  if (!pathname.includes('.') && !pathname.endsWith('/')) {
    const htmlPath = `${pathname}.html`;
    const htmlUrl = new URL(url);
    htmlUrl.pathname = htmlPath;
    
    try {
      const htmlResponse = await fetch(htmlUrl, request);
      if (htmlResponse.ok) {
        return htmlResponse;
      }
    } catch (e) {
      // Fall through to original path
    }
  }

  // Construct the final URL
  const finalUrl = new URL(url);
  finalUrl.pathname = pathname;

  const response = await fetch(finalUrl, request);
  
  // Handle 404s
  if (response.status === 404) {
    try {
      const notFoundUrl = new URL(url);
      notFoundUrl.pathname = '/404.html';
      const notFoundResponse = await fetch(notFoundUrl, request);
      
      if (notFoundResponse.ok) {
        return new Response(notFoundResponse.body, {
          status: 404,
          statusText: 'Not Found',
          headers: notFoundResponse.headers
        });
      }
    } catch (e) {
      // Fall through to default 404
    }
    
    return new Response('Page Not Found', { 
      status: 404,
      headers: { 'Content-Type': 'text/plain' }
    });
  }

  return response;
}

/**
 * Apply transformations to the response
 * @param {Request} request - The original request
 * @param {Response} response - The origin response
 * @returns {Promise<Response>} The transformed response
 */
async function applyTransformations(request, response) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  // Clone response to make it mutable
  const newResponse = new Response(response.body, response);
  
  // Add security headers
  Object.entries(CONFIG.SECURITY_HEADERS).forEach(([key, value]) => {
    newResponse.headers.set(key, value);
  });

  // Set cache headers based on content type
  const contentType = response.headers.get('content-type') || '';
  
  if (contentType.includes('text/html')) {
    newResponse.headers.set('Cache-Control', `public, max-age=${CONFIG.CACHE_TTL.html}`);
  } else if (isStaticAsset(pathname)) {
    newResponse.headers.set('Cache-Control', `public, max-age=${CONFIG.CACHE_TTL.assets}, immutable`);
  }

  // Add custom headers
  newResponse.headers.set('X-Powered-By', 'Cloudflare Workers');
  newResponse.headers.set('X-Resume-Version', '2024.1');

  // Transform HTML content if needed
  if (contentType.includes('text/html') && response.ok) {
    return transformHtml(newResponse);
  }

  return newResponse;
}

/**
 * Transform HTML content
 * @param {Response} response - The HTML response
 * @returns {Promise<Response>} The transformed response
 */
async function transformHtml(response) {
  const html = await response.text();
  
  // Add analytics script or other transformations
  const transformedHtml = html.replace(
    '</head>',
    `  <!-- Injected by Cloudflare Worker -->
  <meta name="generator" content="Zola + Cloudflare Workers">
  <script>
    // Simple analytics
    if ('navigator' in window && 'sendBeacon' in navigator) {
      navigator.sendBeacon('/api/analytics', JSON.stringify({
        url: location.href,
        referrer: document.referrer,
        timestamp: Date.now()
      }));
    }
  </script>
</head>`
  );

  return new Response(transformedHtml, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers
  });
}

/**
 * Handle API endpoints
 * @param {Request} request - The API request
 * @returns {Promise<Response>} The API response
 */
async function handleApi(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': url.origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400'
  };

  // Handle preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    switch (pathname) {
      case '/api/contact':
        return handleContactForm(request, corsHeaders);
      
      case '/api/analytics':
        return handleAnalytics(request, corsHeaders);
      
      case '/api/resume':
        return handleResumeApi(request, corsHeaders);
      
      default:
        return new Response(JSON.stringify({ error: 'Endpoint not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
  } catch (error) {
    console.error('API error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Handle contact form submissions
 * @param {Request} request - The contact request
 * @param {Object} corsHeaders - CORS headers
 * @returns {Promise<Response>} The response
 */
async function handleContactForm(request, corsHeaders) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const formData = await request.json();
  
  // Basic validation
  if (!formData.name || !formData.email || !formData.message) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Store in KV or send email (implement based on your needs)
  // For now, we'll just log and return success
  console.log('Contact form submission:', formData);

  // You could integrate with:
  // - SendGrid for email
  // - KV storage for form submissions
  // - Webhook to external service

  return new Response(JSON.stringify({ 
    success: true, 
    message: 'Thank you for your message!' 
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

/**
 * Handle analytics data
 * @param {Request} request - The analytics request
 * @param {Object} corsHeaders - CORS headers
 * @returns {Promise<Response>} The response
 */
async function handleAnalytics(request, corsHeaders) {
  if (request.method !== 'POST') {
    return new Response(null, { status: 204 });
  }

  try {
    const data = await request.json();
    
    // Store analytics data in KV
    if (typeof ANALYTICS !== 'undefined') {
      const key = `pageview:${Date.now()}:${Math.random()}`;
      await ANALYTICS.put(key, JSON.stringify({
        ...data,
        ip: request.headers.get('CF-Connecting-IP'),
        userAgent: request.headers.get('User-Agent'),
        country: request.cf?.country
      }), { expirationTtl: 86400 * 30 }); // 30 days
    }
  } catch (error) {
    console.error('Analytics error:', error);
  }

  return new Response(null, { 
    status: 204,
    headers: corsHeaders
  });
}

/**
 * Handle resume API endpoint
 * @param {Request} request - The resume request
 * @param {Object} corsHeaders - CORS headers
 * @returns {Promise<Response>} The response
 */
async function handleResumeApi(request, corsHeaders) {
  // Return structured resume data
  const resumeData = {
    name: "Jonathan Vercoutre",
    title: "Senior Site Reliability Engineer",
    location: "Your Location",
    email: "your.email@domain.com",
    website: "https://jonathan.vercout.re",
    summary: "Experienced SRE with expertise in...",
    // Add more structured data as needed
  };

  return new Response(JSON.stringify(resumeData), {
    headers: { 
      ...corsHeaders, 
      'Content-Type': 'application/json',
      'Cache-Control': `public, max-age=${CONFIG.CACHE_TTL.api}`
    }
  });
}

/**
 * Track page views
 * @param {Request} request - The request to track
 */
async function trackPageView(request) {
  // Simple page view tracking
  const url = new URL(request.url);
  
  if (typeof ANALYTICS !== 'undefined') {
    const key = `pageview:${Date.now()}`;
    await ANALYTICS.put(key, JSON.stringify({
      url: url.pathname,
      timestamp: Date.now(),
      referrer: request.headers.get('Referer') || '',
      userAgent: request.headers.get('User-Agent') || '',
      ip: request.headers.get('CF-Connecting-IP'),
      country: request.cf?.country
    }), { expirationTtl: 86400 * 7 }); // 7 days
  }
}

/**
 * Handle scheduled events (daily analytics aggregation)
 * @param {ScheduledEvent} event - The scheduled event
 */
async function handleScheduled(event) {
  // Aggregate daily analytics
  if (typeof ANALYTICS !== 'undefined') {
    const today = new Date().toISOString().split('T')[0];
    
    // Get all pageviews for today
    const list = await ANALYTICS.list({ prefix: 'pageview:' });
    
    // Process and aggregate data
    const stats = {
      date: today,
      totalPageViews: list.keys.length,
      uniqueVisitors: new Set(),
      topPages: {},
      countries: {}
    };

    // This is a simplified aggregation
    // In production, you'd want more sophisticated analytics
    
    console.log('Daily analytics:', stats);
  }
}

/**
 * Check if a path is a static asset
 * @param {string} pathname - The pathname to check
 * @returns {boolean} True if it's a static asset
 */
function isStaticAsset(pathname) {
  const staticExtensions = ['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.woff', '.woff2', '.ttf', '.ico'];
  return staticExtensions.some(ext => pathname.endsWith(ext)) || pathname.startsWith('/static/');
}