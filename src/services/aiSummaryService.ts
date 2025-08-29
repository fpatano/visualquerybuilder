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
    
    console.log('🤖 Generating AI summary for query:', queryText.substring(0, 100) + '...');
    console.log('📊 Metadata:', metadata);
    
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
    
    console.log('🤖 Executing AI query:', aiQuery);
    
    const result = await executeDatabricksQuery(aiQuery);
    
    console.log('🤖 AI query result received:', result);
    console.log('🤖 Result columns:', result.columns);
    console.log('🤖 Result rows:', result.rows);
    console.log('🤖 Result error:', result.error);
    
    // Check if there was an error in the query execution
    if (result.error) {
      console.error('🤖 Query execution failed with error:', result.error);
      throw new Error(`AI query execution failed: ${result.error}`);
    }
    
    // Handle different response formats from ai_query function
    let summary: string;
    
    if (result.columns && result.columns.length > 0) {
      // Standard format: columns and rows
      const aiSummaryColumnIndex = result.columns.findIndex(col => col === 'ai_summary');
      console.log('🤖 AI summary column index:', aiSummaryColumnIndex);
      
      if (aiSummaryColumnIndex === -1) {
        console.error('🤖 ai_summary column not found in result. Available columns:', result.columns);
        throw new Error('AI summary column not found in result');
      }
      
      if (!result.rows || result.rows.length === 0) {
        console.error('🤖 No rows returned from AI query');
        throw new Error('No rows returned from AI query');
      }
      
      summary = result.rows[0]?.[aiSummaryColumnIndex];
      console.log('🤖 Raw summary value from column:', summary);
      
    } else if (result.rows && result.rows.length > 0) {
      // Alternative format: no columns but has rows (ai_query might return data differently)
      console.log('🤖 No columns returned, checking rows directly');
      
      if (Array.isArray(result.rows[0])) {
        // If rows[0] is an array, take the first element
        summary = result.rows[0][0];
        console.log('🤖 Raw summary value from first array element:', summary);
      } else {
        // If rows[0] is not an array, use it directly
        summary = result.rows[0];
        console.log('🤖 Raw summary value from first row:', summary);
      }
      
    } else {
      console.error('🤖 No columns or rows returned from AI query');
      throw new Error('No columns or rows returned from AI query');
    }
    
    if (!summary) {
      console.error('🤖 Summary value is null/undefined');
      throw new Error('Summary value is null/undefined');
    }
    
    const summaryText = String(summary);
    console.log('🤖 Final summary text:', summaryText);
    
    return {
      summary: summaryText,
      metadata,
      timestamp: Date.now(),
      queryHash
    };
    
  } catch (error) {
    console.error('🤖 AI summary generation failed:', error);
    
    // Generate fallback summary on any error
    const fallbackSummary = generateFallbackSummary(queryText, metadata);
    console.log('🤖 Using fallback summary due to error:', fallbackSummary);
    
    return {
      summary: fallbackSummary,
      metadata,
      timestamp: Date.now(),
      queryHash: generateQueryHash(queryText)
    };
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
