# Visual Query Builder - Development Scripts

These scripts help you manage the development environment, especially useful after computer sleeps or when you need a fresh start.

## Quick Commands

### 🔄 Fresh Start (Recommended after sleep/restart)
```bash
./scripts/fresh-start.sh
```
Complete clean + rebuild + start. Use this when:
- Computer woke up from sleep
- Servers seem stuck or unresponsive
- You want a completely clean environment

### 🚀 Start Servers
```bash
./scripts/start.sh
```
Start both backend (port 3000) and frontend (port 5173) servers.

### 🛑 Stop Servers
```bash
./scripts/stop.sh
```
Stop all running servers.

### 📋 View Logs
```bash
./scripts/logs.sh
```
Monitor server logs and status.

## Individual Commands

### 🧹 Clean Only
```bash
./scripts/clean.sh
```
Remove node_modules, build artifacts, and temp files.

### 🔨 Rebuild Only
```bash
./scripts/rebuild.sh
```
Install dependencies and build the project.

## Typical Workflow

1. **After computer sleep/restart:**
   ```bash
   ./scripts/fresh-start.sh
   ```

2. **Normal development:**
   ```bash
   ./scripts/start.sh    # Start servers
   # ... do your work ...
   ./scripts/stop.sh     # Stop when done
   ```

3. **If servers get stuck:**
   ```bash
   ./scripts/stop.sh
   ./scripts/start.sh
   ```

4. **If weird issues persist:**
   ```bash
   ./scripts/fresh-start.sh
   ```

## What Each Script Does

- **clean.sh**: Kills processes, removes node_modules, clears build artifacts
- **rebuild.sh**: Fresh npm install and build
- **start.sh**: Starts both servers with health checks
- **stop.sh**: Gracefully stops all servers
- **logs.sh**: Shows server status and logs
- **fresh-start.sh**: Runs clean → rebuild → start in sequence

## Access URLs

- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3000
- **Health Check**: http://localhost:3000/health
- **Authentication Test**: http://localhost:3000/api/whoami

## 🔐 Authentication Setup

### First Time Setup
1. **Copy environment template:**
   ```bash
   cp ../env.example ../.env
   ```

2. **Configure your .env file:**
   ```bash
   # Edit .env with your Databricks credentials
   DATABRICKS_HOST=https://your-workspace.cloud.databricks.com
   DATABRICKS_TOKEN=your-personal-access-token
   DATABRICKS_WAREHOUSE_ID=your-warehouse-id
   ```

3. **Test authentication:**
   ```bash
   npm run test:auth
   ```

### Troubleshooting Authentication
- **"DATABRICKS_TOKEN required"**: Add your token to .env file
- **"No access token found"**: Check your .env configuration
- **"Database connection failed"**: Verify warehouse is running and token is valid
