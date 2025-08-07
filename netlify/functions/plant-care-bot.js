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
    const { question } = JSON.parse(event.body);
    console.log("Request body:", event.body);
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
    console.log("OpenAI response:", data);

    if (!response.ok) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to get AI response' })
      };
    }

    const answer = data.choices[0].message.content;
    const usage = data.usage;
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
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'An error occurred' })
    };
  }
};
