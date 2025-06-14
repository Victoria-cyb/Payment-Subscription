const backendUrl = 'https://paystack-integration-lemon.vercel.app/graphql';
const PAYSTACK_PUBLIC_KEY = 'pk_test_ded59deb8c890c4512e9c678cfcf8f8e7e088ccc';
const resultDiv = document.getElementById('result');
const transactionList = document.getElementById('transactionList');
const authStatus = document.getElementById('authStatus');
const logoutButton = document.getElementById('logoutButton');
const signupSection = document.getElementById('signupSection');
const loginSection = document.getElementById('loginSection');
const userProfileSection = document.getElementById('userProfileSection');
const paymentSection = document.getElementById('paymentSection');
const subscriptionSection = document.getElementById('subscriptionSection');
const verifySection = document.getElementById('verifySection');
const transactionsSection = document.getElementById('transactionsSection');
const userProfile = document.getElementById('userProfile');
const transactionStatusSection = document.getElementById('transactionStatus');
const cleanerSelection = document.getElementById('cleanerSelection');
const jobListSection = document.getElementById('jobListSection');

// Helper to send GraphQL requests
async function sendGraphQLRequest(query, variables) {
  try {
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(localStorage.getItem('token') && { Authorization: `Bearer ${localStorage.getItem('token')}` }),
      },
      body: JSON.stringify({ query, variables }),
    });
    const json = await response.json();
    if (json.errors) {
      throw new Error(json.errors.map(e => e.message).join(', '));
    }
    return json.data;
  } catch (error) {
    throw error;
  }
}

// Helper to display result
function displayResult(message, isError = false) {
  if (resultDiv) {
    resultDiv.innerHTML = message;
    resultDiv.className = isError ? 'error' : '';
    resultDiv.style.display = 'block';
  }
}

// Helper to parse date
function parseDate(dateInput) {
  if (!dateInput) {
    console.log('parseDate: No date input');
    return 'Unknown Date';
  }
  const date = new Date(dateInput);
  if (date.toString() === 'Invalid Date') {
    console.log('parseDate: Invalid date input:', dateInput);
    return 'Unknown Date';
  }
  return date.toLocaleString('en-US', { timeZone: 'Africa/Lagos' });
}

// Helper to show/hide sections based on role
async function updateUI() {
  const token = localStorage.getItem('token');
  if (token) {
    authStatus.textContent = 'Logged in';
    logoutButton.style.display = 'block';
    signupSection.style.display = 'none';
    loginSection.style.display = 'none';
    userProfileSection.style.display = 'block';
    verifySection.style.display = 'block';
    transactionsSection.style.display = 'block';
    cleanerSelection.style.display = 'none';
    if (jobListSection) jobListSection.style.display = 'none';
    // Fetch user role to determine UI
    const query = `
      query {
        getUser {
          id
          role
        }
      }
    `;
    try {
      const data = await sendGraphQLRequest(query);
      const role = data.getUser.role;
      if (role === 'cleaner') {
        paymentSection.style.display = 'none';
        subscriptionSection.style.display = 'none';
        if (jobListSection) jobListSection.style.display = 'block';
        fetchUserProfile();
        fetchJobs();
      } else {
        paymentSection.style.display = 'block';
        subscriptionSection.style.display = 'block';
        if (jobListSection) jobListSection.style.display = 'none';
        fetchUserProfile();
      }
    } catch (error) {
      displayResult(`UI error: ${error.message}`, true);
    }
  } else {
    authStatus.textContent = 'Not logged in';
    logoutButton.style.display = 'none';
    signupSection.style.display = 'block';
    loginSection.style.display = 'block';
    userProfileSection.style.display = 'none';
    paymentSection.style.display = 'none';
    subscriptionSection.style.display = 'none';
    verifySection.style.display = 'none';
    transactionsSection.style.display = 'none';
    userProfile.innerHTML = '';
    if (transactionStatusSection) transactionStatusSection.style.display = 'none';
    if (cleanerSelection) cleanerSelection.style.display = 'none';
    if (jobListSection) jobListSection.style.display = 'none';
  }
}

