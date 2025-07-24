import "dotenv/config";
import { Composio } from "@composio/core";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Load API Keys from environment variables
const API_KEYS = {
  COMPOSIO_API_KEY: process.env.COMPOSIO_API_KEY,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY
};

console.log("🚀 Quick Integration Test");

async function runQuickTest() {
  try {
    // Validate API keys
    console.log("🔑 Validating API keys...");
    const requiredKeys = ['COMPOSIO_API_KEY', 'OPENAI_API_KEY', 'GEMINI_API_KEY'];
    const missing = requiredKeys.filter(key => !API_KEYS[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required API keys: ${missing.join(', ')}`);
    }
    console.log("✅ All API keys present");

    // Test Composio SDK
    console.log("\n📡 Testing Composio SDK...");
    const composio = new Composio({
      apiKey: API_KEYS.COMPOSIO_API_KEY,
    });
    console.log("✅ Composio SDK initialized");

    // Test OpenAI
    console.log("\n🤖 Testing OpenAI SDK...");
    const openai = new OpenAI({
      apiKey: API_KEYS.OPENAI_API_KEY,
    });
    console.log("✅ OpenAI SDK initialized");

    // Test Gemini
    console.log("\n🔮 Testing Gemini SDK...");
    const genAI = new GoogleGenerativeAI(API_KEYS.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-002" });
    console.log("✅ Gemini SDK initialized");

    // Test Composio API calls
    console.log("\n🔧 Testing Composio API...");
    
    // List available toolkits (includes Gmail, Notion, etc.)
    console.log("📱 Fetching available toolkits...");
    const toolkits = await composio.toolkits.getToolkits();
    console.log(`✅ Found ${toolkits.length} available toolkits`);
    
    // Check for Gmail and Notion toolkits
    const gmailToolkit = toolkits.find(toolkit => toolkit.name.toLowerCase().includes('gmail'));
    const notionToolkit = toolkits.find(toolkit => toolkit.name.toLowerCase().includes('notion'));
    
    if (gmailToolkit) {
      console.log(`✅ Gmail toolkit found: ${gmailToolkit.name}`);
    } else {
      console.log("⚠️  Gmail toolkit not found in available toolkits");
      // Show some available toolkits
      console.log("Available toolkits:", toolkits.slice(0, 5).map(t => t.name).join(', ') + '...');
    }
    
    if (notionToolkit) {
      console.log(`✅ Notion toolkit found: ${notionToolkit.name}`);
    } else {
      console.log("⚠️  Notion toolkit not found in available toolkits");
    }

    // List connected accounts
    console.log("\n🔗 Checking connected accounts...");
    const connectedAccounts = await composio.connectedAccounts.list();
    console.log(`✅ Found ${connectedAccounts.length} connected accounts`);
    
    if (connectedAccounts.length > 0) {
      connectedAccounts.forEach(account => {
        console.log(`  - ${account.appName}: ${account.memberEntityId || account.memberEmailId || 'Connected'}`);
      });
    } else {
      console.log("ℹ️  No accounts connected yet. You'll need to connect Gmail and Notion accounts.");
    }

    // List auth configs
    console.log("\n🔐 Checking auth configurations...");
    const authConfigs = await composio.authConfigs.list();
    console.log(`✅ Found ${authConfigs.length} auth configurations`);
    
    if (authConfigs.length > 0) {
      authConfigs.forEach(config => {
        console.log(`  - ${config.name || config.id}: ${config.appName}`);
      });
    }

    console.log("\n🎉 All integrations tested successfully!");
    console.log("\n📋 Next Steps:");
    console.log("1. Connect your Gmail account using Composio dashboard or programmatically");
    console.log("2. Connect your Notion account using Composio dashboard or programmatically");
    console.log("3. Run the main app.js for the full interactive experience");

  } catch (error) {
    console.error("❌ Test failed:", error.message);
    if (error.response) {
      console.error("API Response:", error.response.data);
    }
    if (error.stack) {
      console.error("Stack trace:", error.stack);
    }
    process.exit(1);
  }
}

runQuickTest();