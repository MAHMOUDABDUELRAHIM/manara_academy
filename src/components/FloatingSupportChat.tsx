import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { collection, addDoc, query, where, onSnapshot, orderBy, doc, setDoc, getDoc, updateDoc, increment, getDocs } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import '@/styles/chat-animations.css';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'admin';
  timestamp: string;
  conversationId: string;
  senderName: string;
  createdAt: any;
}

interface Conversation {
  id: string;
  userEmail: string;
  userName: string;
  userType: 'teacher' | 'student';
  status: 'active' | 'closed';
  lastMessage: string;
  lastMessageTime: Date;
  createdAt: Date;
  updatedAt: Date;
  unreadCount: number;
}

const FloatingSupportChat: React.FC = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // إنشاء أو جلب محادثة المستخدم
  useEffect(() => {
    if (user && isOpen) {
      initializeConversation();
    }
  }, [user, isOpen]);

  // جلب الرسائل عند فتح المحادثة مع نظام Polling محسن
  useEffect(() => {
    if (conversationId && isOpen) {
      const messagesRef = collection(db, 'supportMessages');
      const q = query(
        messagesRef,
        where('conversationId', '==', conversationId),
        orderBy('createdAt', 'asc')
      );

      let lastFetchTime = Date.now();
      let isComponentMounted = true;

      // دالة لجلب الرسائل بشكل سلس
      const fetchMessages = async () => {
        if (!isComponentMounted) return;
        
        try {
          const snapshot = await getDocs(q);
          const messagesData: Message[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            messagesData.push({
              id: doc.id,
              content: data.content,
              sender: data.sender,
              timestamp: data.createdAt?.toDate().toLocaleString() || '',
              conversationId: data.conversationId,
              senderName: data.senderName,
              createdAt: data.createdAt
            });
          });
          
          if (isComponentMounted) {
            setMessages(messagesData);
            lastFetchTime = Date.now();
          }
        } catch (error) {
          console.error('Error fetching messages:', error);
        }
      };

      // جلب الرسائل فورًا عند فتح المحادثة
      fetchMessages();

      // استخدام onSnapshot للتحديث الفوري مع تحسينات
      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!isComponentMounted) return;
        
        const messagesData: Message[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          messagesData.push({
            id: doc.id,
            content: data.content,
            sender: data.sender,
            timestamp: data.createdAt?.toDate().toLocaleString() || '',
            conversationId: data.conversationId,
            senderName: data.senderName,
            createdAt: data.createdAt
          });
        });
        setMessages(messagesData);
        lastFetchTime = Date.now();
      }, (error) => {
        console.error('Error in onSnapshot:', error);
      });

      // نظام Polling محسن كل ثانية واحدة بالضبط - يعمل فقط عند الحاجة
      const pollingInterval = setInterval(() => {
        if (!isComponentMounted || !isOpen) return;
        
        const now = Date.now();
        // إذا مر أكثر من ثانية منذ آخر تحديث، اجلب الرسائل بشكل سلس
        if (now - lastFetchTime >= 1000) {
          fetchMessages();
        }
      }, 1000); // كل ثانية بالضبط

      // تنظيف الموارد عند إغلاق المكون
      return () => {
        isComponentMounted = false;
        unsubscribe();
        clearInterval(pollingInterval);
      };
    }
  }, [conversationId, isOpen]);

  // إضافة useEffect للتمرير التلقائي عند وصول رسائل جديدة
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // إضافة useEffect لإظهار إشعار عند وصول رسائل جديدة من الأدمن
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.sender === 'admin' && isOpen) {
        // إضافة تأثير بصري للرسالة الجديدة
        const chatContainer = document.querySelector('.chat-messages');
        if (chatContainer) {
          chatContainer.classList.add('new-message-highlight');
          setTimeout(() => {
            chatContainer.classList.remove('new-message-highlight');
          }, 2000);
        }
      }
    }
  }, [messages, isOpen]);

  const initializeConversation = async () => {
    if (!user) return;

    try {
      // البحث عن محادثة موجودة للمستخدم
      const conversationsRef = collection(db, 'supportConversations');
      const q = query(conversationsRef, where('userEmail', '==', user.email));
      
      const conversationDoc = await getDoc(doc(db, 'supportConversations', user.uid));
      
      if (conversationDoc.exists()) {
        setConversationId(conversationDoc.id);
      } else {
        // إنشاء محادثة جديدة
        const newConversation: Omit<Conversation, 'id'> = {
          userEmail: user.email || '',
          userName: user.profile?.fullName || user.displayName || 'مستخدم',
          userType: user.profile?.role === 'teacher' ? 'teacher' : 'student',
          status: 'active',
          lastMessage: '',
          lastMessageTime: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          unreadCount: 0,
        };

        await setDoc(doc(db, 'supportConversations', user.uid), newConversation);
        setConversationId(user.uid);
      }
    } catch (error) {
      console.error('Error initializing conversation:', error);
      toast.error('فشل في تهيئة المحادثة');
    }
  };

  const sendMessage = async () => {
    if (!message.trim() || !user || !conversationId) return;

    const messageContent = message.trim();
    const tempId = `temp-${Date.now()}`;
    const currentTime = new Date();
    
    // إضافة الرسالة فوراً إلى الواجهة (Optimistic UI Update)
    const optimisticMessage: Message = {
      id: tempId,
      content: messageContent,
      sender: 'user',
      timestamp: currentTime.toLocaleString(),
      conversationId: conversationId,
      senderName: user.profile?.fullName || user.displayName || 'مستخدم',
      createdAt: currentTime
    };
    
    // إضافة الرسالة فوراً إلى قائمة الرسائل
    setMessages(prevMessages => [...prevMessages, optimisticMessage]);
    setMessage('');

    setLoading(true);
    try {
      // إضافة الرسالة إلى مجموعة الرسائل في قاعدة البيانات
      const docRef = await addDoc(collection(db, 'supportMessages'), {
        content: messageContent,
        sender: 'user',
        createdAt: currentTime,
        conversationId: conversationId,
        userEmail: user.email,
        senderName: user.profile?.fullName || user.displayName || 'مستخدم',
      });

      // تحديث الرسالة المؤقتة بالـ ID الحقيقي
      setMessages(prevMessages => 
        prevMessages.map(msg => 
          msg.id === tempId ? { ...msg, id: docRef.id } : msg
        )
      );

      // تحديث آخر رسالة في المحادثة
      await updateDoc(doc(db, 'supportConversations', conversationId), {
        lastMessage: messageContent,
        lastMessageTime: currentTime,
        status: 'active',
        unreadCount: increment(1),
        updatedAt: currentTime,
      });

      toast.success('تم إرسال الرسالة بنجاح');
    } catch (error) {
      console.error('Error sending message:', error);
      // في حالة الخطأ، إزالة الرسالة المؤقتة
      setMessages(prevMessages => 
        prevMessages.filter(msg => msg.id !== tempId)
      );
      setMessage(messageContent); // إعادة النص إلى حقل الإدخال
      toast.error('فشل في إرسال الرسالة');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  return (
    <>
      {/* أيقونة الدردشة العائمة */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            onClick={() => setIsOpen(true)}
            className="h-14 w-14 rounded-full bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110"
            size="icon"
          >
            <MessageCircle className="h-6 w-6 text-primary-foreground" />
          </Button>
        </div>
      )}

      {/* نافذة الدردشة */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-80">
          <Card className="shadow-2xl border-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <MessageCircle className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">الدعم الفني</CardTitle>
              </div>
              <div className="flex items-center space-x-1 rtl:space-x-reverse">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setIsMinimized(!isMinimized)}
                >
                  <Minimize2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>

            {!isMinimized && (
              <CardContent className="p-0 flex flex-col h-80">
                {/* منطقة الرسائل */}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-3 chat-messages">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] p-3 rounded-lg text-sm ${
                            msg.sender === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          <div>{msg.content}</div>
                          {msg.sender === 'admin' && (
                            <div className="text-xs opacity-70 mt-1">
                              {msg.senderName || 'الدعم الفني'}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* منطقة إدخال الرسالة */}
                <div className="p-4 border-t">
                  <div className="flex gap-2">
                    <Input
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="اكتب رسالتك هنا..."
                      className="flex-1 text-sm"
                    />
                    <Button
                      onClick={sendMessage}
                      size="icon"
                      className="h-10 w-10"
                      disabled={loading || !message.trim()}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      )}
    </>
  );
};

export default FloatingSupportChat;