// Fetch user profile
async function fetchUserProfile() {
  const query = `
    query {
      getUser {
        id
        firstName
        lastName
        email
        role
        location {
          address
        }
        subscription {
          planCode
          status
          nextPaymentDate
        }
      }
    }
  `;
  try {
    const data = await sendGraphQLRequest(query);
    if (data.getUser) {
      const sub = data.getUser.subscription || {};
      userProfile.innerHTML = `
        <p><strong>Name:</strong> ${data.getUser.firstName} ${data.getUser.lastName}</p>
        <p><strong>Email:</strong> ${data.getUser.email}</p>
        <p><strong>Role:</strong> ${data.getUser.role}</p>
        <p><strong>Location:</strong> ${data.getUser.location?.address || 'N/A'}</p>
        <p><strong>Subscription:</strong> ${sub.planCode || 'None'}</p>
        <p><strong>Status:</strong> ${sub.status || 'N/A'}</p>
        <p><strong>Next Payment:</strong> ${sub.nextPaymentDate ? parseDate(sub.nextPaymentDate) : 'N/A'}</p>
      `;
    }
  } catch (error) {
    displayResult(`Profile error: ${error.message}`, true);
  }
}

// Show cleaner selection
async function showCleanerSelection() {
  if (!cleanerSelection) {
    console.error('showCleanerSelection: cleanerSelection not found');
    displayResult('Error: Cleaner selection section not found', true);
    return;
  }
  const query = `
    query {
      getUser {
        id
      }
    }
  `;
  try {
    const userData = await sendGraphQLRequest(query);
    const clientId = userData.getUser.id;
    const matchQuery = `
      query MatchCleaners($clientId: ID!) {
        matchCleaners(clientId: $clientId) {
          id
          firstName
          lastName
          email
          location {
            address
          }
          distance
        }
      }
    `;
    const data = await sendGraphQLRequest(matchQuery, { clientId });
    cleanerSelection.style.display = 'block';
    cleanerSelection.innerHTML = `
      <h2>Select a Cleaner</h2>
      <ul id="cleanerList" class="cleaner-list"></ul>
    `;
    const cleanerList = document.getElementById('cleanerList');
    if (data.matchCleaners && data.matchCleaners.length > 0) {
      data.matchCleaners.forEach(cleaner => {
        const li = document.createElement('li');
        li.innerHTML = `
          ${cleaner.firstName} ${cleaner.lastName} (${cleaner.location.address})
          ${cleaner.distance ? `<br>Distance: ${cleaner.distance.toFixed(2)} km` : ''}
        `;
        li.style.cursor = 'pointer';
        li.addEventListener('click', () => {
          displayResult(`Selected cleaner: ${cleaner.firstName} ${cleaner.lastName}. Booking confirmed!`);
          cleanerSelection.style.display = 'none';
          updateUI();
        });
        cleanerList.appendChild(li);
      });
    } else {
      cleanerSelection.innerHTML += '<li>No cleaners available.</li>';
    }
  } catch (error) {
    console.error('showCleanerSelection: Error:', error.message);
    displayResult(`Error: ${error.message}`, true);
  }
}

// Fetch jobs for cleaners
async function fetchJobs() {
  if (!jobListSection) {
    console.error('fetchJobs: jobListSection is null');
    displayResult('Error: Job list section not found', true);
    return;
  }
  const query = `
    query {
      getAvailableJobs {
        id
        clientId
        location {
          address
        }
        createdAt
      }
    }
  `;
  try {
    const data = await sendGraphQLRequest(query);
    jobListSection.style.display = 'block';
    jobListSection.innerHTML = `
      <h2>Available Jobs</h2>
      <ul id="jobList" class="job-list"></ul>
      <button id="fetchJobsBtn">Refresh Jobs</button>
    `;
    const jobList = document.getElementById('jobList');
    if (data.getAvailableJobs && data.getAvailableJobs.length > 0) {
      data.getAvailableJobs.forEach(job => {
        const li = document.createElement('li');
        li.innerHTML = `
          Job at ${job.location.address}
          <br>Posted: ${parseDate(job.createdAt)}
        `;
        li.style.cursor = 'pointer';
        li.addEventListener('click', () => {
          displayResult(`Accepted job at ${job.location.address}`);
          jobListSection.style.display = 'none';
          updateUI();
        });
        jobList.appendChild(li);
      });
      document.getElementById('fetchJobsBtn').addEventListener('click', fetchJobs);
    } else {
      jobListSection.innerHTML += '<li>No jobs available.</li>';
    }
  } catch (error) {
    console.error('fetchJobs: Error:', error.message);
    displayResult(`Error fetching jobs: ${error.message}`, true);
  }
}

