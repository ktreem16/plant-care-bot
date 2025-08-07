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
    console.log("API KEY length:", apiKey ? apiKey.length : 0);

    if (!apiKey) {
      // Return a test response if no API key is set
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          answer: '⚠️ The OpenAI API key is not configured. Please add OPENAI_API_KEY to your Netlify environment variables. Go to Netlify Dashboard > Site Settings > Environment Variables.',
          usage: {
            tokens: 0,
            estimatedCost: '0.0000'
          }
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
      
      // Check for specific error types
      if (response.status === 401) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            answer: '⚠️ Invalid API key. Please check your OPENAI_API_KEY in Netlify environment variables.',
            usage: {
              tokens: 0,
              estimatedCost: '0.0000'
            }
          })
        };
      }
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          answer: `⚠️ OpenAI API error: ${data.error?.message || 'Unknown error'}`,
          usage: {
            tokens: 0,
            estimatedCost: '0.0000'
          }
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
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    
    // Return a user-friendly error message
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        answer: `⚠️ An error occurred: ${error.message}. Please check the Netlify function logs for details.`,
        usage: {
          tokens: 0,
          estimatedCost: '0.0000'
        }
      })
    };
  }
};
