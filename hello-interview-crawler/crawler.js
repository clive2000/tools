const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

class EnhancedHelloInterviewCrawler {
  constructor(options = {}) {
    this.browser = null;
    this.page = null;
    this.outputDir = options.outputDir || './output';
    this.timeout = options.timeout || 30000;
    this.retries = options.retries || 3;
    this.userAgent = options.userAgent || 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    this.pdfStrategy = options.pdfStrategy || 'enhanced'; // 'basic', 'enhanced', 'clean'
    
    // Authentication options
    this.cookies = options.cookies || []; // Array of cookie objects for authentication
  }

  async init() {
    console.log('🚀 Initializing enhanced browser...');
    this.browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });
    
    this.page = await this.browser.newPage();
    
    // Set user agent and viewport
    await this.page.setViewportSize({ width: 1200, height: 800 });
    
    // Set extra headers to appear more like a real browser
    await this.page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'User-Agent': this.userAgent
    });
    
    // Set up authentication if provided
    await this.setupAuthentication();
    
    // Create output directory
    await this.ensureOutputDir();
  }

  async ensureOutputDir() {
    try {
      await fs.access(this.outputDir);
    } catch {
      await fs.mkdir(this.outputDir, { recursive: true });
    }
  }

  async setupAuthentication() {
    if (this.cookies.length === 0) {
      return; // No authentication configured
    }

    console.log('🔐 Setting up authentication...');
    console.log('📋 Cookies to add:');
    this.cookies.forEach((cookie, index) => {
      console.log(`   ${index + 1}. ${cookie.name} for ${cookie.domain} (${cookie.value?.substring(0, 20)}...)`);
    });

    try {
      // Add cookies to the browser context
      await this.page.context().addCookies(this.cookies);
      console.log(`✅ Successfully added ${this.cookies.length} authentication cookies`);
      
      // Verify cookies were added
      const contextCookies = await this.page.context().cookies();
      console.log(`🔍 Total cookies in context: ${contextCookies.length}`);
      
      // Note: Cookies will only be sent to requests that match their domain
      // The crawler will verify cookie presence after navigating to each page
      
    } catch (error) {
      console.error(`❌ Failed to add cookies: ${error.message}`);
      console.log('📝 Cookie format should be: { name, value, domain, path, httpOnly, secure, sameSite }');
      console.log('💡 Common issues:');
      console.log('   - Domain should start with "." (e.g., ".hellointerview.com")');
      console.log('   - Make sure all required fields are present');
      console.log('   - Check that cookies are not expired');
      throw error;
    }
  }

  async crawlPage(url, retryCount = 0, index = null) {
    try {
      console.log(`📄 Crawling: ${url} (attempt ${retryCount + 1})`);
      
      // Show authentication status
      if (this.cookies.length > 0) {
        console.log(`🔐 Using authentication: ${this.cookies.length} cookies`);
      }
      
      // Navigate to the page with retry logic
      await this.page.goto(url, { 
        waitUntil: 'networkidle',
        timeout: this.timeout 
      });
      
      // Check if cookies are being sent (debug info)
      if (this.cookies.length > 0) {
        const pageCookies = await this.page.context().cookies(url);
        console.log(`🍪 Cookies for ${url}: ${pageCookies.length} found`);
        if (pageCookies.length > 0) {
          pageCookies.forEach(cookie => {
            console.log(`   - ${cookie.name}: ${cookie.value.substring(0, 20)}... (domain: ${cookie.domain})`);
          });
        } else {
          console.log(`⚠️  No cookies found for this URL - this might indicate a domain mismatch`);
          console.log(`💡 Make sure your cookie domains match the target site (e.g., .hellointerview.com)`);
        }
      }
      
      // Wait for content to load
      await this.waitForContent();
      
      // Extract comprehensive page information
      const pageInfo = await this.extractPageInfo();
      
      // Log debug information
      console.log(`🔍 Debug Info:`);
      console.log(`  - Used Selector: ${pageInfo.debug.usedSelector}`);
      console.log(`  - Content Length: ${pageInfo.debug.contentLength} characters`);
      console.log(`  - Markdown Found: ${pageInfo.debug.markdownFound}`);
      console.log(`  - Markdown Length: ${pageInfo.debug.markdownLength} characters`);
      console.log(`  - Content Preview: ${pageInfo.content.substring(0, 200)}...`);
      
      // Generate PDF
      const pdfPath = await this.generatePDF(url, pageInfo, index);
      
      // For enhanced strategy, get the updated content after DOM manipulation
      let finalPageInfo = pageInfo;
      if (this.pdfStrategy === 'enhanced') {
        const updatedContent = await this.page.evaluate(() => {
          const markdownElement = document.querySelector('#markdown');
          if (markdownElement) {
            return markdownElement.innerText.trim();
          }
          return document.body.innerText.trim();
        });
        
        finalPageInfo = {
          ...pageInfo,
          content: updatedContent,
          metadata: {
            ...pageInfo.metadata,
            readingTime: Math.ceil(updatedContent.split(/\s+/).length / 200)
          }
        };
      }
      
      // Save content as text file for reference
      const textPath = await this.saveTextContent(url, finalPageInfo, index);
      
      console.log(`✅ Successfully processed: ${url}`);
      console.log(`📄 PDF saved to: ${pdfPath}`);
      console.log(`📝 Text saved to: ${textPath}`);
      
      return {
        url,
        title: pageInfo.title,
        pdfPath,
        textPath,
        content: pageInfo.content,
        metadata: pageInfo.metadata
      };
      
    } catch (error) {
      console.error(`❌ Error crawling ${url} (attempt ${retryCount + 1}):`, error.message);
      
      if (retryCount < this.retries - 1) {
        console.log(`🔄 Retrying... (${retryCount + 2}/${this.retries})`);
        await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1))); // Exponential backoff
        return this.crawlPage(url, retryCount + 1, index);
      }
      
      throw error;
    }
  }

  async waitForContent() {
    // First, try to find the #markdown div specifically
    try {
      await this.page.waitForSelector('#markdown', { timeout: 5000 });
      console.log(`✅ Found #markdown div - using this for content`);
      
      // Expand any accordion sections
      await this.expandAccordions();
      return;
    } catch (e) {
      console.log(`❌ #markdown div not found, trying other selectors`);
    }
    
    // Fallback to other selectors
    const selectors = [
      'main',
      '.main-content',
      'article',
      '.content',
      '.post-content',
      '.article-content',
      '[role="main"]',
      '.prose',
      '.markdown-body'
    ];
    
    for (const selector of selectors) {
      try {
        await this.page.waitForSelector(selector, { timeout: 5000 });
        console.log(`✅ Found content with selector: ${selector}`);
        
        // Expand any accordion sections
        await this.expandAccordions();
        return;
      } catch (e) {
        // Continue to next selector
      }
    }
    
    // Debug: log available selectors and inspect the page structure
    const pageInfo = await this.page.evaluate(() => {
      const selectors = ['#markdown', 'main', '.main-content', 'article', '.content', '.post-content', '.article-content', '[role="main"]', '.prose', '.markdown-body'];
      const found = selectors.filter(selector => document.querySelector(selector));
      
      // Also look for any divs with 'markdown' in their class name
      const allDivs = Array.from(document.querySelectorAll('div'));
      const markdownDivs = allDivs.filter(div => 
        div.className && div.className.toLowerCase().includes('markdown')
      );
      
      return {
        foundSelectors: found,
        markdownDivs: markdownDivs.map(div => ({
          className: div.className,
          textLength: div.innerText.trim().length
        }))
      };
    });
    
    console.log(`🔍 Available selectors: ${pageInfo.foundSelectors.join(', ')}`);
    if (pageInfo.markdownDivs.length > 0) {
      console.log(`🔍 Found divs with 'markdown' in class:`, pageInfo.markdownDivs);
    }
    
    // If no specific selector found, wait for body content
    await this.page.waitForFunction(() => {
      return document.body.innerText.length > 100;
    }, { timeout: 10000 });
    
    // Expand any accordion sections as a final step
    await this.expandAccordions();
  }

  async extractPageInfo() {
    const pageInfo = await this.page.evaluate(() => {
      // Helper function to clean text
      const cleanText = (text) => {
        return text.replace(/\s+/g, ' ').trim();
      };
      
      // Extract title
      const title = document.title || '';
      
      // Try to find the main content - prioritize .markdown div
      let mainContent = null;
      let usedSelector = null;
      // First, try to find the #markdown div specifically
      const markdownElement = document.querySelector('#markdown');
      if (markdownElement && markdownElement.innerText.trim().length > 100) {
        mainContent = markdownElement;
        usedSelector = '#markdown';
      } else {
        // Fallback to other selectors
        const contentSelectors = [
          'main',
          '.main-content',
          'article',
          '.content',
          '.post-content',
          '.article-content',
          '[role="main"]',
          '.prose',
          '.markdown-body'
        ];
        
        for (const selector of contentSelectors) {
          const element = document.querySelector(selector);
          if (element && element.innerText.trim().length > 100) {
            mainContent = element;
            usedSelector = selector;
            break;
          }
        }
      }
      
      // If no main content found, use body but remove navigation elements
      if (!mainContent) {
        // Clone body to avoid modifying the original
        const bodyClone = document.body.cloneNode(true);
        
              // Remove navigation and other non-content elements
      const elementsToRemove = bodyClone.querySelectorAll(
        'nav, header, footer, .nav, .header, .footer, .sidebar, .menu, .navigation, .breadcrumb, .pagination, .comments, .comment, .comment-section, .comment-thread, .comment-list, .comment-form, .comments-container, .advertisement, .ads, .discussion, .forum, .chat, .chat-box, .chat-widget'
      );
        elementsToRemove.forEach(el => el.remove());
        
        mainContent = bodyClone;
      }
      
      // Extract text content
      let content = cleanText(mainContent.innerText);
      
      // Remove comment sections from text content
      const commentPatterns = [
        /Login to track your progress.*$/s,
        /Not sure where your gaps are\?.*$/s,
        /Schedule a mock interview.*$/s,
        /Login to Join the Discussion.*$/s,
        /Your account is free.*$/s,
        /Sort By.*$/s,
        /Questions.*$/s,
        /Learn.*$/s,
        /Links.*$/s,
        /Legal.*$/s,
        /Contact.*$/s,
        /©.*$/s,
        /All rights reserved.*$/s
      ];
      
      commentPatterns.forEach(pattern => {
        content = content.replace(pattern, '');
      });
      
      // Clean up any extra whitespace
      content = content.replace(/\s+/g, ' ').trim();
      
      // Extract metadata
      const metadata = {
        description: '',
        keywords: '',
        author: '',
        publishedDate: '',
        readingTime: ''
      };
      
      // Get meta description
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metadata.description = metaDesc.getAttribute('content') || '';
      
      // Get meta keywords
      const metaKeywords = document.querySelector('meta[name="keywords"]');
      if (metaKeywords) metadata.keywords = metaKeywords.getAttribute('content') || '';
      
      // Get author
      const metaAuthor = document.querySelector('meta[name="author"]');
      if (metaAuthor) metadata.author = metaAuthor.getAttribute('content') || '';
      
      // Estimate reading time (average 200 words per minute)
      const wordCount = content.split(/\s+/).length;
      metadata.readingTime = Math.ceil(wordCount / 200);
      
      // Return debug info along with content
      return {
        title: cleanText(title),
        content,
        metadata,
        url: window.location.href,
        debug: {
          usedSelector,
          contentLength: content.length,
          markdownFound: !!document.querySelector('#markdown'),
          markdownLength: document.querySelector('#markdown') ? document.querySelector('#markdown').innerText.trim().length : 0
        }
      };
    });
    
    return pageInfo;
  }

  async generatePDF(url, pageInfo, index = null) {
    const urlObj = new URL(url);
    const pathSegments = urlObj.pathname.split('/').filter(Boolean);
    const filename = pathSegments.length > 0 ? pathSegments.join('-') : 'page';
    const safeFilename = filename.replace(/[^a-zA-Z0-9-]/g, '-');
    const timestamp = new Date().toISOString().split('T')[0];
    
    // Add index prefix if provided (for navigation crawling)
    const indexPrefix = index !== null ? `${index}-` : '';
    const pdfPath = path.join(this.outputDir, `${indexPrefix}${safeFilename}-${timestamp}.pdf`);
    
    if (this.pdfStrategy === 'clean') {
      return await this.generateCleanPDF(pdfPath, pageInfo);
    } else if (this.pdfStrategy === 'basic') {
      return await this.generateBasicPDF(pdfPath, pageInfo);
    } else {
      return await this.generateEnhancedPDF(pdfPath, pageInfo);
    }
  }

  async generateBasicPDF(pdfPath, pageInfo) {
    // Simple PDF generation with minimal styling
    await this.page.pdf({
      path: pdfPath,
      format: 'Letter',
      printBackground: true,
      margin: {
        top: '1in',
        right: '0.75in',
        bottom: '0.75in',
        left: '0.75in'
      }
    });
    
    return pdfPath;
  }

  async generateEnhancedPDF(pdfPath, pageInfo) {
    // Create a print-friendly version of the page
    await this.page.evaluate((pageInfo) => {
      // Remove elements that shouldn't be in the PDF
      const elementsToRemove = document.querySelectorAll(
        'nav, .nav, .navigation, .sidebar, .menu, .breadcrumb, .pagination, .comments, .comment, .comment-section, .comment-thread, .comment-list, .comment-form, .comments-container, .advertisement, .ads, .social-share, .related-posts, footer, .footer, .discussion, .forum, .chat, .chat-box, .chat-widget'
      );
      elementsToRemove.forEach(el => el.remove());
      
      // If we have markdown content, replace the body with just the markdown content
      if (pageInfo.debug.markdownFound && pageInfo.debug.markdownLength > 1000) {
        const markdownElement = document.querySelector('#markdown');
        if (markdownElement) {
          // Clear the body and add only the markdown content
          document.body.innerHTML = '';
          const newContent = document.createElement('div');
          newContent.innerHTML = markdownElement.innerHTML;
          newContent.id = 'markdown';
          document.body.appendChild(newContent);
        }
      }
      
      // Add print-friendly styling
      const style = document.createElement('style');
      style.textContent = `
        @media print {
          * {
            box-sizing: border-box;
          }
          
          body {
            margin: 0 !important;
            padding: 0.15in 0 0 0 !important;
            font-family: 'Times New Roman', serif !important;
            font-size: 12pt !important;
            line-height: 1.4 !important;
            color: #000 !important;
            background: white !important;
          }
          
          /* Remove the problematic body::before spacing */
          body::before {
            display: none !important;
          }
          
          /* Style main content with minimal top padding */
          #markdown, main, article, .content, .main-content, [role="main"] {
            padding: 0.1in !important;
            margin: 0 !important;
            max-width: none !important;
            width: 100% !important;
          }
          
          /* Ensure first element doesn't have excessive top margin */
          #markdown > *:first-child,
          main > *:first-child,
          article > *:first-child,
          .content > *:first-child {
            margin-top: 0 !important;
            padding-top: 0 !important;
          }
          
          /* Ensure headings are properly spaced and keep original colors */
          h1, h2, h3, h4, h5, h6 {
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
            margin-top: 0.15in !important;
            margin-bottom: 0.1in !important;
            font-weight: bold !important;
            /* Don't override heading colors - let them keep original styling */
          }
          
          /* First heading should not have top margin */
          h1:first-child, h2:first-child, h3:first-child, h4:first-child, h5:first-child, h6:first-child {
            margin-top: 0 !important;
          }
          
          h1 { font-size: 18pt !important; }
          h2 { font-size: 16pt !important; }
          h3 { font-size: 14pt !important; }
          h4, h5, h6 { font-size: 12pt !important; }
          
          /* Style paragraphs and text - ensure black color for normal text */
          p, div, section, span, li {
            page-break-inside: avoid !important;
            orphans: 3 !important;
            widows: 3 !important;
            margin-bottom: 0.1in !important;
            color: #000 !important; /* Force black for normal text */
          }
          
          /* Specific text elements that should be black */
          p, div:not(h1):not(h2):not(h3):not(h4):not(h5):not(h6), 
          span:not(h1 *):not(h2 *):not(h3 *):not(h4 *):not(h5 *):not(h6 *), 
          td, th, blockquote, pre, code {
            color: #000 !important;
          }
          
          /* First paragraph should not have top margin */
          p:first-child {
            margin-top: 0 !important;
          }
          
          /* Style lists */
          ul, ol {
            margin-left: 0.3in !important;
            margin-bottom: 0.1in !important;
            color: #000 !important;
          }
          
          li {
            page-break-inside: avoid !important;
            margin-bottom: 0.05in !important;
            color: #000 !important; /* Ensure list items are black */
          }
          
          /* Style links - keep black for consistency with text */
          a {
            color: #000 !important;
            text-decoration: underline !important;
          }
          
          /* Code block styling - ensure proper wrapping */
          pre, code {
            color: #000 !important;
            font-family: 'Courier New', Consolas, Monaco, monospace !important;
            background-color: #f5f5f5 !important;
            border: 1px solid #ddd !important;
            border-radius: 4px !important;
            overflow-wrap: break-word !important;
            word-wrap: break-word !important;
            word-break: break-all !important;
            white-space: pre-wrap !important;
          }
          
          /* Inline code styling */
          code {
            padding: 2px 4px !important;
            font-size: 11pt !important;
            display: inline !important;
          }
          
          /* Code block (pre) styling */
          pre {
            padding: 8px 12px !important;
            margin: 0.1in 0 !important;
            font-size: 10pt !important;
            line-height: 1.3 !important;
            page-break-inside: avoid !important;
            max-width: 100% !important;
            overflow: hidden !important;
          }
          
          /* Code inside pre blocks */
          pre code {
            background: none !important;
            border: none !important;
            padding: 0 !important;
            font-size: inherit !important;
            white-space: inherit !important;
          }
          
          /* Tables - ensure they don't overflow */
          table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin: 0.1in 0 !important;
            page-break-inside: avoid !important;
            font-size: 11pt !important;
          }
          
          td, th {
            border: 1px solid #ddd !important;
            padding: 4px 8px !important;
            text-align: left !important;
            vertical-align: top !important;
            word-wrap: break-word !important;
            overflow-wrap: break-word !important;
          }
          
          th {
            background-color: #f5f5f5 !important;
            font-weight: bold !important;
          }
          
          /* Blockquotes */
          blockquote {
            margin: 0.1in 0 0.1in 0.3in !important;
            padding: 0.1in !important;
            border-left: 3px solid #ddd !important;
            background-color: #f9f9f9 !important;
            font-style: italic !important;
            color: #000 !important;
          }
          
          /* Hide non-essential elements */
          .hidden, .sr-only, [aria-hidden="true"] {
            display: none !important;
          }
          
          /* Ensure proper page breaks */
          .page-break {
            page-break-before: always !important;
          }
          
          /* Remove any fixed positioning */
          * {
            position: static !important;
          }
        }
      `;
      document.head.appendChild(style);
    }, pageInfo);
    
    // Wait a moment for styles to apply
    await this.page.waitForTimeout(1000);
    
    // Generate PDF with improved settings and reduced top margin
    await this.page.pdf({
      path: pdfPath,
      format: 'Letter',
      printBackground: true,
      margin: {
        top: '0.5in',
        right: '0.3in',
        bottom: '0.75in',
        left: '0.7in'
      },
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="font-size: 10px; padding: 5px; text-align: center; width: 100%; border-bottom: 1px solid #ccc;">
          <span style="font-weight: bold;">${pageInfo.title}</span>
        </div>
      `,
      footerTemplate: `
        <div style="font-size: 9px; padding: 5px; text-align: center; width: 100%; border-top: 1px solid #ccc;">
          <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span> | ${new Date().toLocaleDateString()}</span>
        </div>
      `,
      preferCSSPageSize: true
    });
    
    return pdfPath;
  }

  async generateCleanPDF(pdfPath, pageInfo) {
    // Create a completely clean HTML document for PDF generation
    const cleanHTML = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${pageInfo.title}</title>
        <style>
          @page {
            size: Letter;
            margin: 1in 0.75in;
          }
          
          body {
            font-family: 'Times New Roman', serif;
            font-size: 12pt;
            line-height: 1.4;
            color: #000;
            background: white;
            margin: 0;
            padding: 0;
          }
          
          .header {
            text-align: center;
            font-size: 18pt;
            font-weight: bold;
            margin-bottom: 0.5in;
            padding-bottom: 0.2in;
            border-bottom: 2px solid #333;
          }
          
          .metadata {
            font-size: 10pt;
            color: #666;
            margin-bottom: 0.3in;
            padding: 0.2in;
            background: #f9f9f9;
            border-left: 3px solid #333;
          }
          
          .content {
            text-align: justify;
          }
          
          h1, h2, h3, h4, h5, h6 {
            page-break-after: avoid;
            page-break-inside: avoid;
            margin-top: 0.3in;
            margin-bottom: 0.2in;
            font-weight: bold;
          }
          
          h1 { font-size: 16pt; }
          h2 { font-size: 14pt; }
          h3 { font-size: 13pt; }
          h4, h5, h6 { font-size: 12pt; }
          
          p {
            margin-bottom: 0.1in;
            text-indent: 0.2in;
          }
          
          ul, ol {
            margin-left: 0.3in;
            margin-bottom: 0.1in;
          }
          
          li {
            margin-bottom: 0.05in;
          }
          
          a {
            color: #000;
            text-decoration: underline;
          }
          
          .page-break {
            page-break-before: always;
          }
          
          @media print {
            body {
              margin: 0;
              padding: 0;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">${pageInfo.title}</div>
        
        <div class="metadata">
          <strong>Source:</strong> ${pageInfo.url}<br>
          <strong>Date:</strong> ${new Date().toLocaleDateString()}<br>
          <strong>Reading Time:</strong> ${pageInfo.metadata.readingTime} minutes<br>
          ${pageInfo.metadata.description ? `<strong>Description:</strong> ${pageInfo.metadata.description}<br>` : ''}
          ${pageInfo.metadata.author ? `<strong>Author:</strong> ${pageInfo.metadata.author}<br>` : ''}
        </div>
        
        <div class="content">
          ${this.formatContentForPDF(pageInfo.content)}
        </div>
      </body>
      </html>
    `;
    
    // Create a new page with the clean HTML
    const newPage = await this.browser.newPage();
    await newPage.setContent(cleanHTML);
    
    // Generate PDF
    await newPage.pdf({
      path: pdfPath,
      format: 'Letter',
      printBackground: true,
      margin: {
        top: '0.5in',
        right: '0.2in',
        bottom: '0.5in',
        left: '5in'
      },
      displayHeaderFooter: false
    });
    
    await newPage.close();
    return pdfPath;
  }

  formatContentForPDF(content) {
    // Simple formatting to make content more readable in PDF
    return content
      .replace(/\n\n+/g, '</p><p>') // Convert double line breaks to paragraphs
      .replace(/^/, '<p>') // Start with paragraph
      .replace(/$/, '</p>') // End with paragraph
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold text
      .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic text
      .replace(/^# (.*$)/gm, '<h1>$1</h1>') // H1 headers
      .replace(/^## (.*$)/gm, '<h2>$1</h2>') // H2 headers
      .replace(/^### (.*$)/gm, '<h3>$1</h3>') // H3 headers
      .replace(/^- (.*$)/gm, '<li>$1</li>') // List items
      .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>'); // Wrap lists
  }

  async saveTextContent(url, pageInfo, index = null) {
    const urlObj = new URL(url);
    const pathSegments = urlObj.pathname.split('/').filter(Boolean);
    const filename = pathSegments.length > 0 ? pathSegments.join('-') : 'page';
    const safeFilename = filename.replace(/[^a-zA-Z0-9-]/g, '-');
    const timestamp = new Date().toISOString().split('T')[0];
    
    // Add index prefix if provided (for navigation crawling)
    const indexPrefix = index !== null ? `${index}-` : '';
    const textPath = path.join(this.outputDir, `${indexPrefix}${safeFilename}-${timestamp}.txt`);
    
    const textContent = `Title: ${pageInfo.title}
URL: ${pageInfo.url}
Date: ${new Date().toLocaleDateString()}
Reading Time: ${pageInfo.metadata.readingTime} minutes

${pageInfo.metadata.description ? `Description: ${pageInfo.metadata.description}\n\n` : ''}
${pageInfo.metadata.author ? `Author: ${pageInfo.metadata.author}\n\n` : ''}
${'='.repeat(80)}

${pageInfo.content}
`;
    
    await fs.writeFile(textPath, textContent, 'utf8');
    return textPath;
  }

  async crawlMultiplePages(urls, startIndex = 1) {
    const results = [];
    
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const pageIndex = startIndex + i; // Start from startIndex (default 1)
      console.log(`\n📚 Processing page ${i + 1}/${urls.length} (index: ${pageIndex})`);
      
      try {
        const result = await this.crawlPage(url, 0, pageIndex); // Pass index 0 for retryCount, pageIndex for filename
        results.push(result);
        
        // Add delay between requests to be respectful
        if (i < urls.length - 1) {
          console.log('⏳ Waiting 2 seconds before next request...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error) {
        console.error(`Failed to crawl ${url}:`, error.message);
        results.push({ url, error: error.message });
      }
    }
    
    return results;
  }

  async extractNavigationLinks(baseUrl) {
    try {
      console.log(`🔍 Extracting navigation links from: ${baseUrl}`);
      
      // Navigate to the base page to get the navigation
      await this.page.goto(baseUrl, { 
        waitUntil: 'networkidle',
        timeout: this.timeout 
      });
      
      // Wait for the navigation drawer to load
      await this.page.waitForSelector('.MuiDrawer-root.MuiDrawer-anchorLeft.MuiDrawer-docked.min-h-screen', { timeout: 10000 });
      
      // Extract all links from the navigation drawer
      const links = await this.page.evaluate(() => {
        const drawer = document.querySelector('.MuiDrawer-root.MuiDrawer-anchorLeft.MuiDrawer-docked.min-h-screen');
        if (!drawer) {
          return [];
        }
        
        const anchors = drawer.querySelectorAll('a[href]');
        const linkData = [];
        
        anchors.forEach(anchor => {
          const href = anchor.getAttribute('href');
          const text = anchor.textContent?.trim() || '';
          
          // Filter out non-content links and only include /learn paths
          if (href && 
              href.startsWith('/learn') && 
              !href.includes('/_next/') && 
              !href.includes('/api/') &&
              text &&
              text !== 'Back to Main' &&
              !text.includes('Hello Interview')) {
            
            linkData.push({
              href: href,
              text: text,
              fullUrl: new URL(href, window.location.origin).href
            });
          }
        });
        
        return linkData;
      });
      
      // Remove duplicates based on href
      const uniqueLinks = links.filter((link, index, self) => 
        index === self.findIndex(l => l.href === link.href)
      );
      
      console.log(`📋 Found ${uniqueLinks.length} unique navigation links:`);
      uniqueLinks.forEach((link, index) => {
        console.log(`  ${index + 1}. ${link.text} → ${link.href}`);
      });
      
      return uniqueLinks;
      
    } catch (error) {
      console.error(`❌ Error extracting navigation links:`, error.message);
      throw error;
    }
  }

  async crawlFromNavigation(baseUrl, options = {}) {
    const { maxPages = null, filterPattern = null, startIndex = 1 } = options;
    
    try {
      // Extract navigation links
      const navigationLinks = await this.extractNavigationLinks(baseUrl);
      
      if (navigationLinks.length === 0) {
        console.log('⚠️  No navigation links found');
        return [];
      }
      
      // Filter links if pattern provided
      let linksToProcess = navigationLinks;
      if (filterPattern) {
        const regex = new RegExp(filterPattern, 'i');
        linksToProcess = navigationLinks.filter(link => 
          regex.test(link.text) || regex.test(link.href)
        );
        console.log(`🔍 Filtered to ${linksToProcess.length} links matching pattern: ${filterPattern}`);
      }
      
      // Apply start index (skip first startIndex - 1 items)
      if (startIndex && startIndex > 1) {
        if (startIndex > linksToProcess.length) {
          console.log(`❌ Start index ${startIndex} is greater than available links (${linksToProcess.length})`);
          return [];
        }
        linksToProcess = linksToProcess.slice(startIndex - 1);
        console.log(`📍 Starting from index ${startIndex}, ${linksToProcess.length} links remaining`);
      }
      
      // Limit number of pages if specified
      if (maxPages && linksToProcess.length > maxPages) {
        linksToProcess = linksToProcess.slice(0, maxPages);
        console.log(`📊 Limited to first ${maxPages} pages from starting index`);
      }
      
      const urls = linksToProcess.map(link => link.fullUrl);
      
      console.log(`\n🚀 Starting to crawl ${urls.length} pages from navigation...`);
      
      // Use existing crawlMultiplePages method with correct start index for file naming
      const fileStartIndex = startIndex || 1;
      return await this.crawlMultiplePages(urls, fileStartIndex);
      
    } catch (error) {
      console.error(`❌ Error crawling from navigation:`, error.message);
      throw error;
    }
  }

  async expandAccordions() {
    try {
      // Find accordion summary buttons using multiple possible selectors
      const accordionSelectors = [
        '.MuiAccordionSummary-root',
        '[role="button"][aria-expanded]',
        '.accordion-header',
        '.collapse-header',
        '[data-toggle="collapse"]'
      ];
      
      let allAccordionButtons = [];
      
      for (const selector of accordionSelectors) {
        const buttons = await this.page.$$(selector);
        if (buttons.length > 0) {
          console.log(`🔍 Found ${buttons.length} potential accordions with selector: ${selector}`);
          allAccordionButtons.push(...buttons);
        }
      }
      
             // Use Set to automatically handle uniqueness, then convert back to array
       // Since we're collecting from different selectors, there might be overlaps
       // but element handles should be unique references
       const uniqueButtons = allAccordionButtons;
      
      if (uniqueButtons.length > 0) {
        console.log(`🔽 Found ${uniqueButtons.length} unique accordion sections to expand`);
        
        for (let i = 0; i < uniqueButtons.length; i++) {
          try {
            // Check if the accordion is already expanded
            const accordionInfo = await uniqueButtons[i].evaluate(button => {
              const ariaExpanded = button.getAttribute('aria-expanded');
              const text = button.textContent?.trim() || '';
              const classes = button.className || '';
              
              return {
                isExpanded: ariaExpanded === 'true',
                text: text.substring(0, 50), // First 50 chars for logging
                classes: classes,
                tagName: button.tagName
              };
            });
            
            console.log(`   🔍 Accordion ${i + 1}: "${accordionInfo.text}" (${accordionInfo.tagName}) - Expanded: ${accordionInfo.isExpanded}`);
            
            if (!accordionInfo.isExpanded) {
              console.log(`   📂 Expanding accordion ${i + 1}/${uniqueButtons.length}`);
              
              // Scroll the element into view first
              await uniqueButtons[i].scrollIntoViewIfNeeded();
              
              // Click the accordion button
              await uniqueButtons[i].click();
              
              // Wait a bit for the content to expand
              await new Promise(resolve => setTimeout(resolve, 800));
            } else {
              console.log(`   ✅ Accordion ${i + 1}/${uniqueButtons.length} already expanded`);
            }
          } catch (clickError) {
            console.log(`   ⚠️  Could not expand accordion ${i + 1}: ${clickError.message}`);
          }
        }
        
        // Wait a bit more for all content to be fully loaded
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log(`✅ Finished expanding ${uniqueButtons.length} accordions`);
      } else {
        console.log(`ℹ️  No accordion sections found on this page`);
      }
    } catch (error) {
      console.log(`⚠️  Error expanding accordions: ${error.message}`);
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      console.log('🔒 Browser closed');
    }
  }
}

module.exports = EnhancedHelloInterviewCrawler; 