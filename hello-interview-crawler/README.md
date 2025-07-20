# HelloInterview Web Crawler

A Node.js web crawler that uses Playwright to scrape HelloInterview pages and generate PDFs.

## Features

- 🕷️ **Web Scraping**: Uses Playwright for reliable web page access
- 📄 **PDF Generation**: Automatically generates PDFs from scraped content
- 📝 **Text Extraction**: Saves content as text files for easy reading
- 🎯 **Smart Content Extraction**: Intelligently extracts main content from web pages
- 🔗 **Navigation Crawling**: Automatically discovers and crawls multiple pages from navigation menus
- 📁 **Organized Output**: Saves files with meaningful filenames and timestamps
- 🔄 **Retry Logic**: Automatic retries with exponential backoff
- 🚀 **Multiple Interfaces**: CLI, programmatic API, and example scripts
- ⏱️ **Reading Time Estimation**: Calculates estimated reading time
- 📊 **Metadata Extraction**: Extracts title, description, author, and more
- 🔐 **Authentication Support**: JWT tokens and cookies for premium content access
- 🎛️ **Flexible Filtering**: Filter navigation links by text patterns or regex
- 📉 **Batch Processing**: Crawl multiple pages with rate limiting and error handling

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn

## Installation

1. **Clone or download this project**

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Install Playwright browsers**:
   ```bash
   npm run install-browsers
   ```

## Usage

### Basic Usage

Run the crawler with the default URL:

```bash
npm start
```

This will crawl the HelloInterview system design introduction page and generate a PDF.

### CLI Usage

#### Single Page Crawling

Use the command-line interface for crawling individual pages:

```bash
# Crawl a single URL (default command)
node cli.js https://www.hellointerview.com/learn/system-design/in-a-hurry/introduction

# Or explicitly use the crawl command
node cli.js crawl https://www.hellointerview.com/learn/system-design/in-a-hurry/introduction

# With custom options
node cli.js crawl --output ./my-output --timeout 60000 https://example.com

# Different PDF generation strategies
node cli.js crawl --strategy clean https://example.com
node cli.js crawl --strategy basic https://example.com
node cli.js crawl --strategy enhanced https://example.com
```

#### Navigation Crawling

Extract and crawl multiple pages from the navigation drawer automatically:

```bash
# List all navigation links without crawling
node cli.js crawl-navigation --list-only https://www.hellointerview.com/learn/system-design/in-a-hurry/introduction

# Crawl all pages found in navigation
node cli.js crawl-navigation https://www.hellointerview.com/learn/system-design/in-a-hurry/introduction

# Limit the number of pages to crawl
node cli.js crawl-navigation --max-pages 5 https://www.hellointerview.com/learn/system-design/in-a-hurry/introduction

# Filter pages by text or URL pattern (regex supported)
node cli.js crawl-navigation --filter "system|design" https://www.hellointerview.com/learn/system-design/in-a-hurry/introduction

# Start from a specific index (useful for resuming interrupted crawls)
node cli.js crawl-navigation --start-index 5 --max-pages 10 https://www.hellointerview.com/learn/system-design/in-a-hurry/introduction

# With authentication for premium content
node cli.js crawl-navigation --cookies-file "cookies.json" --max-pages 10 https://www.hellointerview.com/learn/system-design/in-a-hurry/introduction
```

#### 🔄 Resuming Interrupted Crawls

The `--start-index` option allows you to resume crawling from a specific position in the navigation list:

1. **First, list all available pages to see the indices:**
   ```bash
   node cli.js crawl-navigation --list-only https://www.hellointerview.com/learn/system-design/in-a-hurry/introduction
   ```

2. **If your crawl was interrupted after processing 7 pages, resume from index 8:**
   ```bash
   node cli.js crawl-navigation --start-index 8 https://www.hellointerview.com/learn/system-design/in-a-hurry/introduction
   ```

3. **The file names will maintain the correct numbering:**
   - Files will be named `8-page-name.pdf`, `9-page-name.pdf`, etc.
   - No need to worry about duplicate or incorrectly numbered files

**Example workflow:**
```bash
# Initial crawl (gets interrupted after 5 pages)
node cli.js crawl-navigation --max-pages 20 https://example.com

# Resume from where you left off
node cli.js crawl-navigation --start-index 6 --max-pages 15 https://example.com
```

### 🔐 Authentication Usage

For premium or login-required content, the crawler supports authentication via cookies.

#### Cookies File Authentication

You can provide a JSON file containing your authentication cookies:

```bash
node cli.js --cookies-file "cookies.json" https://premium-content-url.com
```

