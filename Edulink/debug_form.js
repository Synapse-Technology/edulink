// Debug script for form visibility issues
// Copy and paste this into the browser console on the invite register page

console.log('=== FORM DEBUG SCRIPT ===');

// Check if form exists
const form = document.getElementById('registrationForm');
console.log('Form found:', !!form);
if (form) {
    console.log('Form element:', form);
    console.log('Form display:', window.getComputedStyle(form).display);
    console.log('Form visibility:', window.getComputedStyle(form).visibility);
}

// Check form steps
const formSteps = document.querySelectorAll('.form-step');
console.log('Total form steps:', formSteps.length);

formSteps.forEach((step, index) => {
    console.log(`\n--- Step ${index + 1} ---`);
    console.log('Element:', step);
    console.log('Classes:', step.className);
    console.log('Data-step:', step.getAttribute('data-step'));
    console.log('Display:', window.getComputedStyle(step).display);
    console.log('Visibility:', window.getComputedStyle(step).visibility);
    console.log('Opacity:', window.getComputedStyle(step).opacity);
    console.log('Position:', window.getComputedStyle(step).position);
    console.log('Z-index:', window.getComputedStyle(step).zIndex);
    console.log('Height:', window.getComputedStyle(step).height);
    console.log('Width:', window.getComputedStyle(step).width);
    
    // Check inputs in this step
    const inputs = step.querySelectorAll('input');
    console.log(`Inputs in step ${index + 1}:`, inputs.length);
    
    inputs.forEach((input, inputIndex) => {
        console.log(`  Input ${inputIndex + 1}:`);
        console.log(`    Element:`, input);
        console.log(`    Name:`, input.name);
        console.log(`    Type:`, input.type);
        console.log(`    Display:`, window.getComputedStyle(input).display);
        console.log(`    Visibility:`, window.getComputedStyle(input).visibility);
        console.log(`    Opacity:`, window.getComputedStyle(input).opacity);
        console.log(`    Height:`, window.getComputedStyle(input).height);
        console.log(`    Width:`, window.getComputedStyle(input).width);
        console.log(`    Position:`, window.getComputedStyle(input).position);
        console.log(`    Z-index:`, window.getComputedStyle(input).zIndex);
    });
});

// Check active step specifically
const activeStep = document.querySelector('.form-step.active');
console.log('\n=== ACTIVE STEP ===');
if (activeStep) {
    console.log('Active step found:', activeStep);
    console.log('Active step classes:', activeStep.className);
    console.log('Active step display:', window.getComputedStyle(activeStep).display);
    
    // Check if active step has content
    const activeInputs = activeStep.querySelectorAll('input');
    console.log('Active step inputs:', activeInputs.length);
    
    // Check form grid
    const formGrid = activeStep.querySelector('.form-grid');
    if (formGrid) {
        console.log('Form grid found:', formGrid);
        console.log('Form grid display:', window.getComputedStyle(formGrid).display);
        console.log('Form grid visibility:', window.getComputedStyle(formGrid).visibility);
    }
    
    // Check form groups
    const formGroups = activeStep.querySelectorAll('.form-group');
    console.log('Form groups in active step:', formGroups.length);
    formGroups.forEach((group, index) => {
        console.log(`Form group ${index + 1}:`);
        console.log(`  Display:`, window.getComputedStyle(group).display);
        console.log(`  Visibility:`, window.getComputedStyle(group).visibility);
    });
} else {
    console.log('No active step found!');
}

// Check card container
const card = document.querySelector('.card');
if (card) {
    console.log('\n=== CARD CONTAINER ===');
    console.log('Card element:', card);
    console.log('Card display:', window.getComputedStyle(card).display);
    console.log('Card visibility:', window.getComputedStyle(card).visibility);
    console.log('Card overflow:', window.getComputedStyle(card).overflow);
    console.log('Card height:', window.getComputedStyle(card).height);
    console.log('Card width:', window.getComputedStyle(card).width);
}

// Check main content
const mainContent = document.querySelector('.main-content');
if (mainContent) {
    console.log('\n=== MAIN CONTENT ===');
    console.log('Main content display:', window.getComputedStyle(mainContent).display);
    console.log('Main content visibility:', window.getComputedStyle(mainContent).visibility);
}

console.log('\n=== DEBUG COMPLETE ===');
console.log('If inputs are not visible, check the computed styles above for any issues.');
console.log('Look for display: none, visibility: hidden, opacity: 0, or height/width: 0');