/**
 * Shop and service category taxonomies.
 *
 * These are UI constants, not mock data — they describe the catalogue
 * of categories the app offers. They were previously bundled into
 * `mock-data.ts`, which made them look like sample data when in fact
 * they're production catalogue definitions.
 */

export interface ShopCategory {
  id: string;
  label: string;
  icon: string;
  color: string;
}

export const SHOP_CATEGORIES: ShopCategory[] = [
  { id: "Electronics", label: "Electronics", icon: "📱", color: "#0EA5E9" },
  { id: "Fashion", label: "Fashion", icon: "👟", color: "#A855F7" },
  { id: "Food", label: "Food", icon: "🍲", color: "#F97316" },
  { id: "Groceries", label: "Groceries", icon: "🥗", color: "#15803D" },
  { id: "Phones", label: "Phones", icon: "📲", color: "#0284C7" },
  { id: "Home & Living", label: "Home & Living", icon: "🛋️", color: "#B45309" },
  { id: "Student Essentials", label: "Student", icon: "🎓", color: "#DC2626" },
  { id: "Beauty", label: "Beauty", icon: "💄", color: "#DB2777" },
];

export interface ServiceCategory {
  id: string;
  label: string;
  icon: string;
}

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  { id: "Cleaning", label: "Cleaning", icon: "🧽" },
  { id: "Electrical", label: "Electrical", icon: "⚡" },
  { id: "Plumbing", label: "Plumbing", icon: "🔧" },
  { id: "Repairs", label: "Repairs", icon: "🛠️" },
  { id: "Errands", label: "Errands", icon: "🛒" },
  { id: "Moving", label: "Moving", icon: "📦" },
  { id: "Beauty", label: "Beauty", icon: "💆" },
  { id: "Tutoring", label: "Tutoring", icon: "📚" },
  { id: "Deliveries", label: "Deliveries", icon: "🚚" },
];
