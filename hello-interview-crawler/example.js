const EnhancedHelloInterviewCrawler = require('./crawler');

async function main() {
  // Example URLs to crawl (single pages)
  const singlePageUrls = [
    'https://www.hellointerview.com/learn/system-design/in-a-hurry/introduction'
  ];

  console.log('🚀 Starting HelloInterview Crawler Examples\n');

  // === Example 1: Basic Single Page Usage (No Authentication) ===
  console.log('1️⃣ Single Page Crawling Example');
  console.log('==================================================');
  
  const basicCrawler = new EnhancedHelloInterviewCrawler({
    outputDir: './output',
    timeout: 30000,
    retries: 3,
    pdfStrategy: 'enhanced'
  });

  try {
    await basicCrawler.init();
    console.log(`📚 Found ${singlePageUrls.length} URLs to process\n`);
    
    const results = await basicCrawler.crawlMultiplePages(singlePageUrls);
    
    // Display results
    console.log('\n📊 Single Page Results:');
    console.log('--------------------------------------------------');
    
    results.forEach((result, index) => {
      if (result.error) {
        console.log(`❌ ${index + 1}. Error: ${result.error}`);
      } else {
        console.log(`✅ ${index + 1}. ${result.title}`);
        console.log(`   📄 PDF: ${result.pdfPath}`);
        console.log(`   📝 Text: ${result.textPath}`);
        console.log(`   ⏱️  Reading Time: ${result.metadata.readingTime} minutes`);
        console.log(`   📏 Content Length: ${result.content.length} characters`);
      }
      console.log('');
    });
    
    await basicCrawler.close();
    
  } catch (error) {
    console.error('❌ Error in basic example:', error.message);
  }

  // === Example 2: Navigation Link Extraction (List Only) ===
  console.log('\n2️⃣ Navigation Links Extraction Example');
  console.log('==================================================');
  
  const listCrawler = new EnhancedHelloInterviewCrawler({
    outputDir: './output',
    timeout: 30000,
    retries: 3,
    pdfStrategy: 'enhanced',
    cookies: [
      // Add your authentication cookies here if needed
      // {
      //   name: 'token',
      //   value: process.env.HELLO_INTERVIEW_TOKEN || 'your-token-here',
      //   domain: '.hellointerview.com',
      //   path: '/',
      //   httpOnly: false,
      //   secure: true,
      //   sameSite: 'Lax'
      // }
    ]
  });

  try {
    await listCrawler.init();
    
    const baseUrl = 'https://www.hellointerview.com/learn/system-design/in-a-hurry/introduction';
    const navigationLinks = await listCrawler.extractNavigationLinks(baseUrl);
    
    console.log(`📋 Found ${navigationLinks.length} navigation links:`);
    console.log('--------------------------------------------------');
    navigationLinks.forEach((link, index) => {
      console.log(`${index + 1}. ${link.text}`);
      console.log(`   → ${link.href}`);
    });
    
    await listCrawler.close();
    
  } catch (error) {
    console.error('❌ Error in navigation extraction example:', error.message);
  }

  // === Example 3: Navigation Crawling (Full Crawl) ===
  console.log('\n3️⃣ Navigation Crawling Example');
  console.log('==================================================');
  
  const navCrawler = new EnhancedHelloInterviewCrawler({
    outputDir: './output',
    timeout: 30000,
    retries: 3,
    pdfStrategy: 'enhanced',
    cookies: [
      // Add your authentication cookies here if needed
      // {
      //   name: 'token',
      //   value: process.env.HELLO_INTERVIEW_TOKEN || 'your-token-here',
      //   domain: '.hellointerview.com',
      //   path: '/',
      //   httpOnly: false,
      //   secure: true,
      //   sameSite: 'Lax'
      // }
    ]
  });

  try {
    await navCrawler.init();
    
    const baseUrl = 'https://www.hellointerview.com/learn/system-design/in-a-hurry/introduction';
    
    // Crawl with options - limit to first 3 pages for demo
    const crawlOptions = {
      maxPages: 3,
      filterPattern: null // Remove this to crawl all, or use regex pattern to filter
    };
    
    console.log('🚀 Starting navigation-based crawling...');
    const navResults = await navCrawler.crawlFromNavigation(baseUrl, crawlOptions);
    
    // Display results
    console.log('\n📊 Navigation Crawling Results:');
    console.log('--------------------------------------------------');
    
    let successCount = 0;
    let errorCount = 0;
    
    navResults.forEach((result, index) => {
      console.log(`\n${index + 1}. ${result.url}`);
      if (result.error) {
        console.log(`   ❌ Error: ${result.error}`);
        errorCount++;
      } else {
        console.log(`   ✅ Title: ${result.title}`);
        console.log(`   📄 PDF: ${result.pdfPath}`);
        console.log(`   📝 Text: ${result.textPath}`);
        console.log(`   ⏱️  Reading Time: ${result.metadata.readingTime} minutes`);
        successCount++;
      }
    });
    
    console.log(`\n🎯 Navigation Crawl Summary: ${successCount} successful, ${errorCount} failed`);
    
    await navCrawler.close();
    
  } catch (error) {
    console.error('❌ Error in navigation crawling example:', error.message);
  }

  // === Example 4: Authenticated Navigation Crawling ===
  console.log('\n4️⃣ Authenticated Premium Content Example');
  console.log('==================================================');
  console.log('To use authentication, set HELLO_INTERVIEW_TOKEN environment variable or modify the cookies below\n');
  
  // Uncomment and modify this code to use authentication:
  const authenticatedCrawler = new EnhancedHelloInterviewCrawler({
    outputDir: './output-premium',
    pdfStrategy: 'enhanced',
    cookies: [
      {
        name: 'token',                                        // Replace with your actual cookie name
        value: process.env.HELLO_INTERVIEW_TOKEN || 'your-token-here', // Replace with your actual token value
        domain: '.hellointerview.com',                       // Domain for the cookie
        path: '/',
        httpOnly: false,
        secure: true,
        sameSite: 'Lax'
      }
      // Add more cookies as needed
    ]
  });

  try {
    await authenticatedCrawler.init();
    
    // Example of crawling premium content from navigation
    const baseUrl = 'https://www.hellointerview.com/learn/system-design/in-a-hurry/introduction';
    
    console.log('🔐 Starting authenticated navigation crawling...');
    console.log('Note: This requires valid authentication cookies');
    
    // First, just list the links to see what's available
    const navigationLinks = await authenticatedCrawler.extractNavigationLinks(baseUrl);
    console.log(`📋 Found ${navigationLinks.length} total navigation links`);
    
    // Filter for premium/locked content (you can adjust this filter)
    const premiumOptions = {
      maxPages: 2, // Limit for demo purposes
      filterPattern: 'design|scale|system' // Only crawl system design related content
    };
    
    const results = await authenticatedCrawler.crawlFromNavigation(baseUrl, premiumOptions);
    
    console.log('\n🔐 Premium navigation crawling completed!');
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
        successCount++;
      }
    });
    
    console.log(`\n🎯 Premium Crawl Summary: ${successCount} successful, ${errorCount} failed`);
    
  } catch (error) {
    console.error('❌ Authentication or crawling error:', error.message);
    console.log('💡 Make sure to provide valid authentication cookies for premium content access');
  } finally {
    await authenticatedCrawler.close();
  }
  
  // === Usage Examples and CLI Help ===
  console.log('\n5️⃣ CLI Usage Examples');
  console.log('==================================================');
  
  console.log('\n// Single page crawling:');
  console.log('node cli.js crawl https://www.hellointerview.com/page');
  
  console.log('\n// Navigation crawling (list links only):');
  console.log('node cli.js crawl-navigation --list-only https://www.hellointerview.com/learn/system-design/in-a-hurry/introduction');
  
  console.log('\n// Navigation crawling with authentication:');
  console.log('node cli.js crawl-navigation --cookies-file "cookies.json" --max-pages 5 https://www.hellointerview.com/learn/system-design/in-a-hurry/introduction');
  
  console.log('\n// Navigation crawling with filtering:');
  console.log('node cli.js crawl-navigation --filter "system|design" --max-pages 3 https://www.hellointerview.com/learn/system-design/in-a-hurry/introduction');
  
  console.log('\n// Using cookies file:');
  console.log('node cli.js crawl-navigation --cookies-file "cookies.json" https://www.hellointerview.com/learn/system-design/in-a-hurry/introduction');
  
  console.log('\n📚 For more options, run: node cli.js --help');
}

// Run examples
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main }; 