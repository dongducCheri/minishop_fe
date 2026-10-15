import type {
  CartResponse,
  Category,
  ChatMessage,
  Conversation,
  LoginResponse,
  Order,
  Product,
  ProductReviewsResponse,
  ProductsResponse,
  User,
} from './types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

type RequestMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE'

interface RequestOptions {
  method?: RequestMethod
  token?: string
  body?: unknown
}

async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', token, body } = options
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  const data = await response.json().catch(() => null)
  if (!response.ok) {
    let message = `Request failed with ${response.status}`
    if (typeof data?.error === 'string' && data.error.trim()) {
      message = data.error
    } else if (Array.isArray(data?.errors) && data.errors.length > 0) {
      message = data.errors.join(', ')
    } else if (data?.errors && typeof data.errors === 'object') {
      message = Object.values(data.errors)
        .flat()
        .join(', ')
    }
    throw new Error(message)
  }
  return data as T
}

export const api = {
  login: (email: string, password: string) =>
    apiRequest<LoginResponse>('/login', { method: 'POST', body: { email, password } }),

  me: (token: string) => apiRequest<User>('/me', { token }),
  logout: (token: string) => apiRequest<{ message: string }>('/logout', { method: 'POST', token }),

  getCategories: () => apiRequest<Category[]>('/categories'),
  getCategory: (id: number) => apiRequest<Category>(`/categories/${id}`),
  createCategory: (token: string, payload: { name: string; description?: string }) =>
    apiRequest<Category>('/categories', { method: 'POST', token, body: payload }),
  updateCategory: (token: string, id: number, payload: { name?: string; description?: string }) =>
    apiRequest<Category>(`/categories/${id}`, { method: 'PATCH', token, body: payload }),
  deleteCategory: (token: string, id: number) =>
    apiRequest<{ message: string }>(`/categories/${id}`, { method: 'DELETE', token }),

  getProducts: (params: { q?: string; category_id?: number; page: number; per_page: number }) => {
    const query = new URLSearchParams()
    if (params.q) query.set('q', params.q)
    if (params.category_id) query.set('category_id', String(params.category_id))
    query.set('page', String(params.page))
    query.set('per_page', String(params.per_page))
    return apiRequest<ProductsResponse>(`/products?${query.toString()}`)
  },
  getProduct: (productId: number) => apiRequest<Product>(`/products/${productId}`),

  getCart: (token: string) => apiRequest<CartResponse>('/cart', { token }),
  addCartItem: (token: string, payload: { product_id: number; quantity: number }) =>
    apiRequest<CartResponse>('/cart/items', { method: 'POST', token, body: payload }),
  updateCartItem: (token: string, itemId: number, quantity: number) =>
    apiRequest<CartResponse>(`/cart/items/${itemId}`, { method: 'PATCH', token, body: { quantity } }),
  deleteCartItem: (token: string, itemId: number) =>
    apiRequest<CartResponse>(`/cart/items/${itemId}`, { method: 'DELETE', token }),

  checkout: (token: string) => apiRequest<Order>('/orders', { method: 'POST', token }),
  getOrders: (token: string) => apiRequest<Order[]>('/orders', { token }),
  getOrder: (token: string, orderId: number) => apiRequest<Order>(`/orders/${orderId}`, { token }),

  getAdminOrders: (token: string, status?: string) => {
    const query = new URLSearchParams()
    if (status) query.set('status', status)
    const suffix = query.size > 0 ? `?${query.toString()}` : ''
    return apiRequest<Order[]>(`/admin/orders${suffix}`, { token })
  },
  updateAdminOrderStatus: (token: string, orderId: number, status: string) =>
    apiRequest<Order>(`/admin/orders/${orderId}`, { method: 'PATCH', token, body: { status } }),

  getProductReviews: (productId: number) => apiRequest<ProductReviewsResponse>(`/products/${productId}/reviews`),
  createProductReview: (token: string, productId: number, score: number, feedback: string) =>
    apiRequest(`/products/${productId}/reviews`, {
      method: 'POST',
      token,
      body: { score, feedback },
    }),

 
  // Chat & Conversation API
  getConversations: (token: string) =>
    apiRequest<Conversation[]>('/conversations', { token }),

  createConversation: (token: string) =>
    apiRequest<Conversation>('/conversations', { method: 'POST', token }),

  getConversationMessages: (token: string, conversationId: number, page = 1) =>
    apiRequest<ChatMessage[]>(`/conversations/${conversationId}/messages?page=${page}`, { token }),
}

