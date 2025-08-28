# Databricks Apps Deployment Guide

## 🚀 Manual Deployment Instructions

Since your Databricks CLI version doesn't support Apps directly, follow these manual steps to deploy your Visual SQL Query Builder.

## 📦 What's in This Package

- `app.yaml` - App configuration and permissions
- `server.js` - Node.js server for the app
- `package.json` - Dependencies and scripts
- `dist/` - Built React application

## 🔧 Step-by-Step Deployment

### Step 1: Upload to Databricks Workspace

1. **Go to your Databricks workspace**
2. **Navigate to Workspace → Users → [Your Username]**
3. **Create a new folder**: `visual-query-builder`
4. **Upload all files** from this package to that folder

### Step 2: Configure as Databricks App

1. **In your Databricks workspace, go to Admin → Apps**
2. **Click "Create App"**
3. **Fill in the details**:
   - **Name**: `visual-query-builder`
   - **Display Name**: `Visual SQL Query Builder`
   - **Description**: `A modern visual interface for building SQL queries with Unity Catalog integration`
   - **Source Code Path**: `/Users/[your-username]/visual-query-builder`
   - **Entry Point**: `server.js`

### Step 3: Configure App Settings

1. **Environment Variables**:
   - `NODE_ENV`: `production`
   - `LOG_LEVEL`: `info`
   - `FEATURE_ALLOW_NO_DBRX`: `0`

2. **Permissions** (should be auto-configured from app.yaml):
   - `CAN_USE_CATALOG`
   - `CAN_USE_SCHEMA`
   - `CAN_SELECT`
   - `CAN_USE_WAREHOUSE`
   - `CAN_READ_CATALOG`
   - `CAN_READ_SCHEMA`
   - `CAN_READ_TABLE`
   - `CAN_READ_COLUMN`

### Step 4: Deploy and Launch

1. **Click "Deploy"** to deploy the app
2. **Wait for deployment** to complete
3. **Go to Apps** in the left sidebar
4. **Find "Visual SQL Query Builder"** and click **Launch**

## ✅ Verification Steps

After deployment, verify:

1. **App launches successfully** from the Apps menu
2. **Browser console shows** successful Databricks Apps context validation
3. **Unity Catalog metadata loads** without errors
4. **SQL queries execute** successfully

## 🚨 Important Notes

- **Never run this app on localhost** - it will show context errors
- **Always launch from Databricks workspace** Apps menu
- **Ensure you have Unity Catalog access** in your workspace
- **Contact workspace admin** if you lack required permissions

## 🔍 Troubleshooting

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

- ✅ App launches from workspace Apps menu
- ✅ Console shows "Databricks Apps context is valid and ready!"
- ✅ Unity Catalog metadata loads successfully
- ✅ SQL queries execute without errors
- ✅ No "localhost" or "context required" errors

---

**Remember**: This app is designed exclusively for Databricks Apps and must be deployed and launched from within your Databricks workspace.
