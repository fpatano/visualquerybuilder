# Visual SQL Query Builder

A modern, visual SQL query builder application built for Databricks Unity Catalog. This application provides an intuitive interface for building, executing, and analyzing SQL queries with real-time data preview and profiling capabilities.

## Features

- **Visual Query Builder**: Drag-and-drop interface for building SQL queries
- **Unity Catalog Integration**: Browse and explore catalogs, schemas, tables, and columns
- **Real-time Query Execution**: Execute SQL queries against Databricks SQL Warehouses
- **Data Profiling**: Comprehensive data analysis and statistics
- **Results Visualization**: Charts and tables for query results
- **User Authorization**: Respects Unity Catalog permissions and row-level security
- **Sample Queries**: 3 curated TPC-DS queries demonstrating progressive complexity

## Quick Start - Databricks Apps Deployment

### 1. Add Repository to Databricks

1. In your Databricks workspace, go to **Repos**
2. Click **Add Repo** and connect this repository
3. Give it a name (e.g., `visual-query-builder`)

### 2. Create Databricks App

1. Go to **Compute > Apps**
2. Click **Create App**
3. Fill in the basic information:
   - **Name**: `visual-query-builder` (or your preferred name)
   - **Description**: "Build queries visually"
   - **Source**: Select the repo you just added

### 3. Configure App Resources

In the **Configure** step, set up:

**App Resources:**
- Click **"+ Add resource"**
- Select **SQL warehouse** → Choose your warehouse
- Set **Permission** to "Can use"
- Set **Resource key** to `sql-warehouse`

**User Authorization Scopes:**
- Click **"+ Add scope"** and add these required scopes:
  - `sql` - Execute SQL and manage SQL resources
  - `catalog.connections` - Manage external connections
  - `catalog.catalogs:read` - Read catalogs
  - `catalog.schemas:read` - Read schemas  
  - `catalog.tables:read` - Read tables
  - `dashboards.genie` - Manage Genie spaces
  - `files.files` - Manage files and directories

### 4. Deploy

1. Click **Save** to complete configuration
2. Click **Deploy** to start the app
3. Wait for the build process to complete
4. Your app will be available at the provided URL

## Local Development

### Prerequisites

- Node.js 18+ and npm
- Databricks workspace with Unity Catalog enabled
- SQL Warehouse configured
- Databricks Apps enabled in your workspace

### Setup

```bash
# Clone and install
git clone <repository-url>
cd visualquerybuilder
npm install

# Copy environment template
cp env.example .env

# Edit .env with your Databricks settings
DATABRICKS_HOST=dbc-your-workspace.cloud.databricks.com
DATABRICKS_TOKEN=your-personal-access-token
DATABRICKS_WAREHOUSE_ID=your-warehouse-id

# Start development server
npm run dev
```

The application will be available at `http://localhost:5173`

### Build and Deploy

```bash
npm run build
npm start
```

## Sample Queries

The repository includes 3 curated TPC-DS sample queries to get you started:

- **🌱 Beginner**: `samples/01_customer_demographics.sql` (2-table joins)
- **🌿 Intermediate**: `samples/02_store_sales_performance.sql` (3-table joins)  
- **🌳 Advanced**: `samples/03_customer_purchase_journey.sql` (4-table joins)

## Architecture

This application uses a **dual authentication model**:

1. **Service Principal Authentication** (App-level operations)
   - Used for: App configuration, logging, shared resources
   - Configured via: `DATABRICKS_CLIENT_ID` and `DATABRICKS_CLIENT_SECRET` (auto-configured in Databricks Apps)

2. **User Authorization** (On-behalf-of-user operations)
   - Used for: Unity Catalog access, SQL queries, user-specific data
   - Automatically handled via: `x-forwarded-access-token` header from Databricks Apps

## Environment Variables

### For Local Development
```bash
DATABRICKS_HOST=dbc-your-workspace.cloud.databricks.com
DATABRICKS_TOKEN=your-personal-access-token
DATABRICKS_WAREHOUSE_ID=your-warehouse-id
```

### For Databricks Apps (Auto-configured)
The following environment variables are automatically set by Databricks Apps:
```bash
DATABRICKS_APP_NAME=visual-query-builder
DATABRICKS_APP_PORT=8008
DATABRICKS_APP_URL=https://your-app.aws.databricksapps.com
DATABRICKS_CLIENT_ID=your-service-principal-id
DATABRICKS_CLIENT_SECRET=your-service-principal-secret
DATABRICKS_HOST=dbc-your-workspace.cloud.databricks.com
DATABRICKS_SERVER_HOSTNAME=dbc-your-workspace.cloud.databricks.com
DATABRICKS_WAREHOUSE_ID=your-warehouse-id
DATABRICKS_WORKSPACE_ID=your-workspace-id
```

## API Endpoints

### Unity Catalog
- `GET /api/unity-catalog/catalogs` - List catalogs
- `GET /api/unity-catalog/schemas?catalog_name={name}` - List schemas
- `GET /api/unity-catalog/tables?catalog_name={name}&schema_name={name}` - List tables
- `GET /api/unity-catalog/columns?catalog_name={name}&schema_name={name}&table_name={name}` - List columns

### SQL Execution
- `POST /api/databricks/2.0/sql/statements` - Execute SQL statement
- `GET /api/databricks/2.0/sql/statements/{id}` - Get statement status

### Warehouse Management
- `POST /api/warehouse/status` - Check warehouse status

## Troubleshooting

### Common Issues

1. **"No access token found" Error**
   - Ensure you're running in Databricks Apps environment
   - Check that user authorization scopes are properly configured
   - Verify the app has access to the SQL warehouse

2. **Unity Catalog Access Denied**
   - Verify user has proper permissions in Unity Catalog
   - Check that required scopes are enabled in app configuration
   - Ensure row-level security policies allow access

3. **Warehouse Connection Issues**
   - Verify warehouse ID is correct
   - Check warehouse is running and accessible
   - Ensure app has "Can use" permission on warehouse

### Debug Information

Enable debug logging by setting `LOG_LEVEL=debug` in your environment.

Check the browser console and server logs for detailed error information.

## Security Best Practices

1. **Never commit `.env` files** to version control
2. **Use least privilege** for app permissions
3. **Enable audit logging** for all user operations
4. **Regularly rotate** service principal credentials
5. **Monitor app usage** and access patterns

## Development

### Project Structure

```
src/
├── components/          # React components
│   ├── canvas/         # Visual query builder
│   ├── catalog/        # Unity Catalog browser
│   ├── editor/         # SQL editor
│   ├── layout/         # Application layout
│   ├── preview/        # Query results
│   └── profiling/      # Data profiling
├── contexts/           # React contexts
├── services/           # API services
├── types/              # TypeScript types
└── utils/              # Utility functions
samples/                 # Sample TPC-DS queries
├── 01_customer_demographics.sql      # Beginner (2 tables)
├── 02_store_sales_performance.sql    # Intermediate (3 tables)
└── 03_customer_purchase_journey.sql  # Advanced (4 tables)
```

### Adding New Features

1. Create components in appropriate directories
2. Add types to `src/types/index.ts`
3. Implement API endpoints in `server.js`
4. Add frontend services in `src/services/`
5. Update authentication as needed

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

[Your License Here]

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review Databricks Apps documentation
3. Open an issue in the repository
4. Contact your Databricks administrator
