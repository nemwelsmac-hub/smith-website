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
    // 1. Get the amount from the slider
    const selectedAmount = document.getElementById('amountSlider').value;
    
    // 2. Put that amount into the form input field
    document.getElementById('formLoanAmount').value = selectedAmount;

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

    // If moving to step 3, update the summary
    if (stepNumber === 3) {
        const firstName = document.getElementById('firstName').value;
        const lastName = document.getElementById('lastName').value;
        document.getElementById('sumName').innerText = `${firstName} ${lastName}`;
    }
}

function validateAndNext() {
    const phone = document.getElementById('phone').value;
    if (phone.length !== 9) {
        alert("Please enter a valid 9-digit phone number.");
        return;
    }
    nextStep(3);
}