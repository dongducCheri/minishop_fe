import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { api } from './api'
import type { CartResponse, Category, Order, Product, ProductReviewsResponse, User } from './types'
import { Chat } from './Chat'
import './App.css'

const TOKEN_STORAGE_KEY = 'minishop_api_token'
const PER_PAGE = 8
const ORDER_STATUSES = ['shipped', 'delivered', 'cancelled'] as const

type Screen = 'login' | 'shop' | 'cart' | 'orders' | 'reviews' | 'admin' | 'categories' | 'chat'

function formatMoney(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString()
}

function App() {
  const [token, setToken] = useState<string>(() => localStorage.getItem(TOKEN_STORAGE_KEY) ?? '')
  const [screen, setScreen] = useState<Screen>(() => (localStorage.getItem(TOKEN_STORAGE_KEY) ? 'shop' : 'login'))
  const [me, setMe] = useState<User | null>(null)
  const [email, setEmail] = useState('customer@example.com')
  const [password, setPassword] = useState('password')
  const [authError, setAuthError] = useState('')

  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState<number | ''>('')
  const [productsError, setProductsError] = useState('')
  const [selectedProductDetail, setSelectedProductDetail] = useState<Product | null>(null)
  const [productDetailError, setProductDetailError] = useState('')

  const [cart, setCart] = useState<CartResponse | null>(null)
  const [cartError, setCartError] = useState('')

  const [orders, setOrders] = useState<Order[]>([])
  const [ordersError, setOrdersError] = useState('')
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [orderDetailError, setOrderDetailError] = useState('')

  const [adminOrders, setAdminOrders] = useState<Order[]>([])
  const [adminStatusFilter, setAdminStatusFilter] = useState('')
  const [adminError, setAdminError] = useState('')

  const [selectedProductId, setSelectedProductId] = useState<number | null>(null)
  const [reviews, setReviews] = useState<ProductReviewsResponse | null>(null)
  const [reviewScore, setReviewScore] = useState(5)
  const [reviewFeedback, setReviewFeedback] = useState('')
  const [reviewsError, setReviewsError] = useState('')

  const [categoryDetail, setCategoryDetail] = useState<Category | null>(null)
  const [categoryFormName, setCategoryFormName] = useState('')
  const [categoryFormDescription, setCategoryFormDescription] = useState('')
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null)
  const [categoriesError, setCategoriesError] = useState('')

  const isAuthenticated = Boolean(token)
  const isAdmin = me?.role === 'admin'

  async function loadSession(nextToken: string): Promise<void> {
    const profile = await api.me(nextToken)
    setMe(profile)
  }

  async function loadCategories(): Promise<void> {
    const data = await api.getCategories()
    setCategories(data)
  }

  async function loadProducts(): Promise<void> {
    const result = await api.getProducts({
      q: search.trim() || undefined,
      category_id: categoryId === '' ? undefined : categoryId,
      page,
      per_page: PER_PAGE,
    })
    setProducts(result.data)
    setTotalPages(Math.max(result.meta.total_pages, 1))
    setTotalCount(result.meta.total_count)
  }

  async function loadCart(currentToken: string): Promise<void> {
    const data = await api.getCart(currentToken)
    setCart(data)
  }

  async function loadOrders(currentToken: string): Promise<void> {
    const data = await api.getOrders(currentToken)
    setOrders(data)
  }

  async function loadAdminOrders(currentToken: string): Promise<void> {
    const data = await api.getAdminOrders(currentToken, adminStatusFilter || undefined)
    setAdminOrders(data)
  }

  async function loadReviews(productId: number): Promise<void> {
    const data = await api.getProductReviews(productId)
    setReviews(data)
  }

  async function loadProductDetail(productId: number): Promise<void> {
    const data = await api.getProduct(productId)
    setSelectedProductDetail(data)
  }

  async function loadOrderDetail(currentToken: string, orderId: number): Promise<void> {
    const data = await api.getOrder(currentToken, orderId)
    setSelectedOrder(data)
  }

  async function loadCategoryDetail(categoryIdValue: number): Promise<void> {
    const data = await api.getCategory(categoryIdValue)
    setCategoryDetail(data)
  }

  useEffect(() => {
    setCategoriesError('')
    loadCategories().catch((error: unknown) => {
      setCategoriesError(error instanceof Error ? error.message : 'Failed to load categories')
    })
  }, [])

  useEffect(() => {
    setProductsError('')
    loadProducts().catch((error: unknown) => {
      setProductsError(error instanceof Error ? error.message : 'Failed to load products')
    })
  }, [search, categoryId, page])

  useEffect(() => {
    if (!token) {
      setMe(null)
      setCart(null)
      setOrders([])
      setAdminOrders([])
      setScreen('login')
      return
    }

    setAuthError('')
    loadSession(token)
      .then(() => Promise.all([loadCart(token), loadOrders(token)]))
      .then(() => {
        if (screen === 'login') setScreen('shop')
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'Session expired'
        setAuthError(message)
        localStorage.removeItem(TOKEN_STORAGE_KEY)
        setToken('')
      })
  }, [token, screen])

  useEffect(() => {
    if (!token || !isAdmin) return
    setAdminError('')
    loadAdminOrders(token).catch((error: unknown) => {
      setAdminError(error instanceof Error ? error.message : 'Failed to load admin orders')
    })
  }, [token, isAdmin, adminStatusFilter])

  useEffect(() => {
    if (!selectedProductId) return
    setReviewsError('')
    loadReviews(selectedProductId).catch((error: unknown) => {
      setReviewsError(error instanceof Error ? error.message : 'Failed to load reviews')
    })
  }, [selectedProductId])

  useEffect(() => {
    if (!selectedOrderId || !token) {
      setSelectedOrder(null)
      return
    }
    setOrderDetailError('')
    loadOrderDetail(token, selectedOrderId).catch((error: unknown) => {
      setOrderDetailError(error instanceof Error ? error.message : 'Failed to load order detail')
    })
  }, [selectedOrderId, token])

  const selectedProductName = useMemo(() => {
    if (!selectedProductId) return ''
    return products.find((item) => item.id === selectedProductId)?.name ?? `#${selectedProductId}`
  }, [products, selectedProductId])

  const cartItemsCount = useMemo(
    () => (cart ? cart.items.reduce((total, item) => total + item.quantity, 0) : 0),
    [cart],
  )

  async function handleLogin(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setAuthError('')
    try {
      const data = await api.login(email, password)
      setToken(data.token)
      localStorage.setItem(TOKEN_STORAGE_KEY, data.token)
      setMe(data.user)
      setScreen('shop')
    } catch (error: unknown) {
      setAuthError(error instanceof Error ? error.message : 'Login failed')
    }
  }

  async function handleLogout(): Promise<void> {
    if (!token) return
    try {
      await api.logout(token)
    } catch {
      // Token can be expired server-side; local clear still needed.
    } finally {
      localStorage.removeItem(TOKEN_STORAGE_KEY)
      setToken('')
      setMe(null)
      setScreen('login')
    }
  }

  async function handleAddToCart(productId: number): Promise<void> {
    if (!token) {
      setCartError('Please login to add products to cart.')
      setScreen('login')
      return
    }
    setCartError('')
    try {
      const updated = await api.addCartItem(token, { product_id: productId, quantity: 1 })
      setCart(updated)
    } catch (error: unknown) {
      setCartError(error instanceof Error ? error.message : 'Failed to add item')
    }
  }

  async function handleUpdateCartItem(itemId: number, quantity: number): Promise<void> {
    if (!token) return
    setCartError('')
    try {
      const updated = await api.updateCartItem(token, itemId, quantity)
      setCart(updated)
    } catch (error: unknown) {
      setCartError(error instanceof Error ? error.message : 'Failed to update item')
    }
  }

  async function handleDeleteCartItem(itemId: number): Promise<void> {
    if (!token) return
    setCartError('')
    try {
      const updated = await api.deleteCartItem(token, itemId)
      setCart(updated)
    } catch (error: unknown) {
      setCartError(error instanceof Error ? error.message : 'Failed to remove item')
    }
  }

  async function handleCheckout(): Promise<void> {
    if (!token) return
    setOrdersError('')
    setCartError('')
    try {
      await api.checkout(token)
      await Promise.all([loadCart(token), loadOrders(token)])
      setScreen('orders')
    } catch (error: unknown) {
      setOrdersError(error instanceof Error ? error.message : 'Checkout failed')
    }
  }

  async function handleOpenProductDetail(productId: number): Promise<void> {
    setProductDetailError('')
    try {
      await loadProductDetail(productId)
    } catch (error: unknown) {
      setProductDetailError(error instanceof Error ? error.message : 'Failed to load product details')
    }
  }

  async function handleReviewSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (!token || !selectedProductId) return
    setReviewsError('')
    try {
      await api.createProductReview(token, selectedProductId, reviewScore, reviewFeedback)
      setReviewFeedback('')
      await loadReviews(selectedProductId)
    } catch (error: unknown) {
      setReviewsError(error instanceof Error ? error.message : 'Failed to submit review')
    }
  }

  async function handleAdminStatusUpdate(orderId: number, status: string): Promise<void> {
    if (!token) return
    setAdminError('')
    try {
      await api.updateAdminOrderStatus(token, orderId, status)
      await loadAdminOrders(token)
    } catch (error: unknown) {
      setAdminError(error instanceof Error ? error.message : 'Failed to update order status')
    }
  }

  async function handleCategorySubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (!token || !isAdmin) return
    const payload = {
      name: categoryFormName.trim(),
      description: categoryFormDescription.trim(),
    }
    if (!payload.name) {
      setCategoriesError('Category name is required')
      return
    }

    setCategoriesError('')
    try {
      if (editingCategoryId) {
        await api.updateCategory(token, editingCategoryId, payload)
      } else {
        await api.createCategory(token, payload)
      }
      setCategoryFormName('')
      setCategoryFormDescription('')
      setEditingCategoryId(null)
      await Promise.all([loadCategories(), loadProducts()])
    } catch (error: unknown) {
      setCategoriesError(error instanceof Error ? error.message : 'Failed to save category')
    }
  }

  async function handleCategoryDelete(categoryIdValue: number): Promise<void> {
    if (!token || !isAdmin) return
    setCategoriesError('')
    try {
      await api.deleteCategory(token, categoryIdValue)
      if (categoryId === categoryIdValue) setCategoryId('')
      if (categoryDetail?.id === categoryIdValue) setCategoryDetail(null)
      await Promise.all([loadCategories(), loadProducts()])
    } catch (error: unknown) {
      setCategoriesError(error instanceof Error ? error.message : 'Failed to delete category')
    }
  }

  function handleCategoryEdit(category: Category): void {
    setEditingCategoryId(category.id)
    setCategoryFormName(category.name)
    setCategoryFormDescription(category.description ?? '')
  }

  const navItems: Array<{ id: Screen; label: string; show: boolean }> = [
    { id: 'shop', label: 'Shop', show: true },
    { id: 'reviews', label: 'Reviews', show: true },
    { id: 'cart', label: `Cart (${cartItemsCount})`, show: true },
    { id: 'orders', label: 'My Orders', show: true },
    { id: 'chat', label: isAdmin ? 'Live Chats' : 'Support Chat', show: true },
    { id: 'admin', label: 'Admin Orders', show: isAdmin },
    { id: 'categories', label: 'Categories', show: isAdmin },
  ]

  if (screen === 'login') {
    return (
      <main className="auth-page min-h-screen px-4 py-8">
        <section className="auth-card mx-auto max-w-4xl rounded-3xl p-6 md:p-9">
          <div className="grid gap-8 md:grid-cols-[1.1fr_1fr] md:items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-indigo-200">MINISHOP</p>
              <h1 className="mt-3 text-3xl font-bold text-white md:text-4xl">Welcome back to your storefront</h1>
              <p className="mt-3 text-sm text-indigo-100/90">
                Sign in to manage cart, orders, product reviews, and admin operations from a dedicated dashboard.
              </p>
              <div className="mt-6 rounded-2xl bg-white/10 p-4 text-sm text-indigo-100">
                <p>Default account: customer@example.com / password</p>
              </div>
            </div>
            <form onSubmit={handleLogin} className="rounded-2xl bg-white p-5 shadow-xl">
              <h2 className="text-lg font-semibold text-slate-900">Login</h2>
              <label className="mt-4 block text-sm font-medium text-slate-700" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                className="field mt-1"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="customer@example.com"
              />
              <label className="mt-3 block text-sm font-medium text-slate-700" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                className="field mt-1"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button className="primary-btn mt-5 w-full">Enter shop dashboard</button>
              {authError && <p className="mt-3 text-sm text-rose-600">{authError}</p>}
            </form>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="shop-shell mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">
      <header className="shop-header rounded-2xl p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-indigo-100">Minishop</p>
            <h1 className="mt-2 text-2xl font-bold md:text-3xl">Modern storefront dashboard</h1>
            <p className="mt-2 max-w-2xl text-sm text-indigo-100/90">Dedicated pages for shopping, reviews, cart, and orders.</p>
          </div>
          <div className="min-w-[240px] rounded-xl bg-white/10 p-3 text-sm text-indigo-100">
            <p className="font-semibold">{me?.email ?? 'Guest'}</p>
            <p className="text-xs uppercase tracking-wide text-indigo-100/80">{me?.role ?? 'customer'}</p>
            <button type="button" onClick={handleLogout} className="ghost-btn mt-3 w-full border-white/50 bg-transparent text-white hover:bg-white/15">
              Logout
            </button>
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
          <nav className="flex flex-wrap gap-2">
            {navItems
              .filter((item) => item.show)
              .map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setScreen(item.id)}
                  className={screen === item.id ? 'shop-nav-btn active' : 'shop-nav-btn'}
                >
                  {item.label}
                </button>
              ))}
          </nav>
          <div className="text-xs text-indigo-100 md:text-right">
            API: <span className="font-semibold">{import.meta.env.VITE_API_BASE_URL ?? '/api/v1'}</span>
          </div>
        </div>
      </header>

      {screen === 'shop' && (
        <section className="mt-4 grid gap-4 lg:grid-cols-[280px_1fr]">
          <aside className="panel rounded-2xl p-4 md:p-5">
            <h2 className="text-base font-semibold">Shop filters</h2>
            <div className="mt-4 space-y-2">
              <input
                className="field"
                placeholder="Search products"
                value={search}
                onChange={(event) => {
                  setPage(1)
                  setSearch(event.target.value)
                }}
              />
              <select
                className="field"
                value={categoryId}
                onChange={(event) => {
                  setPage(1)
                  const value = event.target.value
                  setCategoryId(value ? Number(value) : '')
                }}
              >
                <option value="">All categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  setSearch('')
                  setCategoryId('')
                  setPage(1)
                }}
                className="ghost-btn w-full"
              >
                Reset filters
              </button>
            </div>
            <div className="mt-5 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
              <p>Total products: {totalCount}</p>
              <p className="mt-1">Page {page}/{totalPages}</p>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(current - 1, 1))}
                className="ghost-btn disabled:opacity-50"
              >
                Prev
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((current) => Math.min(current + 1, totalPages))}
                className="ghost-btn disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </aside>

          <div className="panel rounded-2xl p-4 md:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">Featured products</h2>
              <span className="text-sm text-slate-500">Fast checkout ready</span>
            </div>
            {productsError && <p className="mb-3 text-sm text-rose-600">{productsError}</p>}
            {categoriesError && <p className="mb-3 text-sm text-rose-600">{categoriesError}</p>}
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {products.map((product) => (
                <article key={product.id} className="product-card rounded-xl p-3">
                  <div className="product-image" />
                  <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-indigo-600">
                    {product.category?.name ?? 'Uncategorized'}
                  </p>
                  <h3 className="mt-1 line-clamp-1 text-base font-semibold text-slate-900">{product.name}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-600">{product.description || 'No description yet.'}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-lg font-bold text-slate-900">{formatMoney(Math.round(product.price * 100))}</p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedProductId(product.id)
                          setScreen('reviews')
                        }}
                        className="text-xs font-medium text-indigo-700 hover:text-indigo-500"
                      >
                        Reviews
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenProductDetail(product.id)}
                        className="text-xs font-medium text-slate-700 hover:text-slate-500"
                      >
                        Detail
                      </button>
                    </div>
                  </div>
                  <button type="button" onClick={() => handleAddToCart(product.id)} className="primary-btn mt-3 w-full">
                    Add to cart
                  </button>
                </article>
              ))}
            </div>
            {productDetailError && <p className="mt-3 text-sm text-rose-600">{productDetailError}</p>}
            {selectedProductDetail && (
              <article className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-base font-semibold">Product detail: {selectedProductDetail.name}</h3>
                  <button type="button" className="ghost-btn small-btn" onClick={() => setSelectedProductDetail(null)}>
                    Close
                  </button>
                </div>
                <p className="mt-2 text-sm text-slate-700">{selectedProductDetail.description || 'No description'}</p>
                <p className="mt-2 text-sm text-slate-700">Category: {selectedProductDetail.category?.name ?? 'Uncategorized'}</p>
                <p className="mt-1 text-sm text-slate-700">Last updated: {formatDate(selectedProductDetail.updated_at)}</p>
              </article>
            )}
          </div>
        </section>
      )}

      {screen === 'reviews' && (
        <section className="panel mt-4 rounded-2xl p-4 md:p-5">
          <div className="page-heading">
            <h2 className="text-lg font-semibold">Review page</h2>
            <p className="text-sm text-slate-500">Read ratings and submit your product feedback.</p>
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-[300px_1fr]">
            <select
              className="field"
              value={selectedProductId ?? ''}
              onChange={(event) => setSelectedProductId(event.target.value ? Number(event.target.value) : null)}
            >
              <option value="">Choose product</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
            <p className="text-sm text-slate-600">
              {!selectedProductId ? 'Pick a product to see ratings.' : `Selected: ${selectedProductName}`}
            </p>
          </div>

          {reviewsError && <p className="mt-3 text-sm text-rose-600">{reviewsError}</p>}
          {selectedProductId && reviews && (
            <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_340px]">
              <div>
                <p className="text-sm text-slate-700">
                  Average rating: <strong>{reviews.average_rating}</strong> from {reviews.reviews_count} review(s)
                </p>
                <div className="mt-3 space-y-2">
                  {reviews.reviews.map((review) => (
                    <article key={review.id} className="rounded-xl border border-slate-200 p-3">
                      <p className="text-sm font-semibold">Score {review.score}/5 {review.user_name ? `by ${review.user_name}` : ''}</p>
                      <p className="mt-1 text-sm text-slate-700">{review.feedback || '(No feedback)'}</p>
                      <p className="mt-1 text-xs text-slate-500">{formatDate(review.created_at)}</p>
                    </article>
                  ))}
                  {reviews.reviews.length === 0 && <p className="text-sm text-slate-600">No reviews yet.</p>}
                </div>
              </div>
              <form onSubmit={handleReviewSubmit} className="rounded-xl border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-900">Write a review</h3>
                <p className="mt-1 text-xs text-slate-500">Requires login and purchased product.</p>
                <label htmlFor="score" className="mt-4 block text-sm font-medium">
                  Score
                </label>
                <select
                  id="score"
                  className="field mt-1"
                  value={reviewScore}
                  onChange={(event) => setReviewScore(Number(event.target.value))}
                >
                  {[1, 2, 3, 4, 5].map((scoreValue) => (
                    <option key={scoreValue} value={scoreValue}>
                      {scoreValue}
                    </option>
                  ))}
                </select>
                <label htmlFor="feedback" className="mt-3 block text-sm font-medium">
                  Feedback
                </label>
                <textarea
                  id="feedback"
                  rows={4}
                  className="field mt-1"
                  value={reviewFeedback}
                  onChange={(event) => setReviewFeedback(event.target.value)}
                  placeholder="Tell others about this product."
                />
                <button disabled={!isAuthenticated} className="primary-btn mt-4 w-full disabled:opacity-50">
                  Submit review
                </button>
              </form>
            </div>
          )}
        </section>
      )}

      {screen === 'cart' && (
        <section className="mt-4 grid gap-4 xl:grid-cols-[1fr_320px]">
          <div className="panel rounded-2xl p-4 md:p-5">
            <div className="page-heading">
              <h2 className="text-lg font-semibold">Cart page</h2>
              <p className="text-sm text-slate-500">Manage quantities and complete checkout.</p>
            </div>
            {cartError && <p className="mt-3 text-sm text-rose-600">{cartError}</p>}
            {cart && (
              <div className="mt-4 space-y-3">
                {cart.items.map((item) => (
                  <article key={item.id} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-slate-900">{item.product_name}</h3>
                        <p className="text-sm text-slate-600">Subtotal: {formatMoney(item.total_cents)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleUpdateCartItem(item.id, Math.max(item.quantity - 1, 0))}
                          className="ghost-btn small-btn"
                        >
                          -1
                        </button>
                        <span className="min-w-8 text-center text-sm font-semibold">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateCartItem(item.id, item.quantity + 1)}
                          className="ghost-btn small-btn"
                        >
                          +1
                        </button>
                        <button type="button" onClick={() => handleDeleteCartItem(item.id)} className="ghost-btn small-btn">
                          Remove
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
                {cart.items.length === 0 && <p className="text-sm text-slate-600">Your cart is empty.</p>}
              </div>
            )}
          </div>
          <aside className="panel rounded-2xl p-4 md:p-5">
            <h2 className="text-lg font-semibold">Order summary</h2>
            <p className="mt-3 text-sm text-slate-600">Items: {cartItemsCount}</p>
            <p className="mt-1 text-xl font-bold text-slate-900">Total {formatMoney(cart?.total_cents ?? 0)}</p>
            <button
              type="button"
              onClick={handleCheckout}
              disabled={!cart || cart.items.length === 0 || !isAuthenticated}
              className="primary-btn mt-4 w-full disabled:opacity-50"
            >
              Checkout now
            </button>
          </aside>
        </section>
      )}

      {screen === 'orders' && (
        <section className="panel mt-4 rounded-2xl p-4 md:p-5">
          <div className="page-heading">
            <h2 className="text-lg font-semibold">Orders page</h2>
            <p className="text-sm text-slate-500">Track status of your past orders.</p>
          </div>
          {ordersError && <p className="mt-3 text-sm text-rose-600">{ordersError}</p>}
          {orderDetailError && <p className="mt-3 text-sm text-rose-600">{orderDetailError}</p>}
          <div className="mt-4 space-y-3">
            {orders.map((order) => (
              <article key={order.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-semibold text-slate-900">Order #{order.id}</p>
                  <span className="order-pill">{order.status}</span>
                </div>
                <p className="mt-1 text-sm text-slate-600">{formatDate(order.created_at)}</p>
                <p className="mt-2 text-sm font-semibold">Total {formatMoney(order.total_cents)}</p>
                <ul className="mt-2 list-disc pl-5 text-sm text-slate-700">
                  {order.items.map((item) => (
                    <li key={item.id}>
                      {item.product_name} x{item.quantity} ({formatMoney(item.subtotal_cents)})
                    </li>
                  ))}
                </ul>
                <button type="button" onClick={() => setSelectedOrderId(order.id)} className="ghost-btn small-btn mt-3">
                  View detail
                </button>
              </article>
            ))}
            {orders.length === 0 && <p className="text-sm text-slate-600">No orders yet.</p>}
          </div>
          {selectedOrder && (
            <article className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold text-indigo-900">Order #{selectedOrder.id} detail</h3>
                <button type="button" className="ghost-btn small-btn" onClick={() => setSelectedOrderId(null)}>
                  Close
                </button>
              </div>
              <p className="mt-2 text-sm text-indigo-900">Status: {selectedOrder.status}</p>
              <p className="mt-1 text-sm text-indigo-900">Total: {formatMoney(selectedOrder.total_cents)}</p>
              <p className="mt-1 text-sm text-indigo-900">Placed: {formatDate(selectedOrder.created_at)}</p>
              <ul className="mt-2 list-disc pl-5 text-sm text-indigo-900">
                {selectedOrder.items.map((item) => (
                  <li key={item.id}>
                    {item.product_name} x{item.quantity} ({formatMoney(item.subtotal_cents)})
                  </li>
                ))}
              </ul>
            </article>
          )}
        </section>
      )}

      {screen === 'admin' && isAdmin && (
        <section className="panel mt-4 rounded-2xl p-4 md:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Admin orders page</h2>
            <select
              className="field max-w-[180px]"
              value={adminStatusFilter}
              onChange={(event) => setAdminStatusFilter(event.target.value)}
            >
              <option value="">All status</option>
              <option value="pending">pending</option>
              <option value="shipped">shipped</option>
              <option value="delivered">delivered</option>
              <option value="cancelled">cancelled</option>
            </select>
          </div>
          {adminError && <p className="mt-3 text-sm text-rose-600">{adminError}</p>}
          <div className="mt-4 space-y-3">
            {adminOrders.map((order) => (
              <article key={order.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-semibold text-slate-900">Order #{order.id}</p>
                  <span className="order-pill">{order.status}</span>
                </div>
                <p className="mt-2 text-sm font-semibold">{formatMoney(order.total_cents)}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {ORDER_STATUSES.map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => handleAdminStatusUpdate(order.id, status)}
                      className="ghost-btn small-btn"
                    >
                      Mark {status}
                    </button>
                  ))}
                </div>
              </article>
            ))}
            {adminOrders.length === 0 && <p className="text-sm text-slate-600">No admin orders found.</p>}
          </div>
        </section>
      )}

      {screen === 'categories' && isAdmin && (
        <section className="panel mt-4 rounded-2xl p-4 md:p-5">
          <h2 className="text-lg font-semibold">Category manager page</h2>
          {categoriesError && <p className="mt-3 text-sm text-rose-600">{categoriesError}</p>}
          <div className="mt-4 grid gap-4 lg:grid-cols-[360px_1fr]">
            <form onSubmit={handleCategorySubmit} className="rounded-xl border border-slate-200 p-4">
              <h3 className="text-sm font-semibold">
                {editingCategoryId ? `Update category #${editingCategoryId}` : 'Create category'}
              </h3>
              <label className="mt-3 block text-sm font-medium" htmlFor="category-name">
                Name
              </label>
              <input
                id="category-name"
                className="field mt-1"
                value={categoryFormName}
                onChange={(event) => setCategoryFormName(event.target.value)}
              />
              <label className="mt-3 block text-sm font-medium" htmlFor="category-description">
                Description
              </label>
              <textarea
                id="category-description"
                className="field mt-1"
                rows={4}
                value={categoryFormDescription}
                onChange={(event) => setCategoryFormDescription(event.target.value)}
              />
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button className="primary-btn">{editingCategoryId ? 'Update' : 'Create'}</button>
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => {
                    setEditingCategoryId(null)
                    setCategoryFormName('')
                    setCategoryFormDescription('')
                  }}
                >
                  Reset
                </button>
              </div>
            </form>
            <div>
              <div className="space-y-2">
                {categories.map((category) => (
                  <article key={category.id} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-slate-900">{category.name}</h3>
                        {category.description && <p className="text-sm text-slate-600">{category.description}</p>}
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="ghost-btn small-btn"
                          onClick={() => {
                            setCategoriesError('')
                            loadCategoryDetail(category.id).catch((error: unknown) => {
                              setCategoriesError(error instanceof Error ? error.message : 'Failed to load category detail')
                            })
                          }}
                        >
                          Detail
                        </button>
                        <button type="button" className="ghost-btn small-btn" onClick={() => handleCategoryEdit(category)}>
                          Edit
                        </button>
                        <button
                          type="button"
                          className="ghost-btn small-btn"
                          onClick={() => handleCategoryDelete(category.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
              {categoryDetail && (
                <article className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50 p-4">
                  <h3 className="font-semibold text-indigo-900">Category detail: {categoryDetail.name}</h3>
                  <p className="mt-1 text-sm text-indigo-900">{categoryDetail.description || 'No description'}</p>
                  <p className="mt-1 text-sm text-indigo-900">Products count: {categoryDetail.products_count ?? 'n/a'}</p>
                </article>
              )}
            </div>
          </div>
        </section>
      )}

      {screen === 'chat' && <Chat token={token} currentUser={me} />}
    </main>
  )
}

export default App