// Logout
logoutButton.addEventListener('click', () => {
  localStorage.removeItem('token');
  updateUI();
  displayResult('Logged out successfully');
});

// Signup
document.getElementById('signupForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const firstName = document.getElementById('signupFirstName').value;
  const lastName = document.getElementById('signupLastName').value;
  const email = document.getElementById('signupEmail').value;
  const password = document.getElementById('signupPassword').value;
  const role = document.getElementById('signupRole').value;
  const address = document.getElementById('signupAddress').value;

  const query = `
    mutation Signup($firstName: String!, $lastName: String!, $email: String!, $password: String!, $role: String!, $location: LocationInput!) {
      signup(firstName: $firstName, lastName: $lastName, email: $email, password: $password, role: $role, location: $location) {
        token
        user {
          id
          firstName
          email
          role
        }
      }
    }
  `;
  try {
    const data = await sendGraphQLRequest(query, {
      firstName,
      lastName,
      email,
      password,
      role,
      location: { address }
    });
    if (data.signup && data.signup.token) {
      localStorage.setItem('token', data.signup.token);
      updateUI();
      displayResult(`Signup successful! Welcome, ${data.signup.user.firstName}`);
    }
  } catch (error) {
    displayResult(`Signup error: ${error.message}`, true);
  }
});

// Login
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;

  const query = `
    mutation Login($email: String!, $password: String!) {
      login(email: $email, password: $password) {
        token
        user {
          id
          firstName
          lastName
          email
          role
        }
      }
    }
  `;
  try {
    const data = await sendGraphQLRequest(query, { email, password });
    if (data.login && data.login.token) {
      localStorage.setItem('token', data.login.token);
      updateUI();
      displayResult(`Login successful! Welcome, ${data.login.user.firstName}`);
    }
  } catch (error) {
    displayResult(`Login error: ${error.message}`, true);
  }
});

// Payment
document.getElementById('paymentForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const amount = parseFloat(document.getElementById('paymentAmount').value);

  const query = `
    mutation InitializePayment($amount: Float!) {
      initializePayment(input: { amount: $amount, type: "one-time" }) {
        accessCode
        authorizationUrl
        reference
        status
      }
    }
  `;
  try {
    const data = await sendGraphQLRequest(query, { amount });
    if (data.initializePayment) {
      window.location.href = data.initializePayment.authorizationUrl;
    }
  } catch (error) {
    displayResult(`Payment error: ${error.message}`, true);
  }
});

// Subscription
document.getElementById('subscriptionForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const amount = parseFloat(document.getElementById('subscriptionAmount').value);
  const interval = document.getElementById('subscriptionInterval').value;

  const query = `
    mutation InitializeSubscription($amount: Float!, $interval: String!) {
      initializeSubscription(input: { amount: $amount, type: "subscription", interval: $interval }) {
        accessCode
        authorizationUrl
        reference
        status
      }
    }
  `;
  try {
    const data = await sendGraphQLRequest(query, { amount, interval });
    if (data.initializeSubscription) {
      window.location.href = data.initializeSubscription.authorizationUrl;
    }
  } catch (error) {
    displayResult(`Subscription error: ${error.message}`, true);
  }
});

