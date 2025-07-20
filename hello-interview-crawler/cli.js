#!/usr/bin/env node

const { program } = require('commander');
const EnhancedHelloInterviewCrawler = require('./crawler');
const fs = require('fs').promises;

// Single page crawling command
program
  .command('crawl')
  .description('Crawl a single page')
  .argument('<url>', 'URL to crawl')
  .option('-o, --output <dir>', 'Output directory', './output')
  .option('-t, --timeout <ms>', 'Request timeout in milliseconds', '30000')
  .option('-r, --retries <count>', 'Number of retries', '3')
  .option('-s, --strategy <type>', 'PDF generation strategy (basic|enhanced|clean)', 'enhanced')
  .option('-u, --user-agent <agent>', 'Custom user agent string')
  .option('--cookies-file <file>', 'Path to JSON file containing cookies array')
  .action(async (url, options) => {
    try {
      console.log('🚀 Starting Enhanced HelloInterview Crawler...\n');
      
      // Parse authentication options
      let cookies = [];
      
      if (options.cookiesFile) {
        try {
          const cookiesData = await fs.readFile(options.cookiesFile, 'utf8');
          cookies = JSON.parse(cookiesData);
          console.log(`🔐 Loaded ${cookies.length} cookies from ${options.cookiesFile}`);
        } catch (error) {
          console.error(`❌ Error loading cookies file: ${error.message}`);
          process.exit(1);
        }
      }else{
        console.log('No cookies file provided');
      }
      
      const crawler = new EnhancedHelloInterviewCrawler({
        outputDir: options.output,
        timeout: parseInt(options.timeout),
        retries: parseInt(options.retries),
        pdfStrategy: options.strategy,
        userAgent: options.userAgent,
        cookies
      });
      
      await crawler.init();
      
      const result = await crawler.crawlPage(url);
      
      console.log('\n📊 Crawling Results:');
      console.log('==================================================');
      console.log(`✅ Title: ${result.title}`);
      console.log(`📄 PDF: ${result.pdfPath}`);
      console.log(`📝 Text: ${result.textPath}`);
      console.log(`⏱️  Reading Time: ${result.metadata.readingTime} minutes`);
      console.log(`📏 Content Length: ${result.content.length} characters`);
      
      if (result.metadata.description) {
        console.log(`📋 Description: ${result.metadata.description}`);
      }
      
      console.log(`\n📁 Files saved to: ${options.output}`);
      
      await crawler.close();
      
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      process.exit(1);
    }
  });

