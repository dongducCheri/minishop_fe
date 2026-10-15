export type UserRole = 'customer' | 'admin'

export interface User {
  id: number
  email: string
  role: UserRole
}

export interface LoginResponse {
  token: string
  user: User
}

export interface Category {
  id: number
  name: string
  description?: string | null
  products_count?: number
  created_at?: string
  updated_at?: string
}

export interface Product {
  id: number
  name: string
  description: string | null
  price: number
  category_id: number | null
  category: Category | null
  created_at: string
  updated_at: string
}

export interface ProductsResponse {
  data: Product[]
  meta: {
    current_page: number
    total_pages: number
    total_count: number
  }
}

export interface CartItem {
  id: number
  product_id: number
  product_name: string
  price_cents: number
  quantity: number
  total_cents: number
}

export interface CartResponse {
  items: CartItem[]
  total_cents: number
}

export interface OrderItem {
  id: number
  product_id: number
  product_name: string
  quantity: number
  unit_price_cents: number
  subtotal_cents: number
}

export interface Order {
  id: number
  status: string
  total_cents: number
  created_at: string
  items: OrderItem[]
}

export interface Review {
  id: number
  user_name?: string
  score: number
  feedback: string | null
  created_at: string
}

export interface ProductReviewsResponse {
  average_rating: number
  reviews_count: number
  reviews: Review[]
}

export interface Conversation {
  id: number
  status: 'open' | 'closed'
  user_id: number
  user_email?: string
  admin_id?: number | null
  created_at: string
  updated_at: string
}

export interface ChatMessage {
  id: number
  body: string
  sender_id: number
  sender_role: 'customer' | 'admin'
  created_at: string
}