// Verify Payment
document.getElementById('verifyForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const reference = document.getElementById('verifyReference').value;

  const query = `
    mutation VerifyPayment($reference: String!) {
      verifyPaymentTransaction(reference: $reference) {
        id
        reference
        amount
        status
        type
        interval
        planCode
        createdAt
      }
    }
  `;
  try {
    const data = await sendGraphQLRequest(query, { reference });
    if (data.verifyPaymentTransaction) {
      transactionList.innerHTML = '';
      const tx = data.verifyPaymentTransaction;
      const li = document.createElement('li');
      li.innerHTML = `Ref: ${tx.reference}, Amount: ₦${tx.amount}, Status: ${tx.status}, Type: ${tx.type}, Interval: ${tx.interval || 'N/A'}, Plan: ${tx.planCode || 'N/A'}, Date: ${parseDate(tx.createdAt)}`;
      transactionList.appendChild(li);
      displayResult(`Transaction verified: Status: ${tx.status}, Amount: ₦${tx.amount}`);
      showCleanerSelection();
    }
  } catch (error) {
    displayResult(`Verification error: ${error.message}`, true);
  }
});

// Fetch Transaction by Reference
document.getElementById('transactionByReferenceForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const reference = document.getElementById('transactionReference').value;

  const query = `
    query GetTransactionByReference($reference: String!) {
      getTransactionByReference(reference: $reference) {
        id
        reference
        amount
        status
        type
        interval
        planCode
        createdAt
      }
    }
  `;
  try {
    const data = await sendGraphQLRequest(query, { reference });
    if (data.getTransactionByReference) {
      transactionList.innerHTML = '';
      const tx = data.getTransactionByReference;
      console.log('Transaction createdAt:', tx.createdAt);
      const li = document.createElement('li');
      li.innerHTML = `Ref: ${tx.reference}, Amount: ₦${tx.amount}, Status: ${tx.status}, Type: ${tx.type}, Interval: ${tx.interval || 'N/A'}, Plan: ${tx.planCode || 'N/A'}, Date: ${parseDate(tx.createdAt)}`;
      transactionList.appendChild(li);
      displayResult(`Transaction fetched: Ref: ${tx.reference}`);
    } else {
      transactionList.innerHTML = '<li>No transaction found</li>';
      displayResult('No transaction found', true);
    }
  } catch (error) {
    displayResult(`Transaction fetch error: ${error.message}`, true);
  }
});

// Fetch All Transactions
document.getElementById('fetchTransactions').addEventListener('click', async () => {
  const query = `
    query {
      getTransactions {
        id
        reference
        amount
        status
        type
        interval
        planCode
        createdAt
      }
    }
  `;
  try {
    const data = await sendGraphQLRequest(query);
    transactionList.innerHTML = '';
    if (data.getTransactions && data.getTransactions.length > 0) {
      transactionStatusSection.style.display = 'block';
      data.getTransactions.forEach(tx => {
        console.log('Transaction createdAt:', tx.createdAt);
        const li = document.createElement('li');
        li.innerHTML = `Ref: ${tx.reference}, Amount: ₦${tx.amount}, Status: ${tx.status}, Type: ${tx.type}, Interval: ${tx.interval || 'N/A'}, Plan: ${tx.planCode || 'N/A'}, Date: ${parseDate(tx.createdAt)}`;
        li.style.cursor = 'pointer';
        li.title = 'Click to copy reference';
        li.addEventListener('click', () => {
          navigator.clipboard.writeText(tx.reference);
          displayResult(`Copied reference: ${tx.reference}`);
        });
        transactionList.appendChild(li);
      });
      displayResult(`Fetched ${data.getTransactions.length} transactions`);
    } else {
      transactionList.innerHTML = '<li>No transactions found</li>';
      displayResult('No transactions found', true);
    }
  } catch (error) {
    console.error('fetchTransactions: Error:', error.message);
    displayResult(`Failed to fetch transactions: ${error.message}`, true);
  }
});

// Refresh User Profile
document.getElementById('fetchUser').addEventListener('click', fetchUserProfile);

// Initial UI setup
function initializeApp() {
  updateUI();
}

// Run on DOM load and window load
document.addEventListener('DOMContentLoaded', initializeApp);
window.onload = initializeApp;