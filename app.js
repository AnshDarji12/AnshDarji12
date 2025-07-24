import "dotenv/config";
import { Composio } from "@composio/core";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import readline from 'readline';

// Load API Keys from environment variables
const API_KEYS = {
  COMPOSIO_API_KEY: process.env.COMPOSIO_API_KEY,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY
};

// Configuration constants
const CONFIG = {
  USER_ID: "AnshDarji146",
  OPENAI_MODEL: "gpt-4-turbo-preview",
  GEMINI_MODEL: "gemini-1.5-pro-002",
};

// Initialize services
const composio = new Composio({
  apiKey: API_KEYS.COMPOSIO_API_KEY,
});

const openai = new OpenAI({
  apiKey: API_KEYS.OPENAI_API_KEY,
});

const genAI = new GoogleGenerativeAI(API_KEYS.GEMINI_API_KEY);

// Setup readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Gets user's custom prompt for email analysis
 */
function getUserPrompt() {
  return new Promise((resolve) => {
    console.log("\n💬 Enter your custom prompt for email analysis:");
    console.log("   (This will be used along with email and Notion data for personalized response)");
    console.log("   Example: 'Make the response more casual and friendly' or 'Focus on technical details'");
    console.log("   Press Enter for default analysis:");
    
    rl.question("Your prompt: ", (userPrompt) => {
      const prompt = userPrompt.trim();
      if (prompt) {
        console.log(`✅ Custom prompt set: "${prompt}"`);
      } else {
        console.log("✅ Using default analysis approach");
      }
      resolve(prompt || "Provide a professional and thoughtful response based on the context.");
    });
  });
}

/**
 * Validates API keys are present
 */
