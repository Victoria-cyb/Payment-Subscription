document.addEventListener('DOMContentLoaded', async () => {
  const backendUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3001/graphql'
    : 'https://paystack-integration-lemon.vercel.app/graphql';
  const PAYSTACK_PUBLIC_KEY = 'pk_live_4fb379f4e3ffe2a5e6571a78e7db8d6166febdec';
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

  // Calculate subscription bill
  function calculateBill(houseType, cleaningOptions, interval) {
    let basePrice = houseType === 'apartment' ? 30000 : houseType === 'duplex' ? 100000 : houseType === 'mansion' ? 150000 : 0;
    let optionPrice = cleaningOptions === 'basic' ? 50000 : cleaningOptions === 'deep' ? 100000 : cleaningOptions === 'premium' ? 150000 : 0;
    let multiplier = interval === 'annually' ? 12 : interval === 'monthly' ? 1 : interval === 'weekly' ? 0.25 : 1;
    return (basePrice + optionPrice) * multiplier;
  }

  // Helper to show/hide sections based on role
  async function updateUI() {
    console.log('updateUI: Starting with token:', !!localStorage.getItem('token'));
    const token = localStorage.getItem('token');
    if (token) {
      if (authStatus) authStatus.textContent = 'Logged in';
      if (logoutButton) logoutButton.style.display = 'block';
      if (signupSection) signupSection.style.display = 'none';
      if (loginSection) loginSection.style.display = 'none';
      if (userProfileSection) userProfileSection.style.display = 'block';
      if (verifySection) verifySection.style.display = 'block';
      if (transactionsSection) transactionsSection.style.display = 'block';
      if (cleanerSelection) cleanerSelection.style.display = 'none';
      if (jobListSection) jobListSection.style.display = 'none';
      const query = `
        query {
          getUser {
            id
            role
          }
        }
      `;
      try {
        console.log('updateUI: Fetching user data');
        const data = await sendGraphQLRequest(query);
        console.log('updateUI: User data:', data);
        const role = data.getUser.role;
        if (role === 'cleaner') {
          if (paymentSection) paymentSection.style.display = 'none';
          if (subscriptionSection) subscriptionSection.style.display = 'none';
          if (jobListSection) jobListSection.style.display = 'block';
          fetchUserProfile();
          fetchJobs();
        } else {
          if (paymentSection) paymentSection.style.display = 'block';
          if (subscriptionSection) subscriptionSection.style.display = 'block';
          if (jobListSection) jobListSection.style.display = 'none';
          fetchUserProfile();
        }
      } catch (error) {
        console.error('updateUI error:', error.message);
        displayResult(`UI error: ${error.message}`, true);
      }
    } else {
      if (authStatus) authStatus.textContent = 'Not logged in';
      if (logoutButton) logoutButton.style.display = 'none';
      if (signupSection) signupSection.style.display = 'block';
      if (loginSection) loginSection.style.display = 'block';
      if (userProfileSection) userProfileSection.style.display = 'none';
      if (paymentSection) paymentSection.style.display = 'none';
      if (subscriptionSection) subscriptionSection.style.display = 'none';
      if (verifySection) verifySection.style.display = 'none';
      if (transactionsSection) transactionsSection.style.display = 'none';
      if (userProfile) userProfile.innerHTML = '';
      if (transactionStatusSection) transactionStatusSection.style.display = 'none';
      if (cleanerSelection) cleanerSelection.style.display = 'none';
      if (jobListSection) jobListSection.style.display = 'none';
    }
  }

  // Fetch user profile
  async function fetchUserProfile() {
    if (!userProfile) return;
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
      console.log('fetchUserProfile: Fetching profile');
      const data = await sendGraphQLRequest(query);
      console.log('fetchUserProfile: Profile data:', data);
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
      console.error('Profile error:', error.message);
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
      console.log('showCleanerSelection: Fetching user ID');
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
      console.log('showCleanerSelection: Matching cleaners for clientId:', clientId);
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
      console.error('showCleanerSelection error:', error.message);
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
      console.log('fetchJobs: Fetching jobs');
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
        const fetchJobsBtn = document.getElementById('fetchJobsBtn');
        if (fetchJobsBtn) fetchJobsBtn.addEventListener('click', fetchJobs);
      } else {
        jobListSection.innerHTML += '<li>No jobs available.</li>';
      }
    } catch (error) {
      console.error('fetchJobs error:', error.message);
      displayResult(`Error fetching jobs: ${error.message}`, true);
    }
  }

  // Logout
  if (logoutButton) {
    logoutButton.addEventListener('click', () => {
      console.log('Logout: Removing token');
      localStorage.removeItem('token');
      updateUI();
      displayResult('Logged out successfully');
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 2000);
    });
  }

  // Signup
  const signupForm = document.getElementById('signupForm');
  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
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
        console.log('Submitting signup with:', { firstName, email, role, address });
        const data = await sendGraphQLRequest(query, {
          firstName,
          lastName,
          email,
          password,
          role,
          location: { address }
        });
        console.log('Signup response:', data);
        if (data.signup && data.signup.token) {
          localStorage.setItem('token', data.signup.token);
          console.log('Token saved:', localStorage.getItem('token'));
          await updateUI();
          displayResult(`Signup successful! Welcome, ${data.signup.user.firstName}`);
          setTimeout(() => {
            window.location.href = 'login.html';
          }, 2000);
        }
      } catch (error) {
        console.error('Signup error:', error.message);
        displayResult(`Signup error: ${error.message}`, true);
      }
    });
  }

  // Login
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
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
        console.log('Submitting login with:', { email });
        const data = await sendGraphQLRequest(query, { email, password });
        console.log('Login response:', data);
        if (data.login && data.login.token) {
          localStorage.setItem('token', data.login.token);
          console.log('Token saved:', localStorage.getItem('token'));
          await updateUI();
          displayResult(`Login successful! Welcome, ${data.login.user.firstName}`);
          setTimeout(() => {
            window.location.href = 'index.html';
          }, 2000);
        }
      } catch (error) {
        console.error('Login error:', error.message);
        displayResult(`Login error: ${error.message}`, true);
      }
    });
  }

  // Payment
  const paymentDetailsForm = document.getElementById('paymentDetailsForm');
  if (paymentDetailsForm) {
    paymentDetailsForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const address = document.getElementById('paymentAddress').value;
      const phone = document.getElementById('paymentPhone').value;
      const company = document.getElementById('paymentCompany').value;
      const amount = parseFloat(document.getElementById('paymentAmount').value);
      const query = `
        mutation InitializePayment($amount: Float!, $address: String, $phone: String, $company: String) {
          initializePayment(input: { amount: $amount, type: "one-time", address: $address, phone: $phone, company: $company }) {
            accessCode
            authorizationUrl
            reference
            status
          }
        }
      `;
      try {
        console.log('Submitting payment with:', { amount, address });
        const data = await sendGraphQLRequest(query, { amount, address, phone, company });
        if (data.initializePayment) {
          window.location.href = data.initializePayment.authorizationUrl;
        }
      } catch (error) {
        console.error('Payment error:', error.message);
        displayResult(`Payment error: ${error.message}`, true);
      }
    });
  }

  // Subscription
  const subscriptionDetailsForm = document.getElementById('subscriptionDetailsForm');
  if (subscriptionDetailsForm) {
    const houseTypeSelect = document.getElementById('houseType');
    const cleaningOptionsSelect = document.getElementById('cleaningOptions');
    const intervalSelect = document.getElementById('subscriptionInterval');
    const estimatedBillSpan = document.getElementById('estimatedBill');
    function updateBillEstimate() {
      const houseType = houseTypeSelect.value;
      const cleaningOptions = cleaningOptionsSelect.value;
      const interval = intervalSelect.value;
      if (houseType && cleaningOptions && interval) {
        const bill = calculateBill(houseType, cleaningOptions, interval);
        estimatedBillSpan.textContent = `₦${bill.toFixed(2)}`;
      } else {
        estimatedBillSpan.textContent = '₦0';
      }
    }
    if (houseTypeSelect) houseTypeSelect.addEventListener('change', updateBillEstimate);
    if (cleaningOptionsSelect) cleaningOptionsSelect.addEventListener('change', updateBillEstimate);
    if (intervalSelect) intervalSelect.addEventListener('change', updateBillEstimate);
    subscriptionDetailsForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const houseAddress = document.getElementById('houseAddress').value;
      const houseType = document.getElementById('houseType').value;
      const cleaningOptions = document.getElementById('cleaningOptions').value;
      const interval = document.getElementById('subscriptionInterval').value;
      const amount = calculateBill(houseType, cleaningOptions, interval);
      const query = `
        mutation InitializeSubscription($amount: Float!, $interval: String!, $houseAddress: String, $houseType: String, $cleaningOptions: String) {
          initializeSubscription(input: { amount: $amount, type: "subscription", interval: $interval, houseAddress: $houseAddress, houseType: $houseType, cleaningOptions: $cleaningOptions }) {
            accessCode
            authorizationUrl
            reference
            status
          }
        }
      `;
      try {
        console.log('Submitting subscription with:', { amount, interval, houseAddress });
        const data = await sendGraphQLRequest(query, { amount, interval, houseAddress, houseType, cleaningOptions });
        if (data.initializeSubscription) {
          window.location.href = data.initializeSubscription.authorizationUrl;
        }
      } catch (error) {
        console.error('Subscription error:', error.message);
        displayResult(`Subscription error: ${error.message}`, true);
      }
    });
  }

  // Verify Payment
  const verifyForm = document.getElementById('verifyForm');
  if (verifyForm) {
    verifyForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      let reference = document.getElementById('verifyReference').value.trim();
      if (!reference) {
        displayResult('Please enter a valid transaction reference', true);
        return;
      }
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
            address
            phone
            company
            houseAddress
            houseType
            cleaningOptions
          }
        }
      `;
      try {
        console.log('Verifying payment with reference:', reference);
        const data = await sendGraphQLRequest(query, { reference });
        console.log('Verify payment response:', data);
        if (data.verifyPaymentTransaction) {
          if (transactionList) transactionList.innerHTML = '';
          const tx = data.verifyPaymentTransaction;
          const li = document.createElement('li');
          li.innerHTML = `
            Ref: ${tx.reference}, Amount: ₦${tx.amount}, Status: ${tx.status}, Type: ${tx.type}, 
            Interval: ${tx.interval || 'N/A'}, Plan: ${tx.planCode || 'N/A'}, 
            Date: ${parseDate(tx.createdAt)},
            ${tx.address ? `<br>Address: ${tx.address}` : ''},
            ${tx.phone ? `<br>Phone: ${tx.phone}` : ''},
            ${tx.company ? `<br>Company: ${tx.company}` : ''},
            ${tx.houseAddress ? `<br>House Address: ${tx.houseAddress}` : ''},
            ${tx.houseType ? `<br>House Type: ${tx.houseType}` : ''},
            ${tx.cleaningOptions ? `<br>Cleaning Options: ${tx.cleaningOptions}` : ''}
          `;
          if (transactionList) transactionList.appendChild(li);
          displayResult(`Transaction verified: Status: ${tx.status}, Amount: ₦${tx.amount}`);
          showCleanerSelection();
        } else {
          displayResult('No transaction found for this reference', true);
        }
      } catch (error) {
        console.error('Verification error:', error.message);
        displayResult(`Verification error: ${error.message}`, true);
      }
    });
  }

  // Fetch Transaction by Reference
  const transactionByReferenceForm = document.getElementById('transactionByReferenceForm');
  if (transactionByReferenceForm) {
    transactionByReferenceForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      let reference = document.getElementById('transactionReference').value.trim();
      if (!reference) {
        displayResult('Please enter a valid transaction reference', true);
        return;
      }
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
            address
            phone
            company
            houseAddress
            houseType
            cleaningOptions
          }
        }
      `;
      try {
        console.log('Fetching transaction with reference:', reference);
        const data = await sendGraphQLRequest(query, { reference });
        console.log('Fetch transaction response:', data);
        if (data.getTransactionByReference) {
          if (transactionList) transactionList.innerHTML = '';
          const tx = data.getTransactionByReference;
          console.log('Transaction createdAt:', tx.createdAt);
          const li = document.createElement('li');
          li.innerHTML = `
            Ref: ${tx.reference}, Amount: ₦${tx.amount}, Status: ${tx.status}, Type: ${tx.type}, 
            Interval: ${tx.interval || 'N/A'}, Plan: ${tx.planCode || 'N/A'}, 
            Date: ${parseDate(tx.createdAt)},
            ${tx.address ? `<br>Address: ${tx.address}` : ''},
            ${tx.phone ? `<br>Phone: ${tx.phone}` : ''},
            ${tx.company ? `<br>Company: ${tx.company}` : ''},
            ${tx.houseAddress ? `<br>House Address: ${tx.houseAddress}` : ''},
            ${tx.houseType ? `<br>House Type: ${tx.houseType}` : ''},
            ${tx.cleaningOptions ? `<br>Cleaning Options: ${tx.cleaningOptions}` : ''}
          `;
          if (transactionList) transactionList.appendChild(li);
          displayResult(`Transaction fetched: Ref: ${tx.reference}`);
        } else {
          if (transactionList) transactionList.innerHTML = '<li>No transaction found</li>';
          displayResult('No transaction found for this reference', true);
        }
      } catch (error) {
        console.error('Transaction fetch error:', error.message);
        displayResult(`Transaction fetch error: ${error.message}`, true);
      }
    });
  }

  // Fetch All Transactions
  const fetchTransactions = document.getElementById('fetchTransactions');
  if (fetchTransactions) {
    fetchTransactions.addEventListener('click', async () => {
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
            address
            phone
            company
            houseAddress
            houseType
            cleaningOptions
          }
        }
      `;
      try {
        console.log('Fetching all transactions');
        const data = await sendGraphQLRequest(query);
        if (transactionList) transactionList.innerHTML = '';
        if (data.getTransactions && data.getTransactions.length > 0) {
          if (transactionStatusSection) transactionStatusSection.style.display = 'block';
          data.getTransactions.forEach(tx => {
            console.log('Transaction createdAt:', tx.createdAt);
            const li = document.createElement('li');
            li.innerHTML = `
              Ref: ${tx.reference}, Amount: ₦${tx.amount}, Status: ${tx.status}, Type: ${tx.type}, 
              Interval: ${tx.interval || 'N/A'}, Plan: ${tx.planCode || 'N/A'}, 
              Date: ${parseDate(tx.createdAt)},
              ${tx.address ? `<br>Address: ${tx.address}` : ''},
              ${tx.phone ? `<br>Phone: ${tx.phone}` : ''},
              ${tx.company ? `<br>Company: ${tx.company}` : ''},
              ${tx.houseAddress ? `<br>House Address: ${tx.houseAddress}` : ''},
              ${tx.houseType ? `<br>House Type: ${tx.houseType}` : ''},
              ${tx.cleaningOptions ? `<br>Cleaning Options: ${tx.cleaningOptions}` : ''}
            `;
            if (transactionList) transactionList.appendChild(li);
          });
        } else {
          if (transactionList) transactionList.innerHTML = '<li>No transactions found</li>';
          displayResult('No transactions found', true);
        }
      } catch (error) {
        console.error('Transactions fetch error:', error.message);
        displayResult(`Transactions fetch error: ${error.message}`, true);
      }
    });
  }

  // Refresh Profile
  const fetchUser = document.getElementById('fetchUser');
  if (fetchUser) {
    fetchUser.addEventListener('click', fetchUserProfile);
  }

  // Initial UI update
  console.log('Initializing UI');
  await updateUI();
});