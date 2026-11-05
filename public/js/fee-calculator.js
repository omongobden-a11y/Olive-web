// ==========================================================================
// Olive Nursery & Primary School - Atapara Official Fees Calculator
// Uses strictly simple words: School Fees, Food Stuffs, Payments.
// Official rates and requirements from School Circular.
// ==========================================================================

const FEE_SCHEDULE = {
  nursery: {
    label: 'Nursery Section (Baby K-1, Middle K-2, Top K-3)',
    day: 78000,
    boarding: 158500,
    compulsoryBoarding: false,
    notes: 'Installment / part payments accepted.'
  },
  lower_primary: {
    label: 'Lower Primary (P.1 – P.3)',
    day: 88500,
    boarding: 158500,
    compulsoryBoarding: false,
    notes: 'Installment / part payments accepted.'
  },
  p4: {
    label: 'Primary Four (P.4)',
    day: 108500,
    boarding: 168500,
    compulsoryBoarding: false,
    notes: 'Installment / part payments accepted.'
  },
  p5: {
    label: 'Primary Five (P.5) [Compulsory Boarding]',
    day: null,
    boarding: 168500,
    compulsoryBoarding: true,
    notes: 'Boarding is compulsory for P.5, P.6 and P.7.'
  },
  p6: {
    label: 'Primary Six (P.6) [Compulsory Boarding]',
    day: null,
    boarding: 178500,
    compulsoryBoarding: true,
    notes: 'Boarding is compulsory for P.5, P.6 and P.7.'
  },
  p7: {
    label: 'Primary Seven (P.7 - Candidate) [Compulsory Boarding]',
    day: null,
    boarding: 188500,
    compulsoryBoarding: true,
    notes: 'Boarding is compulsory for P.5, P.6 and P.7.'
  }
};

const FOOD_STUFFS = {
  day: {
    beans: 'Beans: 06 kg',
    maize: 'Maize: 12 kg',
    sugar: 'Sugar: 2½ kg',
    toiletTissue: '2 rolls of Toilet tissue',
    brooms: '2 brooms',
    soap: 'A bar of soap (KUKU)',
    materials: 'Enough learning materials'
  },
  boarding: {
    beans: 'Beans: 15 kg',
    maize: 'Maize: 25 kg',
    sugar: 'Sugar: 3 kg',
    toiletTissue: '2 rolls of Toilet tissue',
    brooms: '2 brooms',
    soap: 'A bar of soap (KUKU)',
    books: '1 dozen of 3 Quire books (for P.6 & P.7)',
    materials: 'Bedding, Sunday wear (UGX 33,000) & learning materials'
  }
};

const HOLIDAY_PACKAGE_FEE = 10000; // Compulsory UGX 10,000 each term
const EXTRA_EXAMS_FEE = 2000;      // UGX 2,000 for extra exams Baby-P.7
const SUNDAY_WEAR_FEE = 33000;     // UGX 33,000 weekend/Sunday wear for boarders
const EMIS_REG_FEE = 3000;         // UGX 3,000 for new comers / without LIN
const PAPER_REAM_FEE = 30000;      // UGX 30,000 if parent opts to pay cash for ream of paper

function formatUGX(amount) {
  return 'UGX ' + Number(amount || 0).toLocaleString('en-US');
}