**Example cookies.json format**:
```json
[
  {
    "name": "token",
    "value": "your-jwt-token-here",
    "domain": ".hellointerview.com",
    "path": "/",
    "httpOnly": false,
    "secure": true,
    "sameSite": "Lax"
  },
  {
    "name": "session_id",
    "value": "your-session-id",
    "domain": ".hellointerview.com",
    "path": "/",
    "httpOnly": true,
    "secure": true,
    "sameSite": "Strict"
  }
]
```

#### How to Get Your Authentication Cookies

1. **Browser Developer Tools Method**:
   - Open HelloInterview in your browser
   - Log in to your premium account
   - Press F12 to open Developer Tools
   - Go to Application/Storage → Cookies
   - Find the HelloInterview domain and copy all relevant cookies
   - Create a JSON file with the cookie information (see format below)

2. **Export Cookies Extension**:
   - Use a browser extension like "Cookie Editor" or "EditThisCookie"
   - Export cookies for the HelloInterview domain
   - Convert to the required JSON format

### Example Script

Run the included example:

```bash
npm run example
```

### Programmatic Usage

#### Basic Single Page Usage

```javascript
const EnhancedHelloInterviewCrawler = require('./crawler');

async function crawlSinglePage() {
  const crawler = new EnhancedHelloInterviewCrawler();
  
  try {
    await crawler.init();
    
    const result = await crawler.crawlPage(
      'https://www.hellointerview.com/learn/system-design/in-a-hurry/introduction'
    );
    
    console.log(`✅ Title: ${result.title}`);
    console.log(`📄 PDF: ${result.pdfPath}`);
    console.log(`📝 Text: ${result.textPath}`);
    
  } finally {
    await crawler.close();
  }
}

crawlSinglePage();
```

#### Navigation Crawling

```javascript
const EnhancedHelloInterviewCrawler = require('./crawler');

async function crawlFromNavigation() {
  const crawler = new EnhancedHelloInterviewCrawler({
    outputDir: './output',
    pdfStrategy: 'enhanced'
  });
  
  try {
    await crawler.init();
    
    const baseUrl = 'https://www.hellointerview.com/learn/system-design/in-a-hurry/introduction';
    
    // Option 1: Just extract navigation links
    const navigationLinks = await crawler.extractNavigationLinks(baseUrl);
    console.log(`Found ${navigationLinks.length} navigation links`);
    
    // Option 2: Crawl all pages from navigation
    const results = await crawler.crawlFromNavigation(baseUrl);
    
    // Option 3: Crawl with filtering and limits
    const filteredResults = await crawler.crawlFromNavigation(baseUrl, {
      maxPages: 5,
      filterPattern: 'system|design|scale'
    });
    
    console.log(`Processed ${results.length} pages`);
    
  } finally {
    await crawler.close();
  }
}

crawlFromNavigation();
```

#### Multiple URLs (Manual List)

```javascript
const EnhancedHelloInterviewCrawler = require('./crawler');

async function crawlMultiplePages() {
  const crawler = new EnhancedHelloInterviewCrawler();
  
  try {
    await crawler.init();
    
    const urls = [
      'https://www.hellointerview.com/learn/system-design/in-a-hurry/introduction',
      'https://www.hellointerview.com/learn/system-design/in-a-hurry/architecture',
      // Add more URLs as needed
    ];
    
    const results = await crawler.crawlMultiplePages(urls);
    
    results.forEach(result => {
      if (result.error) {
        console.log(`❌ Error: ${result.error}`);
      } else {
        console.log(`✅ Processed: ${result.title}`);
      }
    });
    
  } finally {
    await crawler.close();
  }
}

crawlMultiplePages();
```

#### 🔐 Authenticated Usage

```javascript
const EnhancedHelloInterviewCrawler = require('./crawler');

async function crawlPremiumContent() {
  const crawler = new EnhancedHelloInterviewCrawler({
    // Authentication via cookies
    cookies: [
      {
        name: 'token',
        value: 'your-auth-token-here',
        domain: '.hellointerview.com',
        path: '/',
        httpOnly: false,
        secure: true,
        sameSite: 'Lax'
      },
      {
        name: 'session_id',
        value: 'your-session-id',
        domain: '.hellointerview.com',
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'Strict'
      }
    ],
    
    // Other options
    outputDir: './premium-output',
    pdfStrategy: 'enhanced'
  });
  
  try {
    await crawler.init();
    
    const premiumUrls = [
      'https://www.hellointerview.com/premium-content-url',
      // Add more premium URLs
    ];
    
    const results = await crawler.crawlMultiplePages(premiumUrls);
    
    results.forEach(result => {
      if (!result.error) {
        console.log(`✅ ${result.title} - ${result.pdfPath}`);
      }
    });
    
  } finally {
    await crawler.close();
  }
}

crawlPremiumContent();
```

### Custom Configuration

You can modify the crawler behavior by editing the `index.js` file:

- **Output directory**: Change `this.outputDir` in the constructor
- **PDF format**: Modify the `generatePDF` method options
- **Content extraction**: Update selectors in `extractPageInfo` method
- **Browser settings**: Adjust launch options in the `init` method

### 💻 Code Block Handling

The crawler includes advanced code block formatting for technical content:

#### Features
- **Automatic wrapping**: Long code lines wrap properly instead of overflowing
- **Syntax preservation**: Maintains proper spacing and indentation
- **HelloInterview compatibility**: Specifically handles HelloInterview's code block structure
- **Multiple formats**: Supports inline `code`, code blocks, and mixed content
- **Responsive tables**: Code in table cells wraps appropriately
- **Monospace fonts**: Uses `Courier New`, `Consolas`, and `Monaco` for code readability

#### Supported Code Types
- **HelloInterview code blocks**: `<div>` containers with `<span class="token">` syntax highlighting
- **Standard code blocks**: `<pre><code>` traditional format
- Inline code snippets: `<code>example</code>`
- SQL queries with long lines
- JSON configurations
- Shell commands and scripts
- API endpoints and URLs
- Code within tables and blockquotes

#### HelloInterview Integration
- **Token-based syntax highlighting**: Preserves color-coded syntax from HelloInterview
- **Inline style override**: Properly handles inline `style` attributes
- **Print-optimized colors**: Converts web colors to print-friendly equivalents
- **Structure preservation**: Maintains original formatting while enabling wrapping

#### Styling Features
- Light gray background for better readability
- Subtle borders for visual separation
- Proper padding and margins
- Page-break-inside avoidance for code blocks
- **Smart color handling**: Code blocks use syntax-friendly colors (dark gray/purple) while normal text remains black
- **Color differentiation**: Inline code uses distinctive purple color, code blocks use dark gray
- **Consistent styling**: Both enhanced and clean PDF strategies use the same color scheme

## Output

- **PDFs**: Generated in the `./output` directory
- **Filenames**: Based on the URL path (e.g., `learn-system-design-in-a-hurry-introduction.pdf`)
- **Console output**: Progress updates and results summary

## Project Structure

```
hello-interview-crawler/
├── index.js          # Basic crawler implementation
├── crawler.js        # Enhanced crawler with advanced features
├── cli.js            # Command-line interface
├── example.js        # Example usage script
├── package.json      # Dependencies and scripts
├── README.md         # This file
└── output/           # Generated PDFs and text files (created automatically)
```

## Troubleshooting

### Common Issues

1. **Browser installation fails**:
   ```bash
   npx playwright install chromium
   ```

2. **Permission errors on macOS/Linux**:
   ```bash
   sudo npm run install-browsers
   ```

3. **Page not loading**:
   - Check your internet connection
   - Verify the URL is accessible
   - The crawler includes retry logic and timeout handling

### Debug Mode

To run with more verbose output:

```bash
DEBUG=pw:api npm start
```

## Customization

### Adding New Content Selectors

If the crawler isn't finding the right content, you can add custom selectors:

```javascript
// In extractPageInfo method, add to contentSelectors array:
const contentSelectors = [
  'main',
  '.main-content',
  'article',
  '.content',
  '.post-content',
  '.article-content',
  '[role="main"]',
  '.your-custom-selector'  // Add your selector here
];
```

### PDF Generation Strategies

The crawler supports three different PDF generation strategies to handle content cutoff issues:

#### 1. Basic Strategy (`--pdf-strategy basic`)
- Simple PDF generation with minimal styling
- Good for quick conversions
- May have content cutoff issues

#### 2. Enhanced Strategy (`--pdf-strategy enhanced`) - Default
- Removes navigation and non-content elements
- Completely filters out comments and discussion sections
- Applies print-friendly CSS styling
- Adds proper spacing to prevent cutoff
- Includes headers and footers
- Optimized margins for better content utilization
- **Code block wrapping**: Automatically wraps long code lines to prevent overflow
- **Table responsive design**: Ensures tables fit within page boundaries
- **Syntax highlighting preservation**: Maintains code formatting with monospace fonts

#### 3. Clean Strategy (`--pdf-strategy clean`)
- Creates a completely new HTML document
- Professional formatting with metadata
- Best for preventing content cutoff
- Clean, readable output

### PDF Styling

Modify PDF generation options in the `generatePDF` method:

```javascript
await this.page.pdf({
  path: pdfPath,
  format: 'Letter',       // or 'A4', 'Legal'
  printBackground: true,  // Include background colors/images
  margin: {
    top: '1in',
    right: '0.5in',
    bottom: '0.75in',
    left: '0.5in'
  },
  // Additional options:
  // landscape: true,     // Landscape orientation
  // scale: 0.8,         // Scale factor
});
```

## License

MIT License - feel free to use this project for your own needs.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request