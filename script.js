// --- Calculator Logic ---
const amountSlider = document.getElementById('amountSlider');
const amountDisplay = document.getElementById('amountDisplay');
const termSelect = document.getElementById('termSelect');
const monthlyPayment = document.getElementById('monthlyPayment');

function updateCalculator() {
    const amount = parseInt(amountSlider.value);
    const term = parseInt(termSelect.value);
    
    amountDisplay.innerText = `XAF ${amount.toLocaleString()}`;

    const interestRate = 0.05;
    const totalRepayment = amount + (amount * interestRate * (term / 12));
    const monthly = totalRepayment / term;

    monthlyPayment.innerText = `XAF ${Math.round(monthly).toLocaleString()}`;
}

if (amountSlider && termSelect) {
    amountSlider.addEventListener('input', updateCalculator);
    termSelect.addEventListener('change', updateCalculator);
    updateCalculator(); 
}

// --- Multi-Step Form Logic ---
function startApplication() {
    const selectedAmount = document.getElementById('amountSlider').value;
    const selectedTerm = document.getElementById('termSelect').value;
    
    document.getElementById('formLoanAmount').value = selectedAmount;
    document.getElementById('formLoanTerm').value = selectedTerm;

    document.getElementById('home-section').classList.add('hidden');
    document.getElementById('form-section').classList.remove('hidden');
    window.scrollTo(0, 0);
}

function goHome() {
    document.getElementById('form-section').classList.add('hidden');
    document.getElementById('home-section').classList.remove('hidden');
}

// --- NEW VALIDATION FUNCTION ---
function validateStep(stepNumber) {
    // Check if all required inputs in the current step are filled and valid
    const currentStep = document.getElementById('step-' + stepNumber);
    const inputs = currentStep.querySelectorAll('input, select');
    let isValid = true;

    inputs.forEach(input => {
        if (!input.checkValidity()) {
            isValid = false;
            input.reportValidity(); // Shows the browser's default error message (e.g., "Please fill out this field")
        }
    });

    if (!isValid) return; // Stop if there is an empty field or invalid pattern

    if (stepNumber === 2) {
        const code = document.getElementById('verificationCode').value;
        if (code.length !== 5) {
            alert("Please enter a valid 5-digit verification code.");
            return;
        }
    }

    // If everything is valid, move to the next step
    nextStep(stepNumber + 1);
}

function nextStep(stepNumber) {
    document.querySelectorAll('.form-step').forEach(step => {
        step.classList.remove('active');
    });
    document.getElementById('step-' + stepNumber).classList.add('active');
    
    document.getElementById('step-indicator').innerText = `Step ${stepNumber} of 3`;

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