# Visual SQL Query Builder for Databricks

A modern, intuitive visual interface for building SQL queries with Unity Catalog integration, designed specifically for Databricks environments.

![Visual SQL Query Builder](./assets/visual-query-builder.png)

## Features

### Core Components

- **🗂️ Catalog Explorer Panel** - Browse Unity Catalog schemas, tables, and columns with search functionality and drag-and-drop support
- **📊 Data Profiling & Preview** - View data profiles, sample data, statistics, and distribution histograms for tables and columns
- **🎨 Visual Canvas** - Drag-and-drop interface for tables, joins, filters, and aggregations with visual relationship mapping
- **⚡ Live SQL Editor** - Real-time SQL generation with Monaco editor, syntax highlighting, and bidirectional sync
- **📈 Instant Query Preview** - Auto-refreshing query results with table and chart visualization options

### Key Features

- **Auto-refresh Results** - Query results update automatically as you modify the visual canvas
- **Databricks Brand Design** - Clean, modern UI following Databricks design principles
- **Responsive Layout** - Works seamlessly from desktop to smaller browser windows
- **Accessibility Support** - Keyboard navigation, ARIA labels, and screen reader compatibility
- **Query Persistence** - Import/export SQL statements, copy queries for dashboards or jobs
- **Performance Insights** - Execution time tracking and query optimization hints

## Architecture

Built with modern web technologies optimized for Databricks environments:

- **Frontend**: React 18 with TypeScript
- **Styling**: Tailwind CSS with Databricks brand colors
- **Drag & Drop**: React Flow for visual canvas interactions
- **Code Editor**: Monaco Editor (VS Code engine) with SQL syntax highlighting
- **Charts**: Recharts for data visualization
- **API Integration**: Databricks REST API and SQL Warehouse connectivity

## Quick Start

### Prerequisites

- Node.js 18+ and npm/yarn
- Access to a Databricks workspace
- Unity Catalog enabled workspace
- SQL Warehouse configured and running

### Installation

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd visualquerybuilder
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp env.example .env
   ```
   
   Configure your `.env` file with your actual Databricks credentials:
   ```env
   DATABRICKS_HOST=https://your-workspace.cloud.databricks.com
   DATABRICKS_TOKEN=your-personal-access-token
   DATABRICKS_WAREHOUSE_ID=your-warehouse-id
   DATABRICKS_APP_PORT=3000
   ```
   
   **How to get your credentials:**
   - **Workspace URL**: Copy from your browser when in Databricks (e.g., `https://dbc-12345678-1234.cloud.databricks.com`)
   - **Personal Access Token**: Databricks workspace → User Settings → Access Tokens → Generate New Token
   - **Warehouse ID**: Databricks workspace → SQL → Warehouses → Copy ID from your warehouse

3. **Start development server:**
   ```bash
   npm run dev
   ```

4. **Build for production:**
   ```bash
   npm run build
   ```

### Databricks App Deployment

1. **Prepare the application:**
   ```bash
   npm run build
   npm start  # Test production build locally
   ```

2. **Deploy to Databricks:**
   - Upload the entire project directory to your Databricks workspace
   - The `app.yaml` configuration file defines the app metadata and permissions
   - The app will bind to `0.0.0.0:${DATABRICKS_APP_PORT}` as required

3. **Configure permissions:**
   The app requires the following Unity Catalog permissions:
   - `CAN_MANAGE_CATALOG`
   - `CAN_USE_CATALOG`
   - `CAN_USE_SCHEMA`
   - `CAN_SELECT`
   - `CAN_USE_WAREHOUSE`

## Usage Guide

### Building Your First Query

1. **Browse the Catalog** - Use the left panel to explore your Unity Catalog
2. **Drag Tables** - Drag tables from the catalog to the visual canvas
3. **Create Joins** - Connect tables by dragging from column to column
4. **Add Filters** - Right-click on tables to add filter conditions
5. **Select Columns** - Click on columns to include them in your SELECT clause
6. **View Results** - Watch as your SQL updates in real-time and results auto-refresh

### Data Profiling

- **Select any table** to view row counts, column statistics, and sample data
- **Click on columns** to see detailed profiling including data types, null counts, and value distributions
- **Interactive charts** show data distribution patterns and help identify data quality issues

### SQL Editor Features

- **Live sync** - Visual changes update SQL immediately
- **Import/Export** - Load existing SQL files or save your queries
- **Syntax highlighting** - Full SQL syntax support with error detection
- **Auto-completion** - Smart suggestions for tables, columns, and SQL keywords

### Query Results

- **Table view** - Sortable, searchable results with pagination
- **Chart view** - Multiple visualization types (bar, line, pie, scatter, area)
- **Export options** - Download results as CSV
- **Performance metrics** - Execution time and row count tracking

## Development

### Project Structure

