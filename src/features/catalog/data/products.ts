export type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  image: string;
  tag: string;
  description: string;
  sizes: string[];
  colors: string[];
  variants?: Array<{ id: string; size: string | null; colorName: string | null; colorHex: string | null; stockQuantity: number; isActive: boolean }>;
};
export const products: Product[] = [
  {
    id: "prod-1",
    name: "The Vivienne Asymmetric Draped Gown",
    category: "Eveningwear",
    price: 48500,
    image:
      "https://lh3.googleusercontent.com/aida/ALJJyrA9nhLYDvMhG8chCphikRvYWVmMlr42YbZZNaPb4rvR7vRd3nGkdg-BFMAqSh2N-4dsR4Qcz4ttYUozXw-RpGqMyedDh3je5HHLZaA_Y2egwB_dNI95q1XwiXaxgzAPQD30myZN_aw16r_6Dan8Uorni_XsU9DLiYmsfV9OpkDWFtONWTKs5TXfWtsmO8gYpapAKNvLhuhndtrBMTbrsDa1Zv4hpiPlbMSPnMGggQHl",
    tag: "NEW ARRIVAL",
    description:
      "A considered silhouette, crafted with a focus on movement, texture and timeless elegance. Designed to become a lasting part of your wardrobe.",
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: ["#d8b5a8", "#2b2526", "#eee5d8"],
  },
  {
    id: "prod-2",
    name: "Étoile Bias-Cut Silk Slip",
    category: "Silk separates",
    price: 32800,
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuB_xowpiDAlcg_N6NnzfovvqjDS2-7R7S2hCeW4KRjnClQH2pXXXipR9G-LZ-yVZ19ybn-3CIvruk6jY7TLYzHocl3zkQnG1mk34dkwkFNYvTFO4HqOvkbQuJatRKiFQj3YGvKDRS5dSJ6ORAQYz96VDUti1f16nIDLjq2zcC43iX01gHe1XyhAWc7qfPjpiACAjJm8FjL9LWPnZN9MPdLpHvYySWr5el2bl9IAVGVj",
    tag: "ATELIER EXCLUSIVE",
    description:
      "A considered silhouette, crafted with a focus on movement, texture and timeless elegance. Designed to become a lasting part of your wardrobe.",
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: ["#d8b5a8", "#2b2526", "#eee5d8"],
  },
  {
    id: "prod-3",
    name: "Geneviève Pleated Organza Maxi",
    category: "Eveningwear",
    price: 56000,
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAe80g8JAmzC3TzeXyp1S_HJeIHp0gkiXFS0rKmFblp1vzI74ihA8rpF0N_j663B5pW8vBmj9_FZBdd8Ahp9saguNRANRXaD0l3GdDgE-uG6yInjUMohb6FTDmMxaRMj6tPUiwkHRj2BopAgy7vLmRrODsVskK2o3zTEmcYBh5YmAYR7FFFiNrGReT59N63pFcvB8KeqHnJtiFHPYDXzMaK1k7hohnYPMxzifAhCTSJ",
    tag: "LIMITED RUN",
    description:
      "A considered silhouette, crafted with a focus on movement, texture and timeless elegance. Designed to become a lasting part of your wardrobe.",
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: ["#d8b5a8", "#2b2526", "#eee5d8"],
  },
  {
    id: "prod-4",
    name: "Palais Double-Breasted Silk Blazer",
    category: "Tailoring",
    price: 42500,
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuB72WNM7bHmkheZg27GujDvNIgeX5q9FlvzRarUurHeVwZ52hrDfiw53j2JYemsV-23Kue2spyZPx2Hrh-JG-KSMQiI5ezZgWGqIfEfjydkjxQhQFc41XB0p_kloGaLj3_zoNdLEd9d0mGbUWgYLmJNEhPvx1iwcfPc4H6atn-dpJa7mIPVRJP_9SpHvfYNrTDsH54dP4JW6orO5C8eC_xnUHopBetCoajolPraUtrI",
    tag: "NEW ARRIVAL",
    description:
      "A considered silhouette, crafted with a focus on movement, texture and timeless elegance. Designed to become a lasting part of your wardrobe.",
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: ["#d8b5a8", "#2b2526", "#eee5d8"],
  },
  {
    id: "prod-5",
    name: "Camille Embroidered Eastern Kurta Set",
    category: "Eastern atelier",
    price: 38900,
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBxz_4qvr74aSXEuXaALGTzfe5-qG4Lvu7y6_8oqX7NtsZv06gTmSUBX-AfFrMT0DRz3myw5hX2UoXk-ylJQlOxUkfNyKLeOBEOmmij_aoXyuOP6tZTS0HsHBmUo0VufEeI6yhnmykZmnO61SIa52guFJ_t9t9ciH5ibMj7zkWxHCmdLrza42SVn4PTG4YU9yvxXDT8xn6MSn06wSZngopxwskwwrU6jVpaZWF4oF3z",
    tag: "ATELIER EXCLUSIVE",
    description:
      "A considered silhouette, crafted with a focus on movement, texture and timeless elegance. Designed to become a lasting part of your wardrobe.",
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: ["#d8b5a8", "#2b2526", "#eee5d8"],
  },
  {
    id: "prod-6",
    name: "MUSEHRASignature Velvet Corset Gown",
    category: "Eveningwear",
    price: 64000,
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAlWi4e1Nuo5oW5lDBWAkw_BI8xmT8K9T96cUy4hbPTwTf-3DMsZCgI-nwTduPwsjeYbCgcXRN53jPkrpm9T_7pS3P-LDK2Lt1YFRtNiaTeBHcxn5sWGGwcCuR5osgl6WLEGg2Wwp-cem_liOCAAFggWMcGeZBQfuVlpD3tU1irx0ZD3bB-ysfvTYpOTPl4_qsQIws-vMSklm3g_PlYAl7owYDufxkDOYzTUdFaSs-u",
    tag: "LIMITED RUN",
    description:
      "A considered silhouette, crafted with a focus on movement, texture and timeless elegance. Designed to become a lasting part of your wardrobe.",
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: ["#d8b5a8", "#2b2526", "#eee5d8"],
  },
  {
    id: "prod-7",
    name: "Lumière Draped Organza Blouse",
    category: "Ready-to-wear",
    price: 26500,
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDlQ5uD0W_l--lMMVfqn4DWh7ZLS_6esRveWVxMxTEE_VYbuoBqvIGxfYAa2mwFTHzw2Iqwsul0dcFrR5Fwjli_MUrgG74OMxEBskpHxDD2NMrlQcDX1OvpNzjbJL9X134k4_XYlHhYmRJFAYdslxheZ0duxKWzv6QJmaTlmw_bxs33MeAlZQ1lC3Ob3sd7jG4GoW_ya-cWCWKBUe0lynufHZ_QQJK9KNSqYJaNZVtW",
    tag: "NEW ARRIVAL",
    description:
      "A considered silhouette, crafted with a focus on movement, texture and timeless elegance. Designed to become a lasting part of your wardrobe.",
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: ["#d8b5a8", "#2b2526", "#eee5d8"],
  },
  {
    id: "prod-8",
    name: "Aethel Cashmere Trench Coat",
    category: "Outerwear",
    price: 72000,
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBhm4eiz3GQjubbaGJqgCGm6Gz_yhXK6bLdhYrf2dlCgZBVyYH4hDG7goLqiIi_Ei-nPLRpqBEO8ceczEGpW7hMdHK9izeoJYr_8P2UxNkywCKCy2SHh4XZKazRuU-1RguYVHXWADueITC4Q_lO7ncMR8zaVSCBRPId5FIhgw6R0wQUYEtnXllvsX6NoqC0JB4cEiN36ZPrBU0jjbh7k37TlR1Cdag0s9VFpdKDX86J",
    tag: "ATELIER EXCLUSIVE",
    description:
      "A considered silhouette, crafted with a focus on movement, texture and timeless elegance. Designed to become a lasting part of your wardrobe.",
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: ["#d8b5a8", "#2b2526", "#eee5d8"],
  },
];
