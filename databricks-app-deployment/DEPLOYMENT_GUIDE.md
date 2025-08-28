# Databricks Apps Deployment Guide

## 🚀 Automated Deployment with Databricks CLI

This guide shows you how to deploy your Visual SQL Query Builder using the modern Databricks CLI with Apps support.

## 📋 Prerequisites

- **Databricks CLI v0.200+** (with `apps` command support)
- **Node.js 16+** and **npm**
- **Databricks workspace access** with Apps permissions
- **Unity Catalog access** for data operations

## 🔧 Quick Deployment

### Option 1: One-Command Deployment (Recommended)

```bash
# Build and deploy in one command
npm run build && /usr/local/bin/databricks apps deploy visual-query-builder \
  --source-code-path /Workspace/Users/fpatano@gmail.com/visual-query-builder
```

### Option 2: Step-by-Step Deployment

1. **Build the application**:
   ```bash
   npm run build
   ```

2. **Deploy to Databricks Apps**:
   ```bash
   /usr/local/bin/databricks apps deploy visual-query-builder \
     --source-code-path /Workspace/Users/fpatano@gmail.com/visual-query-builder
   ```

3. **Verify deployment**:
   ```bash
   /usr/local/bin/databricks apps get visual-query-builder
   ```

## 📦 What Gets Deployed

- `app.yaml` - App configuration and permissions
- `server.js` - Node.js server for the app
- `package.json` - Dependencies and scripts
- `dist/` - Built React application
- `requirements.txt` - Python dependencies (if needed)

## 🌐 App Access

After successful deployment, your app will be available at:
- **Apps Menu**: Navigate to Apps in your Databricks workspace
- **Direct URL**: The CLI will provide the app URL
- **App Name**: `visual-query-builder`

## ✅ Verification Steps

After deployment, verify:

1. **App status shows `SUCCEEDED`**:
   ```bash
   /usr/local/bin/databricks apps get visual-query-builder
   ```

2. **App launches successfully** from the Apps menu
3. **Browser console shows** successful Databricks Apps context validation
4. **Unity Catalog metadata loads** without errors
5. **SQL queries execute** successfully

## 🔄 Updating the App

To deploy updates:

```bash
# Build the new version
npm run build

# Deploy the update
/usr/local/bin/databricks apps deploy visual-query-builder \
  --source-code-path /Workspace/Users/fpatano@gmail.com/visual-query-builder
```

## 🚨 Important Notes

- **Never run this app on localhost** - it will show context errors
- **Always launch from Databricks workspace** Apps menu
- **Ensure you have Unity Catalog access** in your workspace
- **Contact workspace admin** if you lack required permissions

## 🔍 Troubleshooting

### If Deployment Fails

1. **Check CLI version**: Ensure you have `databricks CLI v0.200+`
2. **Verify authentication**: Run `databricks configure --help`
3. **Check workspace path**: Use `/Workspace/Users/...` format
4. **Verify permissions**: Ensure you have Apps deployment rights

### If App Shows "Databricks Apps Context Required"

1. **Verify app is launched** from workspace Apps menu (not direct URL)
2. **Check app permissions** in Admin → Apps
3. **Ensure Unity Catalog is enabled** in your workspace
4. **Verify user permissions** for Unity Catalog access

### If Unity Catalog API Errors

1. **Check app manifest permissions** match your workspace settings
2. **Verify user has Unity Catalog access**
3. **Check workspace admin** for permission grants

### If Warehouse Errors

1. **Ensure SQL Warehouse is configured** and running
2. **Verify user has warehouse access**
3. **Check warehouse ID configuration**

## 📞 Getting Help

If issues persist:

1. **Check browser console** for detailed error messages
2. **Verify app configuration** and permissions
3. **Contact your workspace administrator**
4. **Check Databricks Apps documentation**

## 🎯 Success Indicators

- ✅ App deploys successfully with CLI
- ✅ App status shows `SUCCEEDED`
- ✅ App launches from workspace Apps menu
- ✅ Console shows "Databricks Apps context is valid and ready!"
- ✅ Unity Catalog metadata loads successfully
- ✅ SQL queries execute without errors
- ✅ No "localhost" or "context required" errors

## 🔧 CLI Commands Reference

### App Management
```bash
# List all apps
databricks apps list

# Get app details
databricks apps get visual-query-builder

# Deploy app
databricks apps deploy visual-query-builder --source-code-path /path/to/source

# Delete app (if needed)
databricks apps delete visual-query-builder
```

### Workspace Operations
```bash
# List workspace contents
databricks workspace list /Users/fpatano@gmail.com/visual-query-builder

# Upload files
databricks workspace import local-file.py /Users/fpatano@gmail.com/path/
```

---

**Remember**: This app is designed exclusively for Databricks Apps and must be deployed and launched from within your Databricks workspace.
