import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
import { getFirestore, collection, doc, getDoc, getDocs, addDoc, setDoc, updateDoc, where, query, serverTimestamp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyDMWuYa4plIxdgj48r4q_NmEENZgvBx7VY",
  authDomain: "pridewelfare-2b002.firebaseapp.com",
  projectId: "pridewelfare-2b002",
  storageBucket: "pridewelfare-2b002.firebasestorage.app",
  messagingSenderId: "1070532082236",
  appId: "1:1070532082236:web:26b3e2434b5a38102ba139",
  measurementId: "G-54HPPE7MM4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Check Auth State
onAuthStateChanged(auth, (user) => {
  if (user) {
    fetchUserData(user.uid);
    loadSocietyBalance();
  } else {
    document.getElementById("loginSection").style.display = "block";
    document.getElementById("userInfo").style.display = "none";
    document.getElementById("receiptSection").style.display = "none";
    document.getElementById("memberReceipts").style.display = "none";
    document.getElementById("expenseSection").style.display = "none";
    document.getElementById("societyBalanceSection").style.display = "none";
  }
});

// Login Function
function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  if (!email || !password) {
    alert("Please enter both email and password!");
    return;
  }

  signInWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      const user = userCredential.user;
      console.log("Logged in:", user.uid);
      fetchUserData(user.uid);
    })
    .catch((error) => {
      console.error("Login error:", error.code, error.message);
      alert("Login failed: " + error.message);
    });
}

// Fetch User Data
async function fetchUserData(uid) {
  try {
    const userDoc = await getDoc(doc(db, "users", uid));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      document.getElementById("userName").innerText = userData.name;
      document.getElementById("userRole").innerText = userData.role;
      document.getElementById("userBalance").innerText = userData.balance || 0;

      document.getElementById("loginSection").style.display = "none";
      document.getElementById("userInfo").style.display = "block";
      document.getElementById("societyBalanceSection").style.display = "block";

      if (userData.role === "treasurer" || userData.role === "caretaker") {
        document.getElementById("receiptSection").style.display = "block";
        document.getElementById("expenseSection").style.display = "block";
        loadMembers();
        loadExpenses();
        checkAndAddMaintenanceCharge();
      } else if (userData.role === "member") {
        document.getElementById("memberReceipts").style.display = "block";
        loadMemberReceipts(uid);
        loadExpenses();
      }
    } else {
      alert("User data not found!");
    }
  } catch (error) {
    alert("Error fetching user data: " + error.message);
  }
}

// Load Members into Dropdown
function loadMembers() {
  const memberSelect = document.getElementById("receiptMemberId");
  const q = query(collection(db, "users"), where("role", "==", "member"));
  getDocs(q)
    .then((querySnapshot) => {
      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        const option = document.createElement("option");
        option.value = doc.id;
        option.text = userData.name;
        memberSelect.appendChild(option);
      });
    })
    .catch((error) => {
      console.error("Error loading members: ", error);
      alert("Error loading members: " + error.message);
    });
}

// Load Receipts for Members
function loadMemberReceipts(uid) {
  const receiptList = document.getElementById("receiptList");
  receiptList.innerHTML = "";
  const q = query(collection(db, "receipts"), where("memberId", "==", uid));
  getDocs(q)
    .then((querySnapshot) => {
      if (querySnapshot.empty) {
        receiptList.innerHTML = "<p>No receipts found.</p>";
        return;
      }
      querySnapshot.forEach((doc) => {
        const receipt = doc.data();
        const receiptDiv = document.createElement("div");
        receiptDiv.className = "receipt";
        receiptDiv.innerHTML = `
          <p>Amount: ${receipt.amount}</p>
          <p>Status: ${receipt.status}</p>
          <p>Payment Method: ${receipt.paymentMethod}</p>
          <p>Created By: ${receipt.createdBy}</p>
          <p>Created At: ${receipt.createdAt ? new Date(receipt.createdAt.toMillis()).toLocaleString() : "N/A"}</p>
        `;
        receiptList.appendChild(receiptDiv);
      });
    })
    .catch((error) => {
      alert("Error loading receipts: " + error.message);
    });
}

// Load Society Balance
async function loadSocietyBalance() {
  try {
    const balanceDoc = await getDoc(doc(db, "societyBalance", "current"));
    if (balanceDoc.exists()) {
      const balanceData = balanceDoc.data();
      document.getElementById("societyCash").innerText = balanceData.cash || 0;
      document.getElementById("societyBank").innerText = balanceData.bank || 0;
    } else {
      // Initialize society balance if it doesn't exist
      await setDoc(doc(db, "societyBalance", "current"), {
        cash: 0,
        bank: 0
      });
      document.getElementById("societyCash").innerText = 0;
      document.getElementById("societyBank").innerText = 0;
    }
  } catch (error) {
    alert("Error loading society balance: " + error.message);
  }
}

// Load Expenses
function loadExpenses() {
  const expenseList = document.getElementById("expenseList");
  expenseList.innerHTML = "";
  getDocs(collection(db, "expenses"))
    .then((querySnapshot) => {
      if (querySnapshot.empty) {
        expenseList.innerHTML = "<p>No expenses found.</p>";
        return;
      }
      querySnapshot.forEach((doc) => {
        const expense = doc.data();
        const expenseDiv = document.createElement("div");
        expenseDiv.className = "expense";
        expenseDiv.innerHTML = `
          <p>Type: ${expense.type}</p>
          <p>Amount: ₹${expense.amount}</p>
          <p>Payment Method: ${expense.paymentMethod}</p>
          <p>Description: ${expense.description}</p>
          <p>Created At: ${expense.createdAt ? new Date(expense.createdAt.toMillis()).toLocaleString() : "N/A"}</p>
        `;
        expenseList.appendChild(expenseDiv);
      });
    })
    .catch((error) => {
      alert("Error loading expenses: " + error.message);
    });
}

// Check and Add Maintenance Charge (Every 1st of the Month)
async function checkAndAddMaintenanceCharge() {
  const today = new Date();
  const currentDate = today.getDate();
  const currentMonth = today.toLocaleString('default', { month: 'long' }); // e.g., "January"
  const currentYear = today.getFullYear();

  // Only proceed if today is the 1st of the month
  if (currentDate !== 1) return;

  try {
    const membersQuery = query(collection(db, "users"), where("role", "==", "member"));
    const membersSnapshot = await getDocs(membersQuery);

    for (const memberDoc of membersSnapshot.docs) {
      const memberId = memberDoc.id;
      const memberData = memberDoc.data();

      // Check if maintenance charge for this month has already been added
      const chargeQuery = query(
        collection(db, "maintenanceCharges"),
        where("memberId", "==", memberId),
        where("month", "==", currentMonth),
        where("year", "==", currentYear)
      );
      const chargeSnapshot = await getDocs(chargeQuery);

      if (chargeSnapshot.empty) {
        // Add maintenance charge
        await addDoc(collection(db, "maintenanceCharges"), {
          memberId: memberId,
          amount: 1000,
          month: currentMonth,
          year: currentYear,
          createdAt: serverTimestamp()
        });

        // Update member's balance
        const newBalance = (memberData.balance || 0) + 1000;
        await updateDoc(doc(db, "users", memberId), {
          balance: newBalance
        });

        // Send WhatsApp message
        if (memberData.phone) {
          const message = `Hello ${memberData.name},\nMaintenance charge of ₹1000 for ${currentMonth} ${currentYear} has been added to your balance.\nNew Balance: ₹${newBalance}`;
          const encodedMessage = encodeURIComponent(message);
          const whatsappUrl = `https://api.whatsapp.com/send?phone=${memberData.phone}&text=${encodedMessage}`;
          window.open(whatsappUrl, "_blank");
        }
      }
    }
  } catch (error) {
    alert("Error adding maintenance charge: " + error.message);
  }
}

