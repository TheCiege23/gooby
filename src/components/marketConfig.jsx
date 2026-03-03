// NEW: shared market + category config for NY/NJ/CT/PA rollout
export const TARGET_STATES = ["NY", "NJ", "CT", "PA"];

export const CORE_CATEGORIES = [
  { label: "Clothing", value: "clothing" },
  { label: "Electronics", value: "electronics" },
  { label: "Shoes (Women & Men)", value: "shoes" },
  { label: "Accessories", value: "accessories" },
  { label: "Food", value: "food" },
];

export const EXTENDED_CATEGORIES = [
  ...CORE_CATEGORIES,
  { label: "Furniture", value: "furniture" },
  { label: "Home Goods", value: "home_goods" },
  { label: "Sports", value: "sports" },
  { label: "Books", value: "books" },
  { label: "Jewelry", value: "jewelry" },
  { label: "Toys", value: "toys" },
  { label: "Other", value: "other" },
];

const CATEGORY_ALIASES = {
  apparel: "clothing",
  fashion: "clothing",
  footwear: "shoes",
  sneaker: "shoes",
  sneakers: "shoes",
  accessory: "accessories",
  accessories: "accessories",
  grocery: "food",
  supermarket: "food",
  food: "food",
};

export function normalizeCategory(value) {
  const raw = String(value || "").trim().toLowerCase().replace(/\s+/g, "_");
  if (!raw) return "other";
  if (EXTENDED_CATEGORIES.some((c) => c.value === raw)) return raw;
  return CATEGORY_ALIASES[raw] || "other";
}

export function isTargetState(value) {
  return TARGET_STATES.includes(String(value || "").trim().toUpperCase());
}