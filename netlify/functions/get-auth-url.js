const OAuthClient = require('intuit-oauth');

exports.handler = async (event, context) => {
  try {
    const oauthClient = new OAuthClient({
      clientId: process.env.QUICKBOOKS_CLIENT_ID,
      clientSecret: process.env.QUICKBOOKS_CLIENT_SECRET,
      environment: process.env.QUICKBOOKS_ENVIRONMENT || 'sandbox',
      redirectUri: process.env.URL ? 
        `${process.env.URL}/quickstart/oauth.html` : 
        'https://finhelm-ai.netlify.app/quickstart/oauth.html'
    });
    
    const authUri = oauthClient.authorizeUri({
      scope: [OAuthClient.scopes.Accounting, OAuthClient.scopes.OpenId],
      state: 'intuit-test'
    });
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        url: authUri,
        success: true 
      })
    };
  } catch (error) {
    console.error('Error generating auth URL:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        error: 'Failed to generate authorization URL',
        details: error.message 
      })
    };
  }
};