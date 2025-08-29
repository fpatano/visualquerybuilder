import { executeDatabricksQuery } from './databricksApi';
import { QueryMetadata, AISummaryResult, AISummaryError } from '../types/aiSummary';

// Funny error messages and robot emojis
const FUNNY_ERROR_MESSAGES = [
  "Oops! My circuits got a bit tangled. Let me reboot my humor module! 🤖",
  "Well, this is embarrassing... My AI brain had a brain fart! 🤖💨",
  "Error 404: My common sense seems to have wandered off! 🤖🔍",
  "Houston, we have a problem... and it's not the coffee machine! 🤖☕",
  "My neural networks are having a party without me! 🤖🎉",
  "Something went wrong, but at least I'm still cute! 🤖✨",
  "Error: My intelligence quotient took a vacation! 🤖🏖️",
  "Well, this is a plot twist I didn't see coming! 🤖🎭"
];

const ROBOT_EMOJIS = ['🤖', '🤖💫', '🤖✨', '🤖🎭', '🤖🎪', '🤖🎨', '🤖🎸', '🤖🎯'];

function getRandomFunnyError(): { message: string; emoji: string } {
  const message = FUNNY_ERROR_MESSAGES[Math.floor(Math.random() * FUNNY_ERROR_MESSAGES.length)];
  const emoji = ROBOT_EMOJIS[Math.floor(Math.random() * ROBOT_EMOJIS.length)];
  return { message, emoji };
}

function generateQueryHash(queryText: string): string {
  // Simple hash function for caching
  let hash = 0;
  for (let i = 0; i < queryText.length; i++) {
    const char = queryText.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

function extractBusinessContext(tableNames: string[]): string {
  const businessHints: string[] = [];
  
  tableNames.forEach(tableName => {
    const lowerName = tableName.toLowerCase();
    if (lowerName.includes('customer') || lowerName.includes('cust')) {
      businessHints.push('customer analysis');
    }
    if (lowerName.includes('order') || lowerName.includes('sale')) {
      businessHints.push('sales analysis');
    }
    if (lowerName.includes('product') || lowerName.includes('item')) {
      businessHints.push('product analysis');
    }
    if (lowerName.includes('user') || lowerName.includes('account')) {
      businessHints.push('user behavior analysis');
    }
    if (lowerName.includes('performance') || lowerName.includes('metric')) {
      businessHints.push('performance metrics');
    }
    if (lowerName.includes('transaction') || lowerName.includes('payment')) {
      businessHints.push('financial analysis');
    }
  });
  
  if (businessHints.length === 0) {
    businessHints.push('data exploration');
  }
  
  return businessHints.slice(0, 3).join(', ');
}

export async function generateAISummary(
  queryText: string, 
  metadata: QueryMetadata
): Promise<AISummaryResult> {
  try {
    const queryHash = generateQueryHash(queryText);
    
    const aiQuery = `
      SELECT ai_query(
        'databricks-meta-llama-3-3-70b-instruct',
        CONCAT(
          'You are a data analyst. Based on this SQL query and table metadata, provide a brief business summary of what this query explores. ',
          'Keep your response to 4 sentences maximum. ',
          'Focus on what business question this query answers and what insights it could provide. ',
          'SQL Query: ', '${queryText.replace(/'/g, "''")}', ' ',
          'Tables: ', '${metadata.tableNames.join(', ')}', ' ',
          'Business Context: ', '${metadata.businessContext}', ' ',
          'Query Complexity: ', '${metadata.queryComplexity.tableCount} tables, ${metadata.queryComplexity.joinCount} joins, ${metadata.queryComplexity.filterCount} filters'
        )
      ) as ai_summary
    `;
    
    const result = await executeDatabricksQuery(aiQuery);
    
    // Find the ai_summary column index
    const aiSummaryColumnIndex = result.columns.findIndex(col => col === 'ai_summary');
    const summary = aiSummaryColumnIndex >= 0 && result.rows?.[0]?.[aiSummaryColumnIndex] 
      ? String(result.rows[0][aiSummaryColumnIndex])
      : 'Unable to generate summary';
    
    return {
      summary,
      metadata,
      timestamp: Date.now(),
      queryHash
    };
    
  } catch (error) {
    const { message, emoji } = getRandomFunnyError();
    throw {
      error: error instanceof Error ? error.message : 'Unknown error',
      funnyMessage: message,
      robotEmoji: emoji
    } as AISummaryError;
  }
}

export function createQueryMetadata(
  tables: any[], 
  joins: any[], 
  filters: any[], 
  aggregations: any[]
): QueryMetadata {
  const tableNames = tables.map(t => `${t.catalog}.${t.schema}.${t.name}`);
  const businessContext = extractBusinessContext(tableNames);
  
  return {
    tableNames,
    businessContext,
    queryComplexity: {
      tableCount: tables.length,
      joinCount: joins.length,
      filterCount: filters.length,
      aggregationCount: aggregations.length
    }
  };
}

function generateFallbackSummary(queryText: string, metadata: QueryMetadata): string {
  const tableCount = metadata.queryComplexity.tableCount;
  const joinCount = metadata.queryComplexity.joinCount;
  const filterCount = metadata.queryComplexity.filterCount;
  
  let summary = `This query analyzes data from ${tableCount} table${tableCount > 1 ? 's' : ''}`;
  
  if (joinCount > 0) {
    summary += ` with ${joinCount} join${joinCount > 1 ? 's' : ''} between them`;
  }
  
  if (filterCount > 0) {
    summary += ` and applies ${filterCount} filter${filterCount > 1 ? 's' : ''}`;
  }
  
  summary += `. The business context suggests this is a ${metadata.businessContext} query. `;
  
  if (metadata.tableNames.some(name => name.toLowerCase().includes('customer'))) {
    summary += "This appears to be analyzing customer behavior and purchasing patterns.";
  } else if (metadata.tableNames.some(name => name.toLowerCase().includes('order') || name.toLowerCase().includes('sale'))) {
    summary += "This appears to be analyzing sales performance and order data.";
  } else if (metadata.tableNames.some(name => name.toLowerCase().includes('product'))) {
    summary += "This appears to be analyzing product performance and inventory data.";
  } else {
    summary += "This query explores relationships between different data entities to provide business insights.";
  }
  
  return summary;
}
