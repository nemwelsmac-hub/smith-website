// --- Calculator Logic ---
const amountSlider = document.getElementById('amountSlider');
const amountDisplay = document.getElementById('amountDisplay');
const termSelect = document.getElementById('termSelect');
const monthlyPayment = document.getElementById('monthlyPayment');

function updateCalculator() {
    const amount = parseInt(amountSlider.value);
    const term = parseInt(termSelect.value);
    
    // Format amount with commas
    amountDisplay.innerText = `XAF ${amount.toLocaleString()}`;

    // Simple interest calculation for demonstration (e.g., 5% interest rate)
    const interestRate = 0.05;
    const totalRepayment = amount + (amount * interestRate * (term / 12));
    const monthly = totalRepayment / term;

    monthlyPayment.innerText = `XAF ${Math.round(monthly).toLocaleString()}`;
}

amountSlider.addEventListener('input', updateCalculator);
termSelect.addEventListener('change', updateCalculator);
updateCalculator(); // Run on load

// --- Multi-Step Form Logic ---
function startApplication() {
    // 1. Get values from the calculator
    const selectedAmount = document.getElementById('amountSlider').value;
    const selectedTerm = document.getElementById('termSelect').value;
    
    // 2. Put those values into the Step 1 form
    document.getElementById('formLoanAmount').value = selectedAmount;
    document.getElementById('formLoanTerm').value = selectedTerm;

    // 3. Hide home screen and show the form
    document.getElementById('home-section').classList.add('hidden');
    document.getElementById('form-section').classList.remove('hidden');
    window.scrollTo(0, 0);
}

function goHome() {
    document.getElementById('form-section').classList.add('hidden');
    document.getElementById('home-section').classList.remove('hidden');
}

function nextStep(stepNumber) {
    // Hide all steps
    document.querySelectorAll('.form-step').forEach(step => {
        step.classList.remove('active');
    });
    // Show the target step
    document.getElementById('step-' + stepNumber).classList.add('active');
    
    // Update progress indicator
    document.getElementById('step-indicator').innerText = `Step ${stepNumber} of 3`;

    // If moving to step 3, populate the summary details
    if (stepNumber === 3) {
        const firstName = document.getElementById('firstName').value;
        const lastName = document.getElementById('lastName').value;
        const phone = document.getElementById('phone').value;
        const amount = document.getElementById('formLoanAmount').value;
        const term = document.getElementById('formLoanTerm').value;

        document.getElementById('sumName').innerText = `${firstName} ${lastName}`;
        document.getElementById('sumPhone').innerText = `+237 ${phone}`;
        document.getElementById('sumAmount').innerText = parseInt(amount).toLocaleString();
        document.getElementById('sumTerm').innerText = term;
    }
}

function validateAndNext() {
    const phone = document.getElementById('phone').value;
    const code = document.getElementById('verificationCode').value;

    // Check phone length
    if (phone.length !== 9) {
        alert("Please enter a valid 9-digit phone number.");
        return;
    }

    // Check verification code length
    if (code.length !== 5) {
        alert("Please enter a 5-digit verification code.");
        return;
    }

    nextStep(3);
}