// Create Receipt (for Treasurer and Caretaker)
async function createReceipt() {
  const memberId = document.getElementById("receiptMemberId").value;
  const amount = document.getElementById("receiptAmount").value;
  const status = document.getElementById("receiptStatus").value;
  const paymentMethod = document.getElementById("paymentMethod").value;
  const user = auth.currentUser;

  if (!user) {
    alert("You need to be logged in to create a receipt!");
    return;
  }
  if (!memberId || !amount) {
    alert("Please fill in all fields!");
    return;
  }

  try {
    // Create the receipt in Firestore
    await addDoc(collection(db, "receipts"), {
      memberId: memberId,
      amount: parseFloat(amount),
      createdBy: user.uid,
      createdAt: serverTimestamp(),
      status: status,
      paymentMethod: paymentMethod
    });

    // Update member's balance (deduct the amount)
    const memberDoc = await getDoc(doc(db, "users", memberId));
    if (memberDoc.exists()) {
      const memberData = memberDoc.data();
      const newBalance = (memberData.balance || 0) - parseFloat(amount);
      await updateDoc(doc(db, "users", memberId), {
        balance: newBalance
      });

      // Update society balance
      const societyBalanceDoc = await getDoc(doc(db, "societyBalance", "current"));
      const societyBalanceData = societyBalanceDoc.data();
      let newCash = societyBalanceData.cash || 0;
      let newBank = societyBalanceData.bank || 0;

      if (paymentMethod === "cash") {
        newCash += parseFloat(amount);
      } else {
        newBank += parseFloat(amount);
      }

      await updateDoc(doc(db, "societyBalance", "current"), {
        cash: newCash,
        bank: newBank
      });

      // Update UI
      document.getElementById("societyCash").innerText = newCash;
      document.getElementById("societyBank").innerText = newBank;

      // Send WhatsApp message
      const memberPhone = memberData.phone;
      const memberName = memberData.name;
      if (memberPhone) {
        const message = `Hello ${memberName},\nA new receipt has been created for you.\nAmount: ₹${amount}\nStatus: ${status}\nPayment Method: ${paymentMethod}\nNew Balance: ₹${newBalance}\nDate: ${new Date().toLocaleString()}`;
        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://api.whatsapp.com/send?phone=${memberPhone}&text=${encodedMessage}`;
        window.open(whatsappUrl, "_blank");
      } else {
        alert("Receipt created successfully, but member's phone number not found!");
      }
    } else {
      alert("Receipt created successfully, but member data not found!");
    }

    // Clear the form
    document.getElementById("receiptMemberId").value = "";
    document.getElementById("receiptAmount").value = "";
    document.getElementById("receiptStatus").value = "temporary";
    document.getElementById("paymentMethod").value = "cash";
  } catch (error) {
    alert("Error creating receipt: " + error.message);
  }
}

// Add Expense (for Treasurer and Caretaker)
async function addExpense() {
  const expenseType = document.getElementById("expenseType").value;
  const amount = document.getElementById("expenseAmount").value;
  const paymentMethod = document.getElementById("expensePaymentMethod").value;
  const description = document.getElementById("expenseDescription").value;

  if (!amount || !description) {
    alert("Please fill in all fields!");
    return;
  }

  try {
    // Add the expense to Firestore
    await addDoc(collection(db, "expenses"), {
      type: expenseType,
      amount: parseFloat(amount),
      paymentMethod: paymentMethod,
      description: description,
      createdAt: serverTimestamp()
    });

    // Update society balance
    const societyBalanceDoc = await getDoc(doc(db, "societyBalance", "current"));
    const societyBalanceData = societyBalanceDoc.data();
    let newCash = societyBalanceData.cash || 0;
    let newBank = societyBalanceData.bank || 0;

    if (paymentMethod === "cash") {
      newCash -= parseFloat(amount);
    } else {
      newBank -= parseFloat(amount);
    }

    await updateDoc(doc(db, "societyBalance", "current"), {
      cash: newCash,
      bank: newBank
    });

    // Update UI
    document.getElementById("societyCash").innerText = newCash;
    document.getElementById("societyBank").innerText = newBank;
    loadExpenses();

    // Clear the form
    document.getElementById("expenseAmount").value = "";
    document.getElementById("expenseDescription").value = "";
    alert("Expense added successfully!");
  } catch (error) {
    alert("Error adding expense: " + error.message);
  }
}

// Logout Function
function logout() {
  signOut(auth)
    .then(() => {
      document.getElementById("loginSection").style.display = "block";
      document.getElementById("userInfo").style.display = "none";
      document.getElementById("receiptSection").style.display = "none";
      document.getElementById("memberReceipts").style.display = "none";
      document.getElementById("expenseSection").style.display = "none";
      document.getElementById("societyBalanceSection").style.display = "none";
    })
    .catch((error) => {
      alert("Logout failed: " + error.message);
    });
}

// Add event listeners to buttons
document.getElementById("loginButton").addEventListener("click", login);
document.getElementById("logoutButton").addEventListener("click", logout);
document.getElementById("createReceiptButton").addEventListener("click", createReceipt);
document.getElementById("addExpenseButton").addEventListener("click", addExpense);