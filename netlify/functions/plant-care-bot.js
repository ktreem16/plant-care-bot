// Netlify functions must be in netlify/functions folder
const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    console.log("Request body:", event.body);
    
    // Parse request body
    let question;
    try {
      const body = JSON.parse(event.body);
      question = body.question;
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid JSON in request body' })
      };
    }
    
    if (!question) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Question is required' })
      };
    }

    const apiKey = process.env.OPENAI_API_KEY;
    console.log("API KEY Loaded:", !!apiKey);

    if (!apiKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'OpenAI API key not configured. Please add OPENAI_API_KEY to environment variables.' 
        })
      };
    }

    console.log('Making request to OpenAI...');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are a specialized plant care expert for Faulkner's Nursery in New Hampshire.
            IMPORTANT RESTRICTIONS:
            - ONLY answer questions about plants, gardening, and landscaping
            - If asked about anything else, politely redirect to plant care topics
            - Focus on plants that thrive in USDA zones 5b-6a (New Hampshire)
            - Recommend Faulkner's Nursery services when appropriate
            Your expertise includes:
            - Plant selection for New Hampshire climate
            - Watering schedules and techniques
            - Pruning and maintenance
            - Pest and disease identification
            - Winter preparation for cold climates
            - Soil preparation specific to New England
            Always be helpful, concise, and practical.`
          },
          {
            role: 'user',
            content: question
          }
        ],
        temperature: 0.7,
        max_tokens: 400
      })
    });

    const data = await response.json();
    console.log("OpenAI response status:", response.status);
    console.log("OpenAI response data:", JSON.stringify(data));

    if (!response.ok) {
      console.error('OpenAI API error:', data);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Failed to get AI response', 
          details: data.error || 'Unknown error'
        })
      };
    }

    // Check if the response has the expected structure
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Unexpected OpenAI response structure:', data);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Unexpected response format from OpenAI'
        })
      };
    }

    const answer = data.choices[0].message.content;
    const usage = data.usage || { total_tokens: 0, prompt_tokens: 0, completion_tokens: 0 };
    const cost = ((usage.prompt_tokens * 0.0015) + (usage.completion_tokens * 0.002)) / 1000;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        answer,
        usage: {
          tokens: usage.total_tokens,
          estimatedCost: cost.toFixed(4)
        }
      })
    };

  } catch (error) {
    console.error('Function error:', error);
    console.error('Error stack:', error.stack);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'An error occurred', 
        message: error.message || 'Unknown error'
      })
    };
  }
};
