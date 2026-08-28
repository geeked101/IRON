export type FoodCategory = 'staples' | 'meat' | 'veg' | 'legumes' | 'snacks' | 'drinks'

export interface Food {
  id: string
  name: string
  category: FoodCategory
  caloriesPerServing: number
  proteinG: number
  carbsG: number
  fatG: number
  servingDescription: string   // e.g. "1 cup", "1 piece"
  servingGrams: number
}

export const KENYAN_FOODS: Food[] = [
  // Staples
  { id: 'ugali', name: 'Ugali', category: 'staples', caloriesPerServing: 280, proteinG: 6, carbsG: 60, fatG: 1, servingDescription: '1 serving (200g)', servingGrams: 200 },
  { id: 'chapati', name: 'Chapati', category: 'staples', caloriesPerServing: 220, proteinG: 6, carbsG: 38, fatG: 5, servingDescription: '1 piece', servingGrams: 80 },
  { id: 'rice', name: 'Rice (cooked)', category: 'staples', caloriesPerServing: 200, proteinG: 4, carbsG: 44, fatG: 0, servingDescription: '1 cup (180g)', servingGrams: 180 },
  { id: 'mukimo', name: 'Mukimo', category: 'staples', caloriesPerServing: 260, proteinG: 8, carbsG: 46, fatG: 5, servingDescription: '1 serving (200g)', servingGrams: 200 },
  { id: 'mandazi', name: 'Mandazi', category: 'snacks', caloriesPerServing: 180, proteinG: 3, carbsG: 28, fatG: 7, servingDescription: '1 piece (60g)', servingGrams: 60 },
  { id: 'pilau', name: 'Pilau (beef)', category: 'staples', caloriesPerServing: 480, proteinG: 28, carbsG: 58, fatG: 14, servingDescription: '1 plate (300g)', servingGrams: 300 },

  // Meat & Protein
  { id: 'nyama-choma', name: 'Nyama Choma', category: 'meat', caloriesPerServing: 380, proteinG: 46, carbsG: 0, fatG: 18, servingDescription: '1 serving (200g)', servingGrams: 200 },
  { id: 'omena', name: 'Omena', category: 'meat', caloriesPerServing: 210, proteinG: 32, carbsG: 0, fatG: 8, servingDescription: '1 cup (80g)', servingGrams: 80 },
  { id: 'chicken-stew', name: 'Chicken Stew', category: 'meat', caloriesPerServing: 320, proteinG: 38, carbsG: 8, fatG: 14, servingDescription: '1 serving (250g)', servingGrams: 250 },
  { id: 'eggs', name: 'Eggs (boiled)', category: 'meat', caloriesPerServing: 155, proteinG: 13, carbsG: 1, fatG: 11, servingDescription: '2 eggs', servingGrams: 100 },

  // Vegetables
  { id: 'sukuma-wiki', name: 'Sukuma Wiki', category: 'veg', caloriesPerServing: 45, proteinG: 3, carbsG: 7, fatG: 1, servingDescription: '1 cup cooked', servingGrams: 120 },
  { id: 'cabbage', name: 'Cabbage (cooked)', category: 'veg', caloriesPerServing: 35, proteinG: 2, carbsG: 6, fatG: 0, servingDescription: '1 cup', servingGrams: 120 },
  { id: 'tomatoes', name: 'Tomatoes', category: 'veg', caloriesPerServing: 20, proteinG: 1, carbsG: 4, fatG: 0, servingDescription: '2 medium', servingGrams: 120 },
  { id: 'spinach', name: 'Spinach (cooked)', category: 'veg', caloriesPerServing: 40, proteinG: 5, carbsG: 4, fatG: 0, servingDescription: '1 cup', servingGrams: 100 },

  // Legumes
  { id: 'ndengu', name: 'Ndengu (green grams)', category: 'legumes', caloriesPerServing: 180, proteinG: 12, carbsG: 28, fatG: 2, servingDescription: '1 cup cooked', servingGrams: 200 },
  { id: 'beans', name: 'Red Beans', category: 'legumes', caloriesPerServing: 220, proteinG: 14, carbsG: 38, fatG: 1, servingDescription: '1 cup cooked', servingGrams: 200 },
  { id: 'githeri', name: 'Githeri', category: 'legumes', caloriesPerServing: 290, proteinG: 16, carbsG: 48, fatG: 3, servingDescription: '1 plate (250g)', servingGrams: 250 },
  { id: 'lentils', name: 'Lentils', category: 'legumes', caloriesPerServing: 230, proteinG: 18, carbsG: 36, fatG: 1, servingDescription: '1 cup cooked', servingGrams: 200 },

  // Drinks
  { id: 'uji', name: 'Uji (porridge)', category: 'drinks', caloriesPerServing: 120, proteinG: 4, carbsG: 24, fatG: 1, servingDescription: '1 cup (240ml)', servingGrams: 240 },
  { id: 'milk', name: 'Full cream milk', category: 'drinks', caloriesPerServing: 150, proteinG: 8, carbsG: 12, fatG: 8, servingDescription: '1 cup (240ml)', servingGrams: 240 },

  // Mass Shake (special)
  { id: 'mass-shake', name: 'Homemade Mass Shake', category: 'drinks', caloriesPerServing: 850, proteinG: 35, carbsG: 110, fatG: 28, servingDescription: '1 shake', servingGrams: 500 },
]

export const CATEGORIES: { key: FoodCategory | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'staples', label: 'Staples' },
  { key: 'meat', label: 'Meat' },
  { key: 'legumes', label: 'Legumes' },
  { key: 'veg', label: 'Veg' },
  { key: 'snacks', label: 'Snacks' },
  { key: 'drinks', label: 'Drinks' },
]
