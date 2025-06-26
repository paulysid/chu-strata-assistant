exports.handler = async (event, context) => {
  // Handle CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Get API key from environment
    const API_KEY = process.env.CLAUDE_API_KEY;
    
    if (!API_KEY) {
      console.error('CLAUDE_API_KEY environment variable not set');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Server configuration error: API key not found',
          hint: 'Administrator: Set CLAUDE_API_KEY environment variable'
        }),
      };
    }

    // Parse request
    const { prompt } = JSON.parse(event.body || '{}');
    
    if (!prompt) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Prompt is required' }),
      };
    }

    console.log('Calling Claude API...');

    // Call Claude API with correct model name
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022', // Updated model name
        max_tokens: 1500,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    console.log('Claude API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API Error:', response.status, errorText);
      
      // Handle specific error codes
      if (response.status === 401) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            error: 'Authentication failed - Invalid API key',
            hint: 'Administrator: Check CLAUDE_API_KEY environment variable'
          }),
        };
      }
      
      if (response.status === 404) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            error: 'Claude API endpoint not found - Possible model name issue',
            hint: 'Administrator: Check model name or API endpoint'
          }),
        };
      }
      
      if (response.status === 429) {
        return {
          statusCode: 429,
          headers,
          body: JSON.stringify({ 
            error: 'Rate limit exceeded - Too many requests',
            hint: 'Please try again in a moment'
          }),
        };
      }
      
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({ 
          error: `Claude API Error: ${response.status}`,
          details: errorText,
          hint: 'Administrator: Check Claude API status and credentials'
        }),
      };
    }

    const data = await response.json();
    console.log('Claude API success');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data),
    };

  } catch (error) {
    console.error('Function Error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error.message,
        hint: 'Administrator: Check function logs for details'
      }),
    };
  }
};