function initFeeCalculator() {
  const classSelect = document.getElementById('calc-class');
  const typeSelect = document.getElementById('calc-type');
  const incHolidayPkg = document.getElementById('calc-holiday-pkg');
  const incExtraExams = document.getElementById('calc-extra-exams');
  const incSundayWear = document.getElementById('calc-sunday-wear');
  const incEmis = document.getElementById('calc-emis');
  const incPaper = document.getElementById('calc-paper');

  const baseFeesDisplay = document.getElementById('calc-base-fees-val');
  const holidayDisplay = document.getElementById('calc-holiday-val');
  const itemsDisplay = document.getElementById('calc-items-val');
  const totalDisplay = document.getElementById('calc-total-val');
  const payBtn = document.getElementById('calc-pay-btn');
  const noticeBox = document.getElementById('calc-boarding-notice');
  const foodstuffsBox = document.getElementById('calc-foodstuffs-summary');

  if (!classSelect || !typeSelect) return;

  function recalculate() {
    const selectedKey = classSelect.value;
    const schedule = FEE_SCHEDULE[selectedKey] || FEE_SCHEDULE.nursery;

    // Check compulsory boarding rule
    if (schedule.compulsoryBoarding) {
      typeSelect.value = 'boarding';
      const dayOption = typeSelect.querySelector('option[value="day"]');
      if (dayOption) dayOption.disabled = true;
      if (noticeBox) {
        noticeBox.style.display = 'block';
        noticeBox.innerHTML = `⚠️ <b>Compulsory Boarding:</b> All P.5, P.6, and P.7 pupils are full boarders for intensive coaching and supervision.`;
      }
    } else {
      const dayOption = typeSelect.querySelector('option[value="day"]');
      if (dayOption) dayOption.disabled = false;
      if (noticeBox) {
        noticeBox.style.display = 'none';
      }
    }

    const isBoarding = typeSelect.value === 'boarding';
    const baseFee = isBoarding ? schedule.boarding : schedule.day;
    const holidayFee = HOLIDAY_PACKAGE_FEE;
    const extraExamsFee = EXTRA_EXAMS_FEE;

    // Sunday wear is required for boarding
    if (incSundayWear) {
      if (isBoarding) {
        incSundayWear.checked = true;
        incSundayWear.disabled = false;
      } else {
        incSundayWear.checked = false;
        incSundayWear.disabled = true;
      }
    }

    let addOns = extraExamsFee;
    if (incSundayWear && incSundayWear.checked && isBoarding) addOns += SUNDAY_WEAR_FEE;
    if (incEmis && incEmis.checked) addOns += EMIS_REG_FEE;
    if (incPaper && incPaper.checked) addOns += PAPER_REAM_FEE;

    const grandTotal = baseFee + holidayFee + addOns;

    if (baseFeesDisplay) baseFeesDisplay.textContent = formatUGX(baseFee);
    if (holidayDisplay) holidayDisplay.textContent = formatUGX(holidayFee);
    if (itemsDisplay) itemsDisplay.textContent = formatUGX(addOns);
    if (totalDisplay) totalDisplay.textContent = formatUGX(grandTotal);

    // Update food stuffs summary list
    if (foodstuffsBox) {
      const req = isBoarding ? FOOD_STUFFS.boarding : FOOD_STUFFS.day;
      let listHtml = `
        <div style="font-weight:700; color:var(--crimson); margin-bottom:6px;">
          🥗 Food Stuffs &amp; Items to bring to school (${isBoarding ? 'Boarding' : 'Day'}):
        </div>
        <ul style="margin:0; padding-left:18px; line-height:1.6; font-size:0.88rem; color:var(--text-muted);">
          <li><b>${req.beans}</b></li>
          <li><b>${req.maize}</b></li>
          <li><b>${req.sugar}</b></li>
          <li>${req.toiletTissue}</li>
          <li>${req.brooms}</li>
          <li>${req.soap}</li>
          ${isBoarding ? `<li><b>${req.books}</b></li>` : ''}
          <li>${req.materials}</li>
        </ul>
      `;
      foodstuffsBox.innerHTML = listHtml;
    }

    if (payBtn) {
      payBtn.onclick = () => {
        let classLabel = 'Nursery';
        if (selectedKey === 'lower_primary') classLabel = 'P.1 - P.3';
        else if (selectedKey === 'p4') classLabel = 'P.4';
        else if (selectedKey === 'p5') classLabel = 'P.5';
        else if (selectedKey === 'p6') classLabel = 'P.6';
        else if (selectedKey === 'p7') classLabel = 'P.7';

        if (typeof window.openPaymentModal === 'function') {
          window.openPaymentModal({
            className: classLabel,
            feeCategory: isBoarding ? 'Boarding School Fees' : 'Day Scholar School Fees',
            amount: grandTotal
          });
        }
      };
    }
  }

  classSelect.addEventListener('change', recalculate);
  typeSelect.addEventListener('change', recalculate);
  if (incSundayWear) incSundayWear.addEventListener('change', recalculate);
  if (incEmis) incEmis.addEventListener('change', recalculate);
  if (incPaper) incPaper.addEventListener('change', recalculate);

  recalculate();
}

function copyBankAccount() {
  const acc = '120396591117';
  if (navigator.clipboard) {
    navigator.clipboard.writeText(acc).then(() => {
      alert(`✅ Bank Account copied to clipboard:\n120396591117\nOpportunity Bank, Kamdini branch\nOlive Nursery and Primary School - Atapara`);
    }).catch(() => {
      prompt('Copy the school bank account below:', acc);
    });
  } else {
    prompt('Copy the school bank account below:', acc);
  }
}

// Make accessible globally
window.initFeeCalculator = initFeeCalculator;
window.copyBankAccount = copyBankAccount;