```
src/
├── components/          # React components
│   ├── catalog/        # Unity Catalog explorer
│   ├── canvas/         # Visual query canvas
│   ├── editor/         # SQL editor
│   ├── layout/         # App layout components
│   ├── preview/        # Query results and charts
│   └── profiling/      # Data profiling components
├── contexts/           # React context providers
├── services/           # API integration
├── types/              # TypeScript type definitions
└── utils/              # Utility functions
```

### Key Technologies

- **React Flow** - Powers the drag-and-drop visual canvas
- **Monaco Editor** - Provides the SQL editing experience
- **Recharts** - Handles all data visualization
- **Tailwind CSS** - Utility-first styling approach
- **TypeScript** - Type-safe development

### API Integration

The app integrates with Databricks through several REST API endpoints:

- **Unity Catalog API** - For metadata discovery
- **SQL Statement API** - For query execution
- **Warehouse API** - For compute resource management

### Development Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm start           # Start production server
npm run lint        # Run linter
npm run type-check  # TypeScript type checking
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABRICKS_HOST` | Your Databricks workspace URL | Required |
| `DATABRICKS_TOKEN` | Personal access token or service principal token | Required |
| `DATABRICKS_WAREHOUSE_ID` | SQL Warehouse ID for query execution | Required |
| `DATABRICKS_APP_PORT` | Port for the application server | 3000 |
| `NODE_ENV` | Environment mode | development |

### App Configuration

The `app.yaml` file configures the Databricks App:

```yaml
name: visual-sql-query-builder
display_name: Visual SQL Query Builder
description: A modern visual interface for building SQL queries

resources:
  - name: visual-sql-query-builder
    description: Main application server
    file_path: ./server.js
    port: "{{DATABRICKS_APP_PORT}}"

permissions:
  - permission: CAN_MANAGE_CATALOG
  - permission: CAN_USE_CATALOG
  - permission: CAN_USE_SCHEMA
  - permission: CAN_SELECT
  - permission: CAN_USE_WAREHOUSE
```

## Security & Best Practices

### Security Considerations

- **Input Validation** - All SQL inputs are validated and sanitized
- **Access Control** - Respects Unity Catalog permissions and row-level security
- **Token Management** - Secure handling of authentication tokens
- **HTTPS Only** - All API communications use HTTPS

### Performance Optimization

- **Lazy Loading** - Components load on demand to reduce initial bundle size
- **Query Caching** - Metadata and results are cached in memory
- **Debounced Execution** - Auto-refresh queries are debounced to prevent excessive API calls
- **Pagination** - Large result sets are paginated for better performance

### Logging & Monitoring

- **Structured Logging** - All logs output to stdout/stderr in JSON format
- **Error Tracking** - Comprehensive error handling with user-friendly messages
- **Performance Metrics** - Query execution times and API response times tracked

## QA Checklist

### Catalog Access Validation
- [ ] Unity Catalog metadata loads correctly
- [ ] Search functionality works across catalogs, schemas, and tables
- [ ] Drag-and-drop operations function properly
- [ ] Permission errors are handled gracefully

### Query Execution
- [ ] SQL generation matches visual canvas state
- [ ] Queries execute successfully against SQL Warehouse
- [ ] Results display correctly in both table and chart views
- [ ] Error messages are clear and actionable

### UI Fluidity
- [ ] Drag-and-drop interactions are smooth
- [ ] Canvas operations (zoom, pan) work correctly
- [ ] Responsive design works on various screen sizes
- [ ] Loading states provide appropriate feedback

### Error Handling
- [ ] Network errors are handled gracefully
- [ ] Invalid SQL queries show helpful error messages
- [ ] Permission errors display appropriate guidance
- [ ] Application recovers from errors without full reload

### Accessibility
- [ ] Keyboard navigation works throughout the app
- [ ] Screen readers can access all functionality
- [ ] Color contrast meets WCAG guidelines
- [ ] Focus indicators are visible and logical

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Code Style

- Use TypeScript for all new code
- Follow existing naming conventions
- Add JSDoc comments for public APIs
- Ensure responsive design principles
- Write accessible HTML with proper ARIA labels

## Troubleshooting

### Common Issues

**App won't start:**
- Check that all environment variables are set correctly
- Verify Databricks workspace access and token validity
- Ensure SQL Warehouse is running and accessible

**Catalog not loading:**
- Verify Unity Catalog permissions
- Check network connectivity to Databricks workspace
- Review browser console for API errors

**Queries failing:**
- Confirm SQL Warehouse is running
- Check query syntax in the SQL editor
- Verify table and column permissions

**Performance issues:**
- Clear browser cache and reload
- Check SQL Warehouse size and scaling settings
- Review query complexity and optimize if needed

### Support

For issues and questions:
1. Check the troubleshooting guide above
2. Review Databricks documentation for Unity Catalog and SQL Warehouses
3. Open an issue in the project repository
4. Contact your Databricks administrator for workspace-specific issues

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Built with ❤️ for the Databricks community
