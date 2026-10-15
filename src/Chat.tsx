import { useEffect, useRef, useState } from 'react'
import { createConsumer } from '@rails/actioncable'
import { api } from './api'
import type { ChatMessage, Conversation, User } from './types'

interface ChatProps {
  token: string
  currentUser: User | null
}

export function Chat({ token, currentUser }: ChatProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const subscriptionRef = useRef<any>(null)
  const consumerRef = useRef<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const isAdmin = currentUser?.role === 'admin'

  // Cuộn xuống tin nhắn mới nhất
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // 1. Tải danh sách cuộc trò chuyện
  useEffect(() => {
    async function fetchConversations() {
      try {
        setLoading(true)
        const data = await api.getConversations(token)
        setConversations(data)
        if (!isAdmin && data.length > 0) {
          // Khách hàng thì chọn ngay cuộc trò chuyện đầu tiên đang mở
          setActiveConversation(data[0])
        }
      } catch (err: any) {
        setError(err.message || 'Không thể tải danh sách cuộc trò chuyện')
      } finally {
        setLoading(false)
      }
    }
    fetchConversations()
  }, [token, isAdmin])

  // 2. Tải lịch sử tin nhắn & Kết nối WebSocket khi chọn 1 cuộc trò chuyện
  useEffect(() => {
    if (!activeConversation) return

    let isMounted = true

    // A. Gọi REST API lấy lịch sử tin nhắn cũ
    api.getConversationMessages(token, activeConversation.id)
      .then((history) => {
        if (isMounted) setMessages(history)
      })
      .catch((err) => {
        if (isMounted) setError(err.message || 'Lỗi tải lịch sử chat')
      })

    // B. Khởi tạo kết nối ActionCable qua WebSocket
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const cableUrl = `${protocol}//${window.location.host}/cable?token=${token}`
    const consumer = createConsumer(cableUrl)
    consumerRef.current = consumer

    const sub = consumer.subscriptions.create(
      { channel: 'ChatChannel', conversation_id: activeConversation.id },
      {
        connected() {
          console.log(`[ActionCable] Connected to ChatChannel (${activeConversation.id})`)
        },
        disconnected() {
          console.log(`[ActionCable] Disconnected`)
        },
        received(newMsg: ChatMessage) {
          // Khi nhận tin nhắn mới được broadcast từ server
          if (isMounted) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev
              return [...prev, newMsg]
            })
          }
        },
      }
    )
    subscriptionRef.current = sub

    // Dọn dẹp kết nối khi đổi phòng chat hoặc đóng component
    return () => {
      isMounted = false
      sub.unsubscribe()
      consumer.disconnect()
    }
  }, [activeConversation, token])

  // Khách hàng bấm bắt đầu chat
  const handleStartChat = async () => {
    try {
      setLoading(true)
      const conv = await api.createConversation(token)
      setConversations((prev) => [conv, ...prev.filter((c) => c.id !== conv.id)])
      setActiveConversation(conv)
    } catch (err: any) {
      setError(err.message || 'Không thể tạo cuộc trò chuyện')
    } finally {
      setLoading(false)
    }
  }

  // Gửi tin nhắn qua WebSocket
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim() || !subscriptionRef.current || !activeConversation) return

    // Gọi action `speak` đã viết trong ChatChannel của Rails
    subscriptionRef.current.perform('speak', {
      conversation_id: activeConversation.id,
      body: inputText.trim(),
    })

    setInputText('')
  }

  return (
    <div className="panel mt-4 rounded-2xl p-4 md:p-6 bg-white shadow-sm border border-slate-200">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b pb-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            {isAdmin ? 'Hộp thư hỗ trợ khách hàng' : 'Trò chuyện với nhân viên hỗ trợ'}
          </h2>
          <p className="text-xs text-slate-500">
            Kết nối trực tiếp qua WebSocket (ActionCable) thời gian thực
          </p>
        </div>
        {isAdmin && (
          <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
            Quyền Quản trị viên
          </span>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-600 border border-rose-200">
          {error}
        </div>
      )}

      {/* GIAO DIỆN KHÁCH HÀNG CHƯA CÓ CUỘC TRÒ CHUYỆN */}
      {!isAdmin && conversations.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-sm text-slate-600">Bạn chưa có cuộc trò chuyện nào với hỗ trợ viên.</p>
          <button
            onClick={handleStartChat}
            disabled={loading}
            className="primary-btn mt-4 inline-flex items-center gap-2"
          >
            {loading ? 'Đang kết nối...' : 'Bắt đầu chat hỗ trợ'}
          </button>
        </div>
      )}

      {/* KHUNG CHAT CHÍNH */}
      {(isAdmin || conversations.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4 h-[550px]">
          {/* CỘT TRÁI: DANH SÁCH CUỘC TRÒ CHUYỆN (ADMIN) */}
          {isAdmin && (
            <div className="border rounded-xl p-3 overflow-y-auto flex flex-col gap-2 bg-slate-50">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Danh sách hội thoại ({conversations.length})
              </p>
              {conversations.length === 0 && (
                <p className="text-xs text-slate-400 py-4 text-center">Chưa có ai nhắn tin</p>
              )}
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setActiveConversation(conv)}
                  className={`text-left p-3 rounded-lg border text-sm transition-all ${
                    activeConversation?.id === conv.id
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-800'
                  }`}
                >
                  <p className="font-semibold truncate">{conv.user_email || `User #${conv.user_id}`}</p>
                  <p className={`text-xs mt-1 ${activeConversation?.id === conv.id ? 'text-indigo-200' : 'text-slate-400'}`}>
                    Trạng thái: {conv.status}
                  </p>
                </button>
              ))}
            </div>
          )}

          {/* CỘT PHẢI: KHUNG XEM VÀ GỬI TIN NHẮN */}
          <div className={`flex flex-col border rounded-xl bg-white overflow-hidden ${!isAdmin ? 'md:col-span-2' : ''}`}>
            {activeConversation ? (
              <>
                {/* Header phòng chat */}
                <div className="p-3 bg-slate-100 border-b flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-800">
                    {isAdmin
                      ? `Đang chat với: ${activeConversation.user_email || `User #${activeConversation.user_id}`}`
                      : 'Nhân viên hỗ trợ MiniShop'}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Đang kết nối Live
                  </span>
                </div>

                {/* Danh sách tin nhắn */}
                <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/50">
                  {messages.length === 0 && (
                    <p className="text-center text-xs text-slate-400 py-8">
                      Chưa có tin nhắn nào. Hãy gửi lời chào đầu tiên!
                    </p>
                  )}
                  {messages.map((msg) => {
                    const isMe = msg.sender_id === currentUser?.id
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        <div className="flex items-center gap-1 text-[11px] text-slate-400 mb-0.5 px-1">
                          <span>{msg.sender_role === 'admin' ? '🛡️ Admin' : '👤 Khách'}</span>
                          <span>•</span>
                          <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                            isMe
                              ? 'bg-indigo-600 text-white rounded-br-none'
                              : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
                          }`}
                        >
                          {msg.body}
                        </div>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Ô nhập tin nhắn */}
                <form onSubmit={handleSendMessage} className="p-3 bg-white border-t flex gap-2">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Nhập tin nhắn..."
                    className="field flex-1 text-sm py-2"
                  />
                  <button
                    type="submit"
                    disabled={!inputText.trim()}
                    className="primary-btn px-5 disabled:opacity-50"
                  >
                    Gửi
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-sm text-slate-400">
                Vui lòng chọn một cuộc trò chuyện để bắt đầu chat
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