function validateAPIKeys() {
  const requiredKeys = ['COMPOSIO_API_KEY', 'OPENAI_API_KEY', 'GEMINI_API_KEY'];
  const missing = requiredKeys.filter(key => !API_KEYS[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required API keys: ${missing.join(', ')}`);
  }
  
  console.log("✅ All API keys validated");
}

/**
 * Sets up Composio and checks for connected accounts
 */
async function setupComposio() {
  try {
    console.log("🔗 Checking Composio setup...");
    
    // Check connected accounts
    const connectedAccounts = await composio.connectedAccounts.list();
    const accountCount = connectedAccounts?.length || 0;
    console.log(`✅ Found ${accountCount} connected accounts`);
    
    if (accountCount === 0) {
      console.log("\n⚠️  No connected accounts found.");
      console.log("📋 To use this application, you need to connect:");
      console.log("   1. Gmail account");
      console.log("   2. Notion account");
      console.log("\n🌐 Visit the Composio dashboard to connect your accounts:");
      console.log("   https://app.composio.dev/dashboard");
      return false;
    }
    
    // List connected accounts
    connectedAccounts.forEach(account => {
      console.log(`  - ${account.appName}: ${account.memberEntityId || account.memberEmailId || 'Connected'}`);
    });
    
    return true;
  } catch (error) {
    console.error("❌ Error setting up Composio:", error.message);
    return false;
  }
}

/**
 * Fetches Gmail emails using Composio
 */
async function fetchGmailEmails(count = 10) {
  try {
    console.log(`📧 Fetching ${count} recent emails from Gmail...`);
    
    const result = await composio.tools.execute({
      action: "GMAIL_FETCH_EMAILS",
      params: {
        maxResults: count,
        q: "is:unread OR is:recent" // Focus on unread or recent emails
      }
    });
    
    console.log(`✅ Successfully fetched ${result.data?.messages?.length || 0} emails`);
    return result.data?.messages || [];
  } catch (error) {
    console.error("❌ Error fetching Gmail emails:", error.message);
    if (error.message.includes("not found") || error.message.includes("unauthorized")) {
      console.log("💡 Please ensure your Gmail account is connected in Composio dashboard");
    }
    return [];
  }
}

/**
 * Fetches email details by ID
 */
async function fetchEmailDetails(messageId) {
  try {
    const result = await composio.tools.execute({
      action: "GMAIL_FETCH_MESSAGE_BY_ID",
      params: { messageId }
    });
    
    return result.data;
  } catch (error) {
    console.error(`❌ Error fetching email ${messageId}:`, error.message);
    return null;
  }
}

/**
 * Searches Notion pages for context
 */
async function searchNotionPages(query) {
  try {
    console.log(`🔍 Searching Notion pages for: "${query}"`);
    
    const result = await composio.tools.execute({
      action: "NOTION_SEARCH_PAGES",
      params: {
        query: query,
        filter: {
          property: "object",
          value: "page"
        }
      }
    });
    
    console.log(`✅ Found ${result.data?.results?.length || 0} relevant Notion pages`);
    return result.data?.results || [];
  } catch (error) {
    console.error("❌ Error searching Notion:", error.message);
    if (error.message.includes("not found") || error.message.includes("unauthorized")) {
      console.log("💡 Please ensure your Notion account is connected in Composio dashboard");
    }
    return [];
  }
}

/**
 * Analyzes email with AI and Notion context
 */
async function analyzeEmailWithAI(emailData, notionContext, userPrompt, useGemini = false) {
  try {
    const contextText = notionContext.map(page => 
      `Page: ${page.properties?.title?.title?.[0]?.plain_text || 'Untitled'}\n` +
      `Content: ${page.properties?.Name?.title?.[0]?.plain_text || 'No content preview'}`
    ).join('\n\n');
    
    const systemPrompt = `You are an AI assistant helping to analyze emails with relevant Notion context. 
    
Email Subject: ${emailData.subject || 'No subject'}
Email From: ${emailData.from || 'Unknown sender'}
Email Body: ${emailData.body || emailData.snippet || 'No content'}

Relevant Notion Context:
${contextText || 'No relevant Notion pages found'}

User's Custom Instructions: ${userPrompt}

Please provide a thoughtful analysis and suggested response considering both the email content and the Notion context.`;

    if (useGemini) {
      const model = genAI.getGenerativeModel({ model: CONFIG.GEMINI_MODEL });
      const result = await model.generateContent(systemPrompt);
      return result.response.text();
    } else {
      const completion = await openai.chat.completions.create({
        model: CONFIG.OPENAI_MODEL,
        messages: [{ role: "user", content: systemPrompt }],
        max_tokens: 1000,
        temperature: 0.7,
      });
      return completion.choices[0].message.content;
    }
  } catch (error) {
    console.error("❌ Error with AI analysis:", error.message);
    return "Unable to generate AI analysis at this time.";
  }
}

/**
 * Main application flow
 */
async function runEmailAnalysis() {
  try {
    console.log("🚀 Starting Enhanced Gmail-Notion Integration");
    
    // Validate setup
    validateAPIKeys();
    
    const composioReady = await setupComposio();
    if (!composioReady) {
      console.log("\n❌ Please set up your Composio connections first.");
      process.exit(1);
    }
    
    // Get user preferences
    const userPrompt = await getUserPrompt();
    
    // Ask for AI preference
    const aiChoice = await new Promise((resolve) => {
      rl.question("\n🤖 Choose AI model (1 for OpenAI GPT-4, 2 for Google Gemini): ", (choice) => {
        resolve(choice.trim() === '2');
      });
    });
    
    console.log(`✅ Using ${aiChoice ? 'Google Gemini' : 'OpenAI GPT-4'} for analysis`);
    
    // Fetch recent emails
    const emails = await fetchGmailEmails(5);
    
    if (emails.length === 0) {
      console.log("📭 No emails found to analyze");
      process.exit(0);
    }
    
    console.log(`\n📊 Analyzing ${emails.length} emails...`);
    
    for (let i = 0; i < emails.length; i++) {
      const email = emails[i];
      console.log(`\n📧 [${i + 1}/${emails.length}] Processing email: ${email.id}`);
      
      // Get full email details
      const emailDetails = await fetchEmailDetails(email.id);
      if (!emailDetails) continue;
      
      // Search for relevant Notion context
      const searchQuery = emailDetails.subject || emailDetails.snippet || "";
      const notionContext = await searchNotionPages(searchQuery.substring(0, 100)); // Limit search query length
      
      // Analyze with AI
      console.log("🧠 Generating AI analysis...");
      const analysis = await analyzeEmailWithAI(emailDetails, notionContext, userPrompt, aiChoice);
      
      // Display results
      console.log("\n" + "=".repeat(60));
      console.log(`📧 EMAIL: ${emailDetails.subject || 'No Subject'}`);
      console.log(`👤 FROM: ${emailDetails.from || 'Unknown'}`);
      console.log(`📅 DATE: ${emailDetails.date || 'Unknown'}`);
      console.log("\n🤖 AI ANALYSIS:");
      console.log(analysis);
      console.log("=".repeat(60));
      
      // Ask if user wants to continue
      if (i < emails.length - 1) {
        const continueChoice = await new Promise((resolve) => {
          rl.question("\n⏭️  Continue to next email? (y/n): ", (choice) => {
            resolve(choice.toLowerCase().startsWith('y'));
          });
        });
        
        if (!continueChoice) break;
      }
    }
    
    console.log("\n🎉 Email analysis completed!");
    
  } catch (error) {
    console.error("❌ Application error:", error.message);
    console.error("Stack trace:", error.stack);
  } finally {
    rl.close();
  }
}

// Start the application
runEmailAnalysis();