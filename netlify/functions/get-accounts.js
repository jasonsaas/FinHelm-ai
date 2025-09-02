exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { accessToken, realmId } = JSON.parse(event.body);
    
    if (!accessToken || !realmId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Missing access token or realm ID' })
      };
    }

    const environment = process.env.QUICKBOOKS_ENVIRONMENT || 'sandbox';
    const baseUrl = environment === 'production' 
      ? 'https://quickbooks.api.intuit.com' 
      : 'https://sandbox-quickbooks.api.intuit.com';
    
    // Query for all active accounts
    const query = "SELECT * FROM Account WHERE Active = true MAXRESULTS 20";
    const encodedQuery = encodeURIComponent(query);
    
    const response = await fetch(
      `${baseUrl}/v3/company/${realmId}/query?query=${encodedQuery}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('QuickBooks API error:', errorText);
      throw new Error(`QuickBooks API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(data)
    };
  } catch (error) {
    console.error('Accounts fetch error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        error: 'Failed to fetch accounts',
        details: error.message 
      })
    };
  }
};