import "dotenv/config";
import { Composio } from "@composio/core";

const composio = new Composio({
  apiKey: process.env.COMPOSIO_API_KEY,
});

console.log("🚀 Simple Composio Test");

async function runSimpleTest() {
  try {
    console.log("✅ Composio SDK initialized");

    // Test connected accounts (this should work without parameters)
    console.log("\n🔗 Checking connected accounts...");
    const connectedAccounts = await composio.connectedAccounts.list();
    console.log(`✅ Found ${connectedAccounts.length} connected accounts`);
    
    if (connectedAccounts.length > 0) {
      connectedAccounts.forEach(account => {
        console.log(`  - ${account.appName}: ${account.memberEntityId || account.memberEmailId || 'Connected'}`);
      });
    } else {
      console.log("ℹ️  No accounts connected yet.");
    }

    // Test auth configs
    console.log("\n🔐 Checking auth configurations...");
    const authConfigs = await composio.authConfigs.list();
    console.log(`✅ Found ${authConfigs.length} auth configurations`);
    
    if (authConfigs.length > 0) {
      authConfigs.forEach(config => {
        console.log(`  - ${config.name || config.id}: ${config.appName || 'Unknown app'}`);
      });
    }

    // Test tools - try to get tools for Gmail and Notion
    console.log("\n🔧 Testing tools access...");
    try {
      const gmailTools = await composio.tools.get({app: "gmail"});
      console.log(`✅ Gmail tools available: ${gmailTools.length}`);
    } catch (error) {
      console.log("❌ Gmail tools not accessible:", error.message);
    }

    try {
      const notionTools = await composio.tools.get({app: "notion"});
      console.log(`✅ Notion tools available: ${notionTools.length}`);
    } catch (error) {
      console.log("❌ Notion tools not accessible:", error.message);
    }

    console.log("\n🎉 Basic Composio API test completed!");

  } catch (error) {
    console.error("❌ Test failed:", error.message);
    if (error.cause) {
      console.error("Cause:", error.cause);
    }
  }
}

runSimpleTest();