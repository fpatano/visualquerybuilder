# Databricks Apps Debugging Guide

This guide provides comprehensive troubleshooting steps for the Visual SQL Query Builder when deployed as a Databricks App.

## 🚨 Critical: Never Run on Localhost

**This application is designed exclusively for Databricks Apps and will NOT work when run on localhost or as standalone static files.**

- ❌ **localhost:3000** → "Databricks Apps context required" error
- ❌ **Static file server** → Unity Catalog API failures
- ❌ **Direct URL access** → Authentication and context errors
- ✅ **Databricks Apps** → Full functionality with proper context

## 🔍 Databricks Apps Context Validation

### What to Check in Browser Console

When the app loads, you should see these console messages:

```javascript
🔍 === DATABRICKS APPS ENVIRONMENT DEBUG ===
🔍 Checking Databricks Apps context...
✅ Databricks Apps context detected: {version: "1.0", workspace: "your-workspace", ...}
📋 Databricks Apps version: 1.0
🏢 Workspace: your-workspace.cloud.databricks.com
👤 User: your-username@company.com
🔑 Permissions: CAN_USE_CATALOG, CAN_USE_SCHEMA, CAN_SELECT, ...
✅ All required permissions are available
🎉 Databricks Apps context is valid and ready!
🔍 === END DEBUG INFO ===
```

### If Context Validation Fails

You'll see error messages like:

```javascript
❌ Not running in Databricks Apps context
❌ Running on localhost - this app must be deployed as a Databricks App
❌ To fix: Deploy the app via Databricks Apps and launch from the workspace UI
```

## 🚀 Proper Deployment Process

### Step 1: Build the Application

```bash
npm run build
```

### Step 2: Deploy to Databricks Apps

```bash
npm run deploy:apps
```

### Step 3: Launch from Workspace

1. Go to your Databricks workspace
2. Navigate to **Apps** in the left sidebar
3. Find "Visual SQL Query Builder"
4. Click **Launch** (not the URL directly)

## 🔧 Verification Scripts

### Validate App Configuration

```bash
npm run verify:apps
```

This script checks:
- ✅ App YAML configuration
- ✅ Package.json dependencies  
- ✅ Build output
- ✅ Server configuration
- ✅ Environment setup

### Check Environment

```bash
npm run check
```

Verifies environment variables and connectivity.

## 🚨 Common Error Scenarios

### Error: "Databricks Apps context required"

**Symptoms:**
- App shows error screen with red warning icon
- Console shows "Not running in Databricks Apps context"
- Unity Catalog API calls fail

**Causes:**
1. App is running on localhost instead of Databricks Apps
2. App was accessed via direct URL instead of workspace launch
3. App wasn't properly deployed as a Databricks App

**Solutions:**
1. Deploy app using: `npm run deploy:apps`
2. Launch from Databricks workspace Apps menu
3. Never access the app URL directly

### Error: "Unity Catalog API Error"

**Symptoms:**
- API calls return 401/403 errors
- Console shows permission-related errors
- Catalog metadata fails to load

**Causes:**
1. App lacks required Unity Catalog permissions
2. User doesn't have Unity Catalog access
3. App manifest permissions not properly configured

**Solutions:**
1. Verify app.yaml has required permissions
2. Check user's Unity Catalog access in workspace
3. Contact workspace admin for permission grants

### Error: "Warehouse not found"

**Symptoms:**
- SQL queries fail with warehouse errors
- Console shows warehouse configuration issues
- App can't execute queries

**Causes:**
1. Warehouse ID not configured
2. User lacks warehouse access
3. Warehouse is stopped or doesn't exist

**Solutions:**
1. Verify warehouse ID in environment
2. Check warehouse status and permissions
3. Ensure warehouse is running

## 🔍 Debugging Steps

### Step 1: Check Browser Console

1. Open browser developer tools (F12)
2. Go to Console tab
3. Look for error messages and context validation logs
4. Copy all relevant error messages

### Step 2: Verify App Launch Method

- ❌ **Wrong**: Direct URL access
- ❌ **Wrong**: Localhost development server
- ✅ **Correct**: Launch from Databricks workspace Apps menu

### Step 3: Check App Permissions

1. In Databricks workspace, go to **Admin** → **Apps**
2. Find your app and check its permissions
3. Verify required Unity Catalog permissions are granted

### Step 4: Validate User Access

1. Check your user account has Unity Catalog access
2. Verify you can see catalogs/schemas in the workspace
3. Confirm you have access to the SQL Warehouse

## 📋 Troubleshooting Checklist

### Before Deploying

- [ ] App builds successfully: `npm run build`
- [ ] App configuration validated: `npm run verify:apps`
- [ ] Environment variables set correctly
- [ ] Databricks CLI authenticated: `databricks auth list`

### After Deploying

- [ ] App appears in workspace Apps menu
- [ ] App launches from workspace (not direct URL)
- [ ] Browser console shows successful context validation
- [ ] Unity Catalog metadata loads
- [ ] SQL queries execute successfully

### If Issues Persist

- [ ] Check workspace admin for Apps feature status
- [ ] Verify Unity Catalog is enabled
- [ ] Confirm app has correct permissions
- [ ] Review Databricks workspace logs
- [ ] Contact Databricks support

## 🆘 Getting Help

### Information to Collect

When seeking help, provide:

1. **Error Messages**: Copy all console errors
2. **App Manifest**: Contents of `app.yaml`
3. **Environment**: Workspace URL, user permissions
4. **Steps**: How you're launching the app
5. **Console Logs**: Full context validation output

### Support Channels

1. **Workspace Admin**: Check Apps feature and permissions
2. **Databricks Support**: For platform-level issues
3. **Project Issues**: For app-specific problems

### Support Ticket Template

```
Subject: Visual SQL Query Builder - Databricks Apps Context Error

Environment:
- Workspace: [your-workspace-url]
- User: [your-username]
- App: Visual SQL Query Builder

Issue:
[Describe the problem]

Steps to Reproduce:
1. [Step 1]
2. [Step 2]
3. [Step 3]

Error Messages:
[Copy console errors here]

App Manifest:
[Contents of app.yaml]

Console Logs:
[Context validation output]

Additional Context:
[Any other relevant information]
```

## 🎯 Quick Fixes

### Most Common Issues

1. **App running on localhost** → Deploy to Databricks Apps
2. **Direct URL access** → Launch from workspace Apps menu  
3. **Missing permissions** → Check app.yaml and user access
4. **Warehouse issues** → Verify warehouse configuration
5. **Context validation fails** → Ensure proper deployment

### Emergency Recovery

If the app is completely broken:

1. Stop any local development servers
2. Rebuild: `npm run build`
3. Redeploy: `npm run deploy:apps`
4. Launch from workspace Apps menu
5. Check console for successful validation

## 📚 Additional Resources

- [Databricks Apps Documentation](https://docs.databricks.com/apps/index.html)
- [Unity Catalog Permissions](https://docs.databricks.com/data-governance/unity-catalog/manage-permissions.html)
- [Databricks CLI Setup](https://docs.databricks.com/dev-tools/cli/index.html)
- [Project README](./README.md) - Complete setup instructions

---

**Remember**: This app is designed specifically for Databricks Apps and must be deployed and launched from within your Databricks workspace. Running it on localhost will result in context errors and API failures.