// Navigation crawling command
program
  .command('crawl-navigation')
  .description('Crawl multiple pages from navigation drawer')
  .argument('<baseUrl>', 'Base URL to extract navigation from (e.g., https://www.hellointerview.com/learn/system-design/in-a-hurry/introduction)')
  .option('-o, --output <dir>', 'Output directory', './output')
  .option('-t, --timeout <ms>', 'Request timeout in milliseconds', '30000')
  .option('-r, --retries <count>', 'Number of retries', '3')
  .option('-s, --strategy <type>', 'PDF generation strategy (basic|enhanced|clean)', 'enhanced')
  .option('-u, --user-agent <agent>', 'Custom user agent string')
  .option('--cookies-file <file>', 'Path to JSON file containing cookies array', 'cookies.json')
  .option('--max-pages <count>', 'Maximum number of pages to crawl', parseInt)
  .option('--filter <pattern>', 'Filter links by text or URL pattern (regex)')
  .option('--start-index <index>', 'Start crawling from this index (useful for resuming)', parseInt)
  .option('--list-only', 'Only list navigation links without crawling')
  .action(async (baseUrl, options) => {
    try {
      console.log(options);
      console.log('🚀 Starting Navigation Crawler...\n');
      
      // Parse authentication options
      let cookies = [];
      
      if (options.cookiesFile) {
        try {
          const cookiesData = await fs.readFile(options.cookiesFile, 'utf8');
          cookies = JSON.parse(cookiesData);
          console.log(`🔐 Loaded ${cookies.length} cookies from ${options.cookiesFile}`);
        } catch (error) {
          console.error(`❌ Error loading cookies file: ${error.message}`);
          process.exit(1);
        }
      }else{
        console.log('No cookies file provided');
      }
      
      const crawler = new EnhancedHelloInterviewCrawler({
        outputDir: options.output,
        timeout: parseInt(options.timeout),
        retries: parseInt(options.retries),
        pdfStrategy: options.strategy,
        userAgent: options.userAgent,
        cookies
      });
      
      await crawler.init();
      
      if (options.listOnly) {
        // Only extract and list navigation links
        const navigationLinks = await crawler.extractNavigationLinks(baseUrl);
        console.log('\n📋 Navigation Links Found:');
        console.log('==================================================');
        navigationLinks.forEach((link, index) => {
          console.log(`${index + 1}. ${link.text}`);
          console.log(`   → ${link.fullUrl}`);
          console.log('');
        });
        console.log(`Total: ${navigationLinks.length} links`);
        console.log(`\n💡 To start crawling from a specific index, use: --start-index <number>`);
      } else {
        // Extract and crawl pages
        const crawlOptions = {
          maxPages: options.maxPages,
          filterPattern: options.filter,
          startIndex: options.startIndex
        };
        
        const results = await crawler.crawlFromNavigation(baseUrl, crawlOptions);
        
        console.log('\n📊 Final Results Summary:');
        console.log('==================================================');
        
        let successCount = 0;
        let errorCount = 0;
        
        results.forEach((result, index) => {
          console.log(`\n${index + 1}. ${result.url}`);
          if (result.error) {
            console.log(`   ❌ Error: ${result.error}`);
            errorCount++;
          } else {
            console.log(`   ✅ Title: ${result.title}`);
            console.log(`   📄 PDF: ${result.pdfPath}`);
            console.log(`   📝 Text: ${result.textPath}`);
            successCount++;
          }
        });
        
        console.log(`\n📈 Summary: ${successCount} successful, ${errorCount} failed`);
        console.log(`📁 Files saved to: ${options.output}`);
      }
      
      await crawler.close();
      
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      process.exit(1);
    }
  });

// Default to crawl command for backward compatibility
program
  .version('1.0.0')
  .description('Enhanced HelloInterview Crawler with Playwright')
  .argument('<url>', 'URL to crawl')
  .option('-o, --output <dir>', 'Output directory', './output')
  .option('-t, --timeout <ms>', 'Request timeout in milliseconds', '30000')
  .option('-r, --retries <count>', 'Number of retries', '3')
  .option('-s, --strategy <type>', 'PDF generation strategy (basic|enhanced|clean)', 'enhanced')
  .option('-u, --user-agent <agent>', 'Custom user agent string')
  .option('--cookies-file <file>', 'Path to JSON file containing cookies array')
  .action(async (url, options) => {
    // Same logic as crawl command for backward compatibility
    try {
      console.log('🚀 Starting Enhanced HelloInterview Crawler...\n');
      
      // Parse authentication options
      let cookies = [];
      
      if (options.cookiesFile) {
        try {
          const cookiesData = await fs.readFile(options.cookiesFile, 'utf8');
          cookies = JSON.parse(cookiesData);
          console.log(`🔐 Loaded ${cookies.length} cookies from ${options.cookiesFile}`);
        } catch (error) {
          console.error(`❌ Error loading cookies file: ${error.message}`);
          process.exit(1);
        }
      }
      
      const crawler = new EnhancedHelloInterviewCrawler({
        outputDir: options.output,
        timeout: parseInt(options.timeout),
        retries: parseInt(options.retries),
        pdfStrategy: options.strategy,
        userAgent: options.userAgent,
        cookies
      });
      
      await crawler.init();
      
      const result = await crawler.crawlPage(url);
      
      console.log('\n📊 Crawling Results:');
      console.log('==================================================');
      console.log(`✅ Title: ${result.title}`);
      console.log(`📄 PDF: ${result.pdfPath}`);
      console.log(`📝 Text: ${result.textPath}`);
      console.log(`⏱️  Reading Time: ${result.metadata.readingTime} minutes`);
      console.log(`📏 Content Length: ${result.content.length} characters`);
      
      if (result.metadata.description) {
        console.log(`📋 Description: ${result.metadata.description}`);
      }
      
      console.log(`\n📁 Files saved to: ${options.output}`);
      
      await crawler.close();
      
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      process.exit(1);
    }
  });

program.parse(); 