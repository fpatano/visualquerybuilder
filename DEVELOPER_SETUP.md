# Developer Setup Guide

This guide helps developers set up the Visual SQL Query Builder for local development, including the new authentication system.

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+** and npm/yarn
- **Git** for version control
- **Access to a Databricks workspace** (for testing)

### 1. Clone and Setup
```bash
# Clone the repository
git clone <repository-url>
cd visualquerybuilder

# Install dependencies
npm install

# Copy environment template
cp env.example .env
```

### 2. Configure Authentication
Edit your `.env` file with your Databricks credentials:

```env
# Required for local development
DATABRICKS_HOST=https://your-workspace.cloud.databricks.com
DATABRICKS_TOKEN=your-personal-access-token
DATABRICKS_WAREHOUSE_ID=your-warehouse-id

# Optional
NODE_ENV=development
LOG_LEVEL=debug
```

### 3. Test Setup
```bash
# Verify environment configuration
npm run check

# Test authentication system
npm run test:auth

# Start development servers
npm run dev
```

## 🔐 Authentication System

### How It Works

The app automatically detects your environment and uses appropriate authentication:

- **Local Development**: Uses `DATABRICKS_TOKEN` from your `.env` file
- **Databricks Apps**: Automatically uses runtime-provided user tokens

### Getting Your Credentials

1. **Workspace URL** (`DATABRICKS_HOST`)
   - Open your Databricks workspace in a browser
   - Copy the URL (e.g., `https://dbc-12345678-1234.cloud.databricks.com`)

2. **Personal Access Token** (`DATABRICKS_TOKEN`)
   - In Databricks: User Settings → Access Tokens → Generate New Token
   - **⚠️ Never commit this token to version control**

3. **Warehouse ID** (`DATABRICKS_WAREHOUSE_ID`)
   - In Databricks: SQL → Warehouses → Copy ID from your warehouse

### Testing Authentication

```bash
# Test the complete authentication system
npm run test:auth

# Test individual components
curl http://localhost:3000/api/whoami
curl -X POST http://localhost:3000/api/warehouse/test
```

## 🛠️ Development Scripts

### Available Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development servers (frontend + backend) |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run check` | Verify environment configuration |
| `npm run test:auth` | Test authentication system |

### Scripts Directory

The `scripts/` directory contains helpful development tools:

```bash
# Start both servers with health checks
./scripts/start.sh

# Stop all servers
./scripts/stop.sh

# Complete fresh start (clean + rebuild + start)
./scripts/fresh-start.sh

# View server logs
./scripts/logs.sh

# Clean build artifacts
./scripts/clean.sh

# Rebuild dependencies
./scripts/rebuild.sh
```

## 🏗️ Project Structure

```
src/
├── components/          # React components
│   ├── canvas/         # Visual query canvas
│   ├── catalog/        # Unity Catalog explorer
│   ├── editor/         # SQL editor
│   ├── layout/         # App layout
│   ├── preview/        # Query results
│   └── profiling/      # Data profiling
├── contexts/           # React context providers
├── services/           # API integration
├── types/              # TypeScript definitions
└── utils/              # Utility functions
    ├── auth-utils.js   # Authentication utilities
    ├── db-connection.js # Database connection utilities
    └── sql-transpiler/ # SQL parsing and generation
```

## 🔧 Development Workflow

### 1. Making Changes
```bash
# Start development servers
npm run dev

# Make your changes in src/
# Frontend auto-reloads at http://localhost:5173
# Backend runs at http://localhost:3000
```

### 2. Testing Changes
```bash
# Test authentication system
npm run test:auth

# Verify environment
npm run check

# Test specific endpoints
curl http://localhost:3000/health
curl http://localhost:3000/api/whoami
```

### 3. Building and Testing
```bash
# Build for production
npm run build

# Test production build
npm start

# Stop production server
./scripts/stop.sh
```

## 🧪 Testing

### Authentication Tests
```bash
# Run complete authentication test suite
npm run test:auth

# Test with different scenarios
TEST_FORWARDED_TOKEN=test-token npm run test:auth
```

### Manual Testing
```bash
# Test health endpoint
curl http://localhost:3000/health

# Test authentication
curl http://localhost:3000/api/whoami

# Test database connectivity
curl -X POST http://localhost:3000/api/warehouse/test

# Test query execution
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{"sql": "SELECT 1 as test"}'
```

## 🚨 Troubleshooting

### Common Issues

#### 1. "DATABRICKS_TOKEN environment variable is required"
**Solution**: Add your token to `.env` file
```bash
echo "DATABRICKS_TOKEN=your-actual-token" >> .env
```

#### 2. "No access token found in Databricks Apps environment"
**Solution**: This is expected in local development. Check your `.env` file.

#### 3. "Database connection failed"
**Solutions**:
- Verify your token is valid
- Check warehouse is running
- Ensure network connectivity to Databricks

#### 4. Servers won't start
**Solutions**:
```bash
# Kill stuck processes
./scripts/stop.sh

# Clean and rebuild
./scripts/fresh-start.sh

# Check logs
./scripts/logs.sh
```

### Debug Mode
```bash
# Enable debug logging
LOG_LEVEL=debug npm start

# Check environment
npm run check

# Test authentication
npm run test:auth
```

## 🔒 Security Best Practices

### For Developers
1. **Never commit tokens** to version control
2. **Use .env files** for local development
3. **Test authentication** before committing changes
4. **Handle errors gracefully** without exposing sensitive information

### Environment Variables
```bash
# ✅ Good - in .env file (not committed)
DATABRICKS_TOKEN=dapi1234567890abcdef

# ❌ Bad - hardcoded in code
const token = 'dapi1234567890abcdef';
```

## 📚 Additional Resources

### Documentation
- **`AUTHENTICATION.md`** - Complete authentication system guide
- **`README.md`** - Main project documentation
- **`scripts/README.md`** - Development scripts guide

### API Reference
- **Health**: `GET /health`
- **Authentication**: `GET /api/whoami`
- **Configuration**: `GET /api/config`
- **Warehouse Status**: `GET /api/warehouse/status`
- **Query Execution**: `POST /api/query`

### Databricks Resources
- [Databricks Personal Access Tokens](https://docs.databricks.com/dev-tools/auth.html#personal-access-tokens)
- [Unity Catalog Permissions](https://docs.databricks.com/data-governance/unity-catalog/manage-permissions.html)
- [SQL Warehouse Management](https://docs.databricks.com/sql/admin/warehouse-type.html)

## 🤝 Contributing

### Before Submitting Changes
1. **Test locally** with `npm run test:auth`
2. **Verify environment** with `npm run check`
3. **Test endpoints** manually
4. **Check logs** for any errors
5. **Ensure no tokens** are committed

### Code Review Checklist
- [ ] Authentication working in both environments
- [ ] No hardcoded credentials
- [ ] Proper error handling
- [ ] Tests passing
- [ ] Environment variables documented

---

**🎉 You're now ready to contribute to the Visual SQL Query Builder with full authentication support!**

For questions or issues, check the troubleshooting section above or refer to the main documentation.
