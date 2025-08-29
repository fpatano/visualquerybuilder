# Visual SQL Query Builder for Databricks

A modern, visual interface for building SQL queries with seamless Unity Catalog integration, designed specifically for Databricks Apps.

## 🚀 Quick Start

### Prerequisites

- **Databricks Workspace** with Apps feature enabled
- **Unity Catalog** access with required permissions
- **Databricks CLI** installed and authenticated
- **Node.js 18+** and npm

### Installation & Deployment

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd visualquerybuilder
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the application**
   ```bash
   npm run build
   ```

### Deployment Strategy

**🚀 For Quick Testing & Development:**
```bash
# Quick deployment to Databricks for testing
npm run deploy:test
# or
./deploy-new.sh
```
**Purpose**: Deploy current code to Databricks for testing and development feedback
**Features**: Fast build, deploy to Databricks, quick iteration

**🚀 For Production Releases:**
```bash
# Production deployment with full validation
npm run deploy:production
# or
./scripts/deploy-databricks-app.sh
```
**Purpose**: Production deployments with comprehensive validation and verification
**Features**: Full validation, comprehensive error checking, deployment verification

5. **Launch from Databricks Workspace**
   - Go to your Databricks workspace
   - Navigate to **Apps** in the left sidebar
   - Find "Visual SQL Query Builder" and click **Launch**

## 🔧 Databricks Apps Configuration

### Prerequisites

- **Databricks CLI v0.200+** with `apps` command support
- **Workspace Apps permissions** for deployment
- **Unity Catalog access** for data operations

### Required Permissions

The app requires the following Unity Catalog permissions:

```yaml
permissions:
  - permission: CAN_USE_CATALOG
  - permission: CAN_USE_SCHEMA
  - permission: CAN_SELECT
  - permission: CAN_USE_WAREHOUSE
  - permission: CAN_READ_CATALOG
  - permission: CAN_READ_SCHEMA
  - permission: CAN_READ_TABLE
  - permission: CAN_READ_COLUMN
```

### Environment Variables

The app automatically detects whether it's running in Databricks Apps or local development:

- **Databricks Apps**: Automatically configured by runtime
- **Local Development**: Requires manual configuration (see `.env.example`)

## 🚫 Important: Do Not Run on Localhost

**This application MUST be deployed as a Databricks App and launched from within the Databricks workspace.**

- ❌ **Never run on localhost** - will show "Databricks Apps context required" error
- ❌ **Never serve as static files** - will fail Unity Catalog API calls
- ✅ **Always deploy via Databricks Apps** and launch from workspace UI

## 🔍 Databricks Apps Debugging Checklist

### 1. Apps Context Test
- [ ] Verify `window.databricks` is available in browser console
- [ ] Check that context validation passes on app load
- [ ] Confirm app is running in Databricks Apps environment

### 2. Deployment Verification
- [ ] App is deployed via Databricks CLI: `databricks apps deploy`
- [ ] App appears in workspace Apps menu
- [ ] App launches from workspace UI (not direct URL access)

### 3. API Endpoint Validation
- [ ] Unity Catalog API calls use `/api/databricks/unity-catalog/*` routes
- [ ] API calls only execute when context is valid
- [ ] Clear error messages shown when context is invalid

### 4. Permission Check
- [ ] App manifest declares required Unity Catalog permissions
- [ ] Permissions are granted during app installation
- [ ] User has explicit Unity Catalog access in workspace

### 5. Console Logging
- [ ] Full context object logged on app load
- [ ] Environment details logged for debugging
- [ ] Warnings shown when not in app context

## 🛠️ Development

### Local Development (Limited)

For development purposes only, you can run the app locally with limited functionality:

```bash
# Set environment variables
cp .env.example .env
# Edit .env with your Databricks credentials

# Start development server
npm run dev

# Start backend server
npm start
```

**Note**: Local development will show the "Databricks Apps context required" error screen.

### Building for Production

```bash
npm run build
```

The build output in the `dist/` directory is what gets deployed to Databricks Apps.

### Updating Deployed App

To deploy updates to your running app:

```bash
# Build the new version
npm run build

# Deploy the update
/usr/local/bin/databricks apps deploy visual-query-builder \
  --source-code-path /Workspace/Users/fpatano@gmail.com/visual-query-builder
```

## 📋 Verification Scripts

### Validate Databricks Apps Configuration

```bash
node scripts/verify-databricks-apps.js
```

This script checks:
- App YAML configuration
- Package.json dependencies
- Build output
- Server configuration
- Environment setup

### Verify Environment

```bash
npm run check
```

Checks environment variables and connectivity.

## 🚨 Troubleshooting

### Common Issues

#### "Not running in Databricks Apps context"
- **Cause**: App is running on localhost or outside Databricks workspace
- **Solution**: Deploy as Databricks App and launch from workspace UI

#### "Unity Catalog API Error"
- **Cause**: Insufficient permissions or not in Apps context
- **Solution**: Verify app permissions and launch from workspace

#### "Warehouse not found"
- **Cause**: Warehouse ID not configured or user lacks access
- **Solution**: Check warehouse configuration and user permissions

### Debug Steps

1. **Check browser console** for detailed error messages
2. **Verify app is launched from Databricks workspace** (not direct URL)
3. **Check app permissions** in workspace admin settings
4. **Verify Unity Catalog access** for your user account
5. **Contact workspace admin** if issues persist

### Support

If you continue to experience issues:

1. Check the browser console for detailed error logs
2. Verify the app manifest and permissions
3. Ensure you're launching from the proper Databricks Apps context
4. Contact your Databricks workspace administrator
5. Raise a support ticket with Databricks including:
   - App manifest (`app.yaml`)
   - Console logs
   - Environment details
   - Steps to reproduce

## 📚 API Reference

### Unity Catalog Endpoints

- `GET /api/databricks/unity-catalog/catalogs` - List catalogs
- `GET /api/databricks/unity-catalog/schemas` - List schemas
- `GET /api/databricks/unity-catalog/tables` - List tables
- `GET /api/databricks/unity-catalog/columns` - List columns

### SQL Execution

- `POST /api/databricks/2.0/sql/statements` - Execute SQL queries

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test in Databricks Apps environment
5. Submit a pull request

## 📄 License

[Your License Here]

---

**Remember**: This app is designed specifically for Databricks Apps and must be deployed and launched from within your Databricks workspace. Running it on localhost will result in context errors and API failures.
