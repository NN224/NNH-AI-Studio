#!/usr/bin/env node

/**
 * Test script for Google Business Information API Attributes Endpoint
 * 
 * Usage:
 *   node scripts/test_attributes_api.js [location_resource]
 * 
 * Or set environment variables:
 *   GOOGLE_ACCESS_TOKEN=xxx LOCATION_RESOURCE=locations/xxx node scripts/test_attributes_api.js
 */

const locationResource = process.argv[2] || process.env.LOCATION_RESOURCE || 'locations/11247391224469965786';
const accessToken = process.env.GOOGLE_ACCESS_TOKEN;

if (!accessToken) {
  console.error('❌ Error: GOOGLE_ACCESS_TOKEN environment variable is required');
  console.log('\nTo get token from Supabase:');
  console.log('  SELECT access_token FROM gmb_accounts WHERE is_active = true LIMIT 1;');
  process.exit(1);
}

const BASE_URL = 'https://mybusinessbusinessinformation.googleapis.com/v1';

console.log('🔍 Testing Google Business Information API');
console.log('==========================================');
console.log(`Location: ${locationResource}`);
console.log(`Token: ${accessToken.substring(0, 30)}...`);
console.log('');

async function testEndpoint(name, url, method = 'GET', body = null) {
  console.log(`\n📡 ${name}`);
  console.log(`   URL: ${url}`);
  console.log(`   Method: ${method}`);
  
  try {
    const options = {
      method,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    };

    if (body) {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const responseText = await response.text();
    
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    console.log(`   Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      console.log('   ✅ Success!');
      console.log('   Response:', JSON.stringify(responseData, null, 2).substring(0, 500));
    } else {
      console.log('   ❌ Failed');
      console.log('   Error:', JSON.stringify(responseData, null, 2));
    }

    return {
      name,
      url,
      status: response.status,
      ok: response.ok,
      data: responseData,
    };
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return {
      name,
      url,
      error: error.message,
    };
  }
}

async function runTests() {
  const tests = [
    {
      name: 'GET Location Attributes',
      url: `${BASE_URL}/${locationResource}/attributes`,
    },
    {
      name: 'GET Location Attributes with readMask',
      url: `${BASE_URL}/${locationResource}/attributes?readMask=attributes.name,attributes.valueType,attributes.displayName`,
    },
  ];

  const results = [];
  
  for (const test of tests) {
    const result = await testEndpoint(test.name, test.url);
    results.push(result);
    await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between requests
  }

  console.log('\n\n📊 Test Summary:');
  console.log('================');
  results.forEach((result, index) => {
    console.log(`${index + 1}. ${result.name}`);
    console.log(`   Status: ${result.status || 'N/A'}`);
    console.log(`   Result: ${result.ok ? '✅ Success' : '❌ Failed'}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });
}

runTests().catch(console.error);

