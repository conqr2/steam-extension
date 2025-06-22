let exchangeRate = parseFloat(localStorage.getItem("exchangeRate")) || 0.13;
let lastFetched = parseInt(localStorage.getItem("lastFetched")) || 0;
const FETCH_INTERVAL = 15 * 60 * 1000; // 15 minutes

const style = document.createElement("style");
style.textContent = `
  body .converted-price-flash {
    animation: converted-price-flash 0.8s ease-in-out;
  }
    @keyframes converted-price-flash {
        30% {
            color:  rgba(255, 0, 0, 1);
            background-color: rgba(255, 0, 0, 0.3);
            box-shadow: inset 0 0 0 1px rgba(255, 0, 0, 1);
        }
    }
`;
document.head.appendChild(style);

function bankersRound(num) {
  const rounded = Math.round(num * 100) / 100;

  return +rounded.toFixed(2);
}

function applyFees(amount) {
  if (amount <= 0.99) {
    return bankersRound(amount * 1.03);
  } else if (amount <= 5) {
    return bankersRound(amount + 0.25);
  } else if (amount <= 10) {
    return bankersRound(amount + 0.49);
  } else if (amount <= 25) {
    return bankersRound(amount + 0.99);
  } else if (amount <= 50) {
    return bankersRound(amount + 1.49);
  } else if (amount <= 100) {
    return bankersRound(amount + 1.99);
  } else if (amount <= 200) {
    return bankersRound(amount * 1.02);
  } else {
    return bankersRound(amount); // No fees over $200
  }
}

function convertHKDToUSD(hkdString, includeLabel = false) {
  const match = hkdString.match(/HK\$ ([\d,\.]+)/);
  if (!match) return hkdString;

  const hkdValue = parseFloat(match[1].replace(/,/g, ""));
  const usdValue = hkdValue * exchangeRate;
  const usdValueWithBitrefillFees = usdValue * 1.0013; // 0.13% Bitrefill fee
  const usdValueWithFees = applyFees(usdValueWithBitrefillFees);

  return `$${usdValueWithFees.toFixed(2)}${
    includeLabel ? ` USD` : ""
  }`;
}

function replacePrices(node) {
  if (node.nodeType === Node.TEXT_NODE && node.textContent.includes("HK$")) {
    const parentElement = node.parentElement;

    const isDiscount =
      !!parentElement &&
      (parentElement.classList.contains("discount_final_price") ||
        parentElement.classList.contains("DOnsaVcV0Is-") ||
        parentElement.classList.contains("game_purchase_price"));

    const newText = node.textContent.replace(/HK\$ [\d,\.]+/g, (match) =>
      convertHKDToUSD(match, isDiscount)
    );
    if (newText !== node.textContent) {
      node.textContent = newText;
      const parent = node.parentElement;
      if (parent) {
        parent.classList.add("converted-price-flash");
        setTimeout(() => {
          parent.classList.remove("converted-price-flash");
        }, 800);
      }
    }
  } else if (node.nodeType === Node.ELEMENT_NODE) {
    for (const child of node.childNodes) {
      replacePrices(child);
    }
  }
}

async function fetchExchangeRateIfNeeded() {
  const now = Date.now();
  if (now - lastFetched < FETCH_INTERVAL) return;

  try {
    const res = await fetch(
      "https://api.coinbase.com/v2/exchange-rates?currency=HKD"
    );
    const data = await res.json();
    const rate = parseFloat(data.data.rates.USD);
    if (!isNaN(rate)) {
      exchangeRate = rate;
      lastFetched = now;
      localStorage.setItem("exchangeRate", rate.toString());
      localStorage.setItem("lastFetched", now.toString());
      console.log("Updated exchange rate:", exchangeRate);
    }
  } catch (error) {
    console.error("Failed to fetch exchange rate:", error);
  }
}

setTimeout(() => {
  replacePrices(document.body);
}, 2000);

fetchExchangeRateIfNeeded(); // Refresh only once per session after invocation

// Optional: also observe for dynamic content (e.g., Ajax-loaded items)
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    for (const node of mutation.addedNodes) {
      replacePrices(node);
    }
  });
});

observer.observe(document.body, { childList: true, subtree: true });

console.log("HKD to USD price converter loaded.");
