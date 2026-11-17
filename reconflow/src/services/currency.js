export const toPaise = (value) => Math.round(Number(value) * 100);
export const fromPaise = (value) => (Number(value || 0) / 100).toFixed(2);
export const inr = (paise) => new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR", minimumFractionDigits: 2
}).format(Number(paise || 0) / 100);