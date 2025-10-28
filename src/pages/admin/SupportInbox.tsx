import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  MessageCircle, 
  Send, 
  Search, 
  Filter, 
  Users, 
  Clock, 
  CheckCircle2,
  User,
  GraduationCap,
  BookOpen,
  X
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import AdminHeader from '@/components/AdminHeader';
import AdminSidebar from '@/components/AdminSidebar';

import { db } from '@/firebase/config';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp,
  where,
  getDocs
} from 'firebase/firestore';
import { toast } from 'sonner';

interface Message {
  id: string;
  content: string;
  timestamp: string;
  sender: 'user' | 'admin';
  senderName?: string;
  createdAt?: any;
}

interface Conversation {
  id: string;
  userEmail: string;
  userType: 'student' | 'teacher';
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  status: 'online' | 'offline';
  createdAt: any;
  updatedAt: any;
}

interface Chat {
  id: string;
  userName: string;
  userType: 'student' | 'teacher';
  userAvatar: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  status: 'online' | 'offline';
  messages: Message[];
}

const SupportInbox: React.FC = () => {
  const { language } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [userTypeFilter, setUserTypeFilter] = useState('all');
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFullChat, setShowFullChat] = useState(false);
  const [fullChatMessages, setFullChatMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch conversations from Firestore
  useEffect(() => {
    const conversationsRef = collection(db, 'supportConversations');
    const q = query(conversationsRef, orderBy('updatedAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const conversationsData: Conversation[] = [];
      snapshot.forEach((doc) => {
        conversationsData.push({ id: doc.id, ...doc.data() } as Conversation);
      });
      setConversations(conversationsData);
      
      // Convert conversations to chats format
      const chatsData: Chat[] = conversationsData.map(conv => ({
        id: conv.id,
        userName: conv.userName || conv.userEmail,
        userType: conv.userType,
        userAvatar: '',
        lastMessage: conv.lastMessage,
        lastMessageTime: conv.lastMessageTime?.toDate?.() ? conv.lastMessageTime.toDate().toLocaleString() : conv.lastMessageTime,
        unreadCount: conv.unreadCount || 0,
        status: conv.status,
        messages: []
      }));
      setChats(chatsData);
    });

    return () => unsubscribe();
  }, []);

  // Fetch messages for selected conversation
  useEffect(() => {
    if (!selectedChat) {
      setMessages([]);
      return;
    }

    const messagesRef = collection(db, 'supportMessages');
    const q = query(
      messagesRef, 
      where('conversationId', '==', selectedChat.id),
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
            timestamp: data.createdAt?.toDate().toLocaleString() || '',
            sender: data.sender,
            senderName: data.senderName,
            createdAt: data.createdAt
          });
        });
        
        if (isComponentMounted) {
          setMessages(messagesData);
          
          // Update selected chat with messages
          setSelectedChat(prev => prev ? { ...prev, messages: messagesData } : null);
          lastFetchTime = Date.now();
        }
      } catch (error) {
        console.error('خطأ في جلب الرسائل:', error);
      }
    };

    // جلب الرسائل فورًا عند اختيار المحادثة
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
          timestamp: data.createdAt?.toDate().toLocaleString() || '',
          sender: data.sender,
          senderName: data.senderName,
          createdAt: data.createdAt
        });
      });
      setMessages(messagesData);
      
      // Update selected chat with messages
      setSelectedChat(prev => prev ? { ...prev, messages: messagesData } : null);
      lastFetchTime = Date.now();
    }, (error) => {
      console.error('Error in onSnapshot:', error);
    });

    // نظام Polling محسن كل ثانية واحدة بالضبط - يعمل فقط عند الحاجة
    const pollingInterval = setInterval(() => {
      if (!isComponentMounted || !selectedChat) return;
      
      const now = Date.now();
      // إذا مر أكثر من ثانية منذ آخر تحديث، اجلب الرسائل بشكل سلس
      if (now - lastFetchTime >= 1000) {
        fetchMessages();
      }
    }, 1000); // كل ثانية بالضبط

    // تنظيف الموارد عند تغيير المحادثة أو إغلاق المكون
    return () => {
      isComponentMounted = false;
      unsubscribe();
      clearInterval(pollingInterval);
    };
  }, [selectedChat]);

  // Function to fetch and display full chat
  const handleShowFullChat = async (conversationId: string) => {
    try {
      const messagesRef = collection(db, 'supportMessages');
      const q = query(
        messagesRef,
        where('conversationId', '==', conversationId),
        orderBy('createdAt', 'asc')
      );
      
      const snapshot = await getDocs(q);
      const fullMessages: Message[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        fullMessages.push({
          id: doc.id,
          content: data.content,
          sender: data.sender,
          timestamp: data.createdAt?.toDate().toLocaleString() || '',
          senderName: data.senderName || '',
          createdAt: data.createdAt
        });
      });
      
      setFullChatMessages(fullMessages);
      setShowFullChat(true);
    } catch (error) {
      console.error('Error fetching full chat:', error);
      toast.error(language === 'ar' ? 'فشل في جلب المحادثة' : 'Failed to fetch conversation');
    }
  };

  // Filter chats based on search and filters
  const filteredChats = chats.filter(chat => {
    const matchesSearch = chat.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         chat.lastMessage.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = userTypeFilter === 'all' || chat.userType === userTypeFilter;
    
    return matchesSearch && matchesType;
  });

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChat || loading) return;
    
    setLoading(true);
    try {
      // Add message to Firestore
      await addDoc(collection(db, 'supportMessages'), {
        conversationId: selectedChat.id,
        content: newMessage.trim(),
        sender: 'admin',
        senderName: 'Technical Support',
        createdAt: serverTimestamp()
      });

      // Update conversation with last message
      await updateDoc(doc(db, 'supportConversations', selectedChat.id), {
        lastMessage: newMessage.trim(),
        lastMessageTime: serverTimestamp(),
        updatedAt: serverTimestamp(),
        unreadCount: 0 // Reset unread count when admin replies
      });

      setNewMessage('');
      toast.success(language === 'ar' ? 'تم إرسال الرسالة بنجاح' : 'Message sent successfully');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error(language === 'ar' ? 'فشل في إرسال الرسالة' : 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getUserTypeIcon = (userType: string) => {
    return userType === 'student' ? (
      <GraduationCap className="w-4 h-4 text-blue-600" />
    ) : (
      <BookOpen className="w-4 h-4 text-green-600" />
    );
  };

  const getUserTypeBadge = (userType: string) => {
    return userType === 'student' ? (
      <Badge variant="outline" className="text-blue-600 border-blue-200">
        {language === 'ar' ? 'طالب' : 'Student'}
      </Badge>
    ) : (
      <Badge variant="outline" className="text-green-600 border-green-200">
        {language === 'ar' ? 'مدرس' : 'Teacher'}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader />
      
      <div className="flex">
        <AdminSidebar />
        
        {/* Main Content */}
        <main className="flex-1 p-6 lg:ml-0">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <MessageCircle className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold text-foreground">
                {language === 'ar' ? 'دردشة الدعم الفني' : 'Technical Support Chat'}
              </h1>
            </div>
            <p className="text-muted-foreground">
              {language === 'ar' ? 'محادثات مع الطلاب والمدرسين' : 'Conversations with students and teachers'}
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {language === 'ar' ? 'إجمالي المحادثات' : 'Total Conversations'}
                    </p>
                    <p className="text-2xl font-bold">0</p>
                  </div>
                  <MessageCircle className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {language === 'ar' ? 'رسائل غير مقروءة' : 'Unread Messages'}
                    </p>
                    <p className="text-2xl font-bold">0</p>
                  </div>
                  <Clock className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {language === 'ar' ? 'متصل الآن' : 'Online Now'}
                    </p>
                    <p className="text-2xl font-bold">0</p>
                  </div>
                  <Users className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {language === 'ar' ? 'تم الرد عليها' : 'Responded'}
                    </p>
                    <p className="text-2xl font-bold">0</p>
                  </div>
                  <CheckCircle2 className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Chat Interface */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
            {/* Chat List */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  {language === 'ar' ? 'المحادثات' : 'Conversations'}
                </CardTitle>
                
                {/* Filters */}
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={language === 'ar' ? 'البحث في المحادثات...' : 'Search conversations...'}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  <Select value={userTypeFilter} onValueChange={setUserTypeFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder={language === 'ar' ? 'نوع المستخدم' : 'User Type'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{language === 'ar' ? 'الكل' : 'All'}</SelectItem>
                      <SelectItem value="student">{language === 'ar' ? 'طلاب' : 'Students'}</SelectItem>
                      <SelectItem value="teacher">{language === 'ar' ? 'مدرسين' : 'Teachers'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              
              <CardContent className="p-0">
                <ScrollArea className="h-[400px]">
                  <div className="p-4 space-y-2">
                    {filteredChats.length === 0 ? (
                      <div className="text-center py-8">
                        <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-sm text-muted-foreground">
                          {language === 'ar' ? 'لا توجد محادثات' : 'No conversations'}
                        </p>
                      </div>
                    ) : (
                      filteredChats.map((chat) => (
                        <div
                          key={chat.id}
                          onClick={() => setSelectedChat(chat)}
                          className={`p-3 rounded-lg cursor-pointer transition-colors hover:bg-accent ${
                            selectedChat?.id === chat.id ? 'bg-accent' : ''
                          }`}
                        >
                          <div className="flex items-start space-x-3 space-x-reverse">
                            <div className="relative">
                              <Avatar className="w-10 h-10">
                                <AvatarImage src={chat.userAvatar} />
                                <AvatarFallback>{chat.userName[0]}</AvatarFallback>
                              </Avatar>
                              {chat.status === 'online' && (
                                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                              )}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-medium text-sm truncate">{chat.userName}</h4>
                                  {getUserTypeIcon(chat.userType)}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground">{chat.lastMessageTime}</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleShowFullChat(chat.id);
                                    }}
                                    className="h-6 w-6 p-0 hover:bg-primary/10"
                                    title={language === 'ar' ? 'عرض الشات كاملاً' : 'Show full chat'}
                                  >
                                    <MessageCircle className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                              
                              <div className="flex items-center justify-between">
                                <p className="text-sm text-muted-foreground truncate">{chat.lastMessage}</p>
                                {chat.unreadCount > 0 && (
                                  <Badge variant="destructive" className="text-xs px-2 py-1">
                                    {chat.unreadCount}
                                  </Badge>
                                )}
                              </div>
                              
                              <div className="mt-1">
                                {getUserTypeBadge(chat.userType)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Chat Messages */}
            <Card className="lg:col-span-2">
              {selectedChat ? (
                <>
                  <CardHeader className="border-b">
                    <div className="flex items-center space-x-3 space-x-reverse">
                      <div className="relative">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={selectedChat.userAvatar} />
                          <AvatarFallback>{selectedChat.userName[0]}</AvatarFallback>
                        </Avatar>
                        {selectedChat.status === 'online' && (
                          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold">{selectedChat.userName}</h3>
                        <div className="flex items-center gap-2">
                          {getUserTypeBadge(selectedChat.userType)}
                          <span className="text-sm text-muted-foreground">
                            {selectedChat.status === 'online' ? 
                              (language === 'ar' ? 'متصل الآن' : 'Online now') : 
                              (language === 'ar' ? 'غير متصل' : 'Offline')
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="p-0">
                    <ScrollArea className="h-[400px] p-4">
                      <div className="space-y-4">
                        {messages.map((message) => (
                          <div
                            key={message.id}
                            className={`flex ${message.sender === 'admin' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[70%] p-3 rounded-lg ${
                                message.sender === 'admin'
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted'
                              }`}
                            >
                              <div className="text-sm">{message.content}</div>
                              <div className="text-xs opacity-70 mt-1">
                                {message.timestamp}
                              </div>
                            </div>
                          </div>
                        ))}
                        <div ref={messagesEndRef} />
                      </div>
                    </ScrollArea>
                    
                    {/* Message Input */}
                    <div className="border-t p-4">
                      <div className="flex space-x-2 space-x-reverse">
                        <Input
                          placeholder={language === 'ar' ? 'اكتب رسالتك...' : 'Type your message...'}
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                          className="flex-1"
                        />
                        <Button 
                          onClick={handleSendMessage} 
                          disabled={!newMessage.trim() || loading}
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </>
              ) : (
                <CardContent className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-500 mb-2">
                      {language === 'ar' ? 'اختر محادثة' : 'Select a conversation'}
                    </h3>
                    <p className="text-sm text-gray-400">
                      {language === 'ar' ? 'اختر محادثة من القائمة لبدء المراسلة' : 'Select a conversation from the list to start messaging'}
                    </p>
                  </div>
                </CardContent>
              )}
            </Card>
          </div>

          {/* Full Chat Display Modal/Overlay */}
          {showFullChat && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <Card className="w-full max-w-4xl h-[80vh] flex flex-col">
                <CardHeader className="border-b">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <MessageCircle className="w-5 h-5" />
                      {language === 'ar' ? 'المحادثة الكاملة' : 'Full Conversation'}
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowFullChat(false)}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                
                <CardContent className="flex-1 p-0">
                  <ScrollArea className="h-full p-4">
                    <div className="space-y-4">
                      {fullChatMessages.length === 0 ? (
                        <div className="text-center py-8">
                          <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                          <p className="text-sm text-muted-foreground">
                            {language === 'ar' ? 'لا توجد رسائل في هذه المحادثة' : 'No messages in this conversation'}
                          </p>
                        </div>
                      ) : (
                        fullChatMessages.map((message) => (
                          <div
                            key={message.id}
                            className={`flex ${message.sender === 'admin' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[70%] p-3 rounded-lg ${
                                message.sender === 'admin'
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted'
                              }`}
                            >
                              <div className="text-sm">{message.content}</div>
                              <div className="text-xs opacity-70 mt-1 flex items-center justify-between">
                                <span>{message.timestamp}</span>
                                {message.sender === 'admin' && message.senderName && (
                                  <span className="ml-2">{message.senderName}</span>
                                )}
                                {message.sender === 'user' && (
                                  <span className="ml-2">{language === 'ar' ? 'المستخدم' : 'User'}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-4 text-center text-sm text-muted-foreground h-16 flex items-center justify-center">
        © Manara Academy 2025 - {language === 'ar' ? 'جميع الحقوق محفوظة' : 'All Rights Reserved'}
      </footer>
    </div>
  );
};

export default SupportInbox;