// Test script to verify voucher creation API
async function testVoucherCreation() {
  const testData = {
    name: "Test Voucher",
    description: "Test description",
    startDate: "2024-01-01",
    endDate: "2024-01-02",
    department: "Engineering"
  };

  try {
    const response = await fetch('/api/vouchers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    const result = await response.json();
    console.log('Response status:', response.status);
    console.log('Response data:', result);
  } catch (error) {
    console.error('Error:', error);
  }
}

console.log('Test voucher creation script loaded');