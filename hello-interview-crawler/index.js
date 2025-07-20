const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

class HelloInterviewCrawler {
  constructor() {
    this.browser = null;
    this.page = null;
    this.outputDir = './output';
  }

  async init() {
    console.log('🚀 Initializing browser...');
    this.browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    this.page = await this.browser.newPage();
    
    // Set viewport for consistent rendering
    await this.page.setViewportSize({ width: 1200, height: 800 });
    
    // Create output directory if it doesn't exist
    await this.ensureOutputDir();
  }

  async ensureOutputDir() {
    try {
      await fs.access(this.outputDir);
    } catch {
      await fs.mkdir(this.outputDir, { recursive: true });
    }
  }

  async crawlPage(url) {
    try {
      console.log(`📄 Crawling: ${url}`);
      
      // Navigate to the page
      await this.page.goto(url, { waitUntil: 'networkidle' });
      
      // Wait for the main content to load
      await this.page.waitForSelector('main, .main-content, article, .content', { timeout: 10000 });
      
      // Extract page information
      const pageInfo = await this.extractPageInfo();
      
      // Generate PDF
      const pdfPath = await this.generatePDF(url, pageInfo);
      
      console.log(`✅ Successfully processed: ${url}`);
      console.log(`📄 PDF saved to: ${pdfPath}`);
      
      return {
        url,
        title: pageInfo.title,
        pdfPath,
        content: pageInfo.content
      };
      
    } catch (error) {
      console.error(`❌ Error crawling ${url}:`, error.message);
      throw error;
    }
  }

  async extractPageInfo() {
    // Extract title
    const title = await this.page.title();
    
    // Extract main content - try multiple selectors
    const contentSelectors = [
      '#markdown',
      'main',
      '.main-content',
      'article',
      '.content',
      '.post-content',
      '.article-content',
      '[role="main"]'
    ];
    
    let content = '';
    for (const selector of contentSelectors) {
      try {
        const element = await this.page.$(selector);
        if (element) {
          content = await element.innerText();
          if (content.trim()) break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    
    // If no specific content found, get body content
    if (!content.trim()) {
      content = await this.page.evaluate(() => {
        // Remove navigation, footer, and other non-content elements
        const elementsToRemove = document.querySelectorAll('nav, header, footer, .nav, .header, .footer, .sidebar, .menu');
        elementsToRemove.forEach(el => el.remove());
        
        return document.body.innerText;
      });
    }
    
    return {
      title,
      content: content.trim(),
      url: this.page.url()
    };
  }

  async generatePDF(url, pageInfo) {
    const urlObj = new URL(url);
    const pathSegments = urlObj.pathname.split('/').filter(Boolean);
    const filename = pathSegments.length > 0 ? pathSegments.join('-') : 'page';
    const safeFilename = filename.replace(/[^a-zA-Z0-9-]/g, '-');
    const pdfPath = path.join(this.outputDir, `${safeFilename}.pdf`);
    
    // Add CSS to prevent content cutoff
    await this.page.addStyleTag({
      content: `
        @media print {
          body {
            margin: 0;
            padding: 0;
          }
          
          body::before {
            content: "";
            display: block;
            height: 1.2in;
            width: 100%;
          }
          
          #markdown, main, article, .content, .main-content, [role="main"] {
            padding-top: 0.2in !important;
            margin-top: 0 !important;
          }
          
          h1, h2, h3, h4, h5, h6 {
            page-break-after: avoid;
            page-break-inside: avoid;
            margin-top: 0.5in !important;
          }
        }
      `
    });
    
    // Generate PDF with improved settings
    await this.page.pdf({
      path: pdfPath,
      format: 'Letter',
      printBackground: true,
      margin: {
        top: '1in',
        right: '0.5in',
        bottom: '0.75in',
        left: '0.5in'
      }
    });
    
    return pdfPath;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      console.log('🔒 Browser closed');
    }
  }
}

// Main execution function
async function main() {
  const crawler = new HelloInterviewCrawler();
  
  try {
    await crawler.init();
    
    // Example URL from your request
    const url = 'https://www.hellointerview.com/learn/system-design/in-a-hurry/introduction';
    
    const result = await crawler.crawlPage(url);
    
    console.log('\n📊 Crawling Results:');
    console.log('Title:', result.title);
    console.log('URL:', result.url);
    console.log('PDF Path:', result.pdfPath);
    console.log('Content Length:', result.content.length, 'characters');
    
  } catch (error) {
    console.error('❌ Crawling failed:', error);
    process.exit(1);
  } finally {
    await crawler.close();
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = HelloInterviewCrawler; 