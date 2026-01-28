import { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, Plus, Send, Search, Headphones, CreditCard, 
  HelpCircle, CheckCircle, Clock, X, Users, Building2, ArrowLeft, User
} from 'lucide-react';
import Layout from '../components/layout/Layout';
import { 
  Card, CardContent, Button, Input, Badge
} from '../components/ui';
import { 
  useMyConversations, useConversation, useCreateConversation, 
  useAddMessage, useUpdateConversationStatus, useUsers, useMyOrgUsers
} from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { cn, formatDate } from '../lib/utils';
import toast from 'react-hot-toast';

const CONVERSATION_TYPES = [
  { value: 'SUPPORT', label: 'Soporte Técnico', icon: Headphones, color: 'text-blue-500', description: 'Ayuda con el uso del sistema' },
  { value: 'BILLING', label: 'Facturación', icon: CreditCard, color: 'text-green-500', description: 'Consultas sobre pagos y suscripción' },
  { value: 'GENERAL', label: 'Consulta General', icon: HelpCircle, color: 'text-purple-500', description: 'Otras consultas' }
];

const STATUS_STYLES = {
  OPEN: { label: 'Abierta', color: 'bg-green-100 text-green-700', icon: MessageSquare },
  PENDING: { label: 'Pendiente', color: 'bg-amber-100 text-amber-700', icon: Clock },
  RESOLVED: { label: 'Resuelta', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
  CLOSED: { label: 'Cerrada', color: 'bg-slate-100 text-slate-700', icon: X }
};

function MessagesPage() {
  const { user } = useAuth();
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [newConversationModal, setNewConversationModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [newConvForm, setNewConvForm] = useState({
    type: 'SUPPORT',
    subject: '',
    message: '',
    targetUserId: ''
  });
  const [userSearch, setUserSearch] = useState('');
  const messagesEndRef = useRef(null);

  const isRoot = user?.role === 'root';
  const isAdmin = user?.role === 'admin' || user?.role === 'manager';
  const canSelectRecipient = isRoot || isAdmin;
  
  const { data: conversationsData, isLoading } = useMyConversations();
  const { data: usersData } = useUsers({ limit: 100 }); // Para root
  const { data: orgUsersData } = useMyOrgUsers(); // Para admins/managers
  const { data: conversationData, isLoading: loadingMessages } = useConversation(selectedConversation);
  const createConversation = useCreateConversation();
  const addMessage = useAddMessage();
  const updateStatus = useUpdateConversationStatus();

  const conversations = conversationsData?.data?.conversations || [];
  const currentConversation = conversationData?.data?.conversation;
  const messages = conversationData?.data?.messages || [];

  // Filtrar conversaciones
  const filteredConversations = searchQuery
    ? conversations.filter(c => 
        c.subject.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : conversations;

  // Scroll al último mensaje
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleCreateConversation = async (e) => {
    e.preventDefault();
    if (!newConvForm.subject || !newConvForm.message) {
      toast.error('Completá el asunto y mensaje');
      return;
    }

    // Si puede seleccionar destinatario (root o admin), debe hacerlo
    if (canSelectRecipient && !newConvForm.targetUserId) {
      toast.error('Seleccioná un destinatario');
      return;
    }

    try {
      const result = await createConversation.mutateAsync({
        type: newConvForm.type,
        subject: newConvForm.subject,
        message: newConvForm.message,
        targetUserId: newConvForm.targetUserId || undefined
      });
      
      toast.success('Conversación creada');
      setNewConversationModal(false);
      setNewConvForm({ type: 'SUPPORT', subject: '', message: '', targetUserId: '' });
      setUserSearch('');
      setSelectedConversation(result.data.conversation.id);
    } catch (error) {
      toast.error('Error al crear conversación');
    }
  };

  // Filtrar usuarios para búsqueda
  // Root ve todos los usuarios, admin/manager solo los de su org
  const allUsers = isRoot 
    ? (usersData?.data?.users || [])
    : (orgUsersData?.data?.users || []);
  
  const filteredUsers = userSearch.length >= 2
    ? allUsers.filter(u => 
        u.id !== user?.id && // Excluir al usuario actual
        (u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.firstName?.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.lastName?.toLowerCase().includes(userSearch.toLowerCase()))
      ).slice(0, 10)
    : [];

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      await addMessage.mutateAsync({
        conversationId: selectedConversation,
        content: newMessage
      });
      setNewMessage('');
    } catch (error) {
      toast.error('Error al enviar mensaje');
    }
  };

  const handleStatusChange = async (status) => {
    try {
      await updateStatus.mutateAsync({
        conversationId: selectedConversation,
        status
      });
      toast.success('Estado actualizado');
    } catch (error) {
      toast.error('Error al actualizar estado');
    }
  };

  return (
    <Layout 
      title="Mensajes" 
      subtitle="Comunicate con soporte o tu despachante"
    >
      <div 
        className="flex gap-4 h-[calc(100vh-200px)]"
        style={{ minHeight: '500px' }}
      >
        {/* Lista de conversaciones */}
        <Card className={cn(
          'flex flex-col w-full md:w-80 lg:w-96 flex-shrink-0',
          selectedConversation && 'hidden md:flex'
        )}>
          <div className="p-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
            <Button 
              className="w-full mb-3" 
              onClick={() => setNewConversationModal(true)}
            >
              <Plus className="w-4 h-4" />
              Nueva Conversación
            </Button>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-textSecondary)' }} />
              <input
                type="text"
                placeholder="Buscar conversaciones..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg border text-sm"
                style={{
                  backgroundColor: 'var(--color-card)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text)'
                }}
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-16 rounded-lg animate-pulse" style={{ backgroundColor: 'var(--color-border)' }} />
                ))}
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm" style={{ color: 'var(--color-textSecondary)' }}>
                  {searchQuery ? 'No se encontraron conversaciones' : 'No tenés conversaciones aún'}
                </p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const typeInfo = CONVERSATION_TYPES.find(t => t.value === conv.type) || CONVERSATION_TYPES[2];
                const statusInfo = STATUS_STYLES[conv.status] || STATUS_STYLES.OPEN;
                const TypeIcon = typeInfo.icon;
                
                return (
                  <div
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv.id)}
                    className={cn(
                      'p-3 border-b cursor-pointer transition-colors hover:bg-[var(--color-background)]',
                      selectedConversation === conv.id && 'bg-[var(--color-primary)]/10'
                    )}
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn('w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0', 
                        conv.type === 'SUPPORT' ? 'bg-blue-100' : conv.type === 'BILLING' ? 'bg-green-100' : 'bg-purple-100'
                      )}>
                        <TypeIcon className={cn('w-5 h-5', typeInfo.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={cn('text-sm truncate', conv.hasUnread && 'font-semibold')} style={{ color: 'var(--color-text)' }}>
                            {conv.subject}
                          </p>
                          {conv.hasUnread && (
                            <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs truncate mt-0.5" style={{ color: 'var(--color-textSecondary)' }}>
                          {conv.lastMessage?.content || 'Sin mensajes'}
                        </p>
                        <div className="flex items-center justify-between mt-1">
                          <span className={cn('text-xs px-1.5 py-0.5 rounded', statusInfo.color)}>
                            {statusInfo.label}
                          </span>
                          <span className="text-xs" style={{ color: 'var(--color-textSecondary)' }}>
                            {conv.lastMessageAt ? formatDate(conv.lastMessageAt) : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* Chat */}
        <Card className={cn(
          'flex-1 flex flex-col',
          !selectedConversation && 'hidden md:flex'
        )}>
          {selectedConversation && currentConversation ? (
            <>
              {/* Header del chat */}
              <div 
                className="flex items-center justify-between p-4 border-b"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <div className="flex items-center gap-3">
                  <button 
                    className="md:hidden p-2 -ml-2 rounded-lg"
                    onClick={() => setSelectedConversation(null)}
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h3 className="font-medium" style={{ color: 'var(--color-text)' }}>
                      {currentConversation.subject}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={cn('text-xs px-1.5 py-0.5 rounded', STATUS_STYLES[currentConversation.status]?.color)}>
                        {STATUS_STYLES[currentConversation.status]?.label}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--color-textSecondary)' }}>
                        {CONVERSATION_TYPES.find(t => t.value === currentConversation.type)?.label}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Acciones */}
                {currentConversation.status !== 'CLOSED' && (
                  <div className="flex gap-2">
                    {currentConversation.status !== 'RESOLVED' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStatusChange('RESOLVED')}
                      >
                        <CheckCircle className="w-4 h-4" />
                        Resolver
                      </Button>
                    )}
                    {currentConversation.status === 'RESOLVED' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStatusChange('CLOSED')}
                      >
                        <X className="w-4 h-4" />
                        Cerrar
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Mensajes */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-sm" style={{ color: 'var(--color-textSecondary)' }}>
                      No hay mensajes aún
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        'flex',
                        msg.isOwn ? 'justify-end' : 'justify-start'
                      )}
                    >
                      {msg.isSystemMessage ? (
                        <div className="w-full text-center">
                          <span 
                            className="text-xs px-3 py-1 rounded-full inline-block"
                            style={{ backgroundColor: 'var(--color-background)', color: 'var(--color-textSecondary)' }}
                          >
                            {msg.content}
                          </span>
                        </div>
                      ) : (
                        <div className={cn('max-w-[75%]', msg.isOwn ? 'items-end' : 'items-start')}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>
                              {msg.isOwn ? 'Vos' : msg.authorName}
                            </span>
                            <span className="text-xs" style={{ color: 'var(--color-textSecondary)' }}>
                              {formatDate(msg.createdAt)}
                            </span>
                          </div>
                          <div
                            className={cn(
                              'rounded-2xl px-4 py-2',
                              msg.isOwn 
                                ? 'bg-[var(--color-primary)] text-white rounded-br-sm'
                                : 'rounded-bl-sm'
                            )}
                            style={!msg.isOwn ? { 
                              backgroundColor: 'var(--color-background)', 
                              color: 'var(--color-text)' 
                            } : {}}
                          >
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input de mensaje */}
              {currentConversation.status !== 'CLOSED' && (
                <form 
                  onSubmit={handleSendMessage}
                  className="p-4 border-t"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Escribí tu mensaje..."
                      className="flex-1 px-4 py-2 rounded-lg border"
                      style={{
                        backgroundColor: 'var(--color-card)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text)'
                      }}
                    />
                    <Button type="submit" disabled={!newMessage.trim() || addMessage.isPending}>
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </form>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <h3 className="font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                  Seleccioná una conversación
                </h3>
                <p className="text-sm" style={{ color: 'var(--color-textSecondary)' }}>
                  O creá una nueva para comenzar
                </p>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Modal nueva conversación */}
      {newConversationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div 
            className="w-full max-w-lg rounded-xl shadow-xl max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: 'var(--color-card)' }}
          >
            <div className="flex items-center justify-between p-4 border-b sticky top-0 z-10" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
                Nueva Conversación
              </h2>
              <button onClick={() => { setNewConversationModal(false); setUserSearch(''); }} className="p-1 rounded hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateConversation} className="p-4 space-y-4">
              {/* Selector de destinatario para ROOT y ADMIN/MANAGER */}
              {canSelectRecipient && (
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>
                    <User className="w-4 h-4 inline mr-1" />
                    {isRoot ? 'Destinatario' : 'Enviar a (usuario de tu organización)'}
                  </label>
                  
                  {/* Usuario seleccionado */}
                  {newConvForm.targetUserId ? (
                    <div 
                      className="flex items-center justify-between p-3 rounded-lg border"
                      style={{ borderColor: 'var(--color-primary)', backgroundColor: 'var(--color-primary)' + '10' }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                          <User className="w-5 h-5 text-primary-600" />
                        </div>
                        <div>
                          {(() => {
                            const selectedUser = allUsers.find(u => u.id === newConvForm.targetUserId);
                            return (
                              <>
                                <p className="font-medium text-sm" style={{ color: 'var(--color-text)' }}>
                                  {selectedUser?.firstName} {selectedUser?.lastName}
                                </p>
                                <p className="text-xs" style={{ color: 'var(--color-textSecondary)' }}>
                                  {selectedUser?.email}
                                </p>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setNewConvForm({ ...newConvForm, targetUserId: '' })}
                        className="p-1 rounded hover:bg-red-100 text-red-500"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-textSecondary)' }} />
                      <input
                        type="text"
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        placeholder="Buscar usuario por email o nombre..."
                        className="w-full pl-9 pr-3 py-2 rounded-lg border text-sm"
                        style={{
                          backgroundColor: 'var(--color-card)',
                          borderColor: 'var(--color-border)',
                          color: 'var(--color-text)'
                        }}
                      />
                      
                      {/* Lista de usuarios */}
                      {filteredUsers.length > 0 && (
                        <div 
                          className="absolute top-full left-0 right-0 mt-1 rounded-lg border shadow-lg max-h-48 overflow-y-auto z-20"
                          style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
                        >
                          {filteredUsers.map((u) => (
                            <button
                              key={u.id}
                              type="button"
                              onClick={() => {
                                setNewConvForm({ ...newConvForm, targetUserId: u.id });
                                setUserSearch('');
                              }}
                              className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 text-left transition-colors"
                            >
                              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                                <User className="w-4 h-4 text-slate-500" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>
                                  {u.firstName} {u.lastName}
                                </p>
                                <p className="text-xs truncate" style={{ color: 'var(--color-textSecondary)' }}>
                                  {u.email} • {u.role}
                                </p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                      
                      {userSearch.length >= 2 && filteredUsers.length === 0 && (
                        <div 
                          className="absolute top-full left-0 right-0 mt-1 p-4 rounded-lg border text-center"
                          style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
                        >
                          <p className="text-sm" style={{ color: 'var(--color-textSecondary)' }}>
                            No se encontraron usuarios
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Tipo - solo para no-root */}
              {!isRoot && (
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>
                    ¿Con qué te podemos ayudar?
                  </label>
                  <div className="space-y-2">
                    {CONVERSATION_TYPES.map((type) => {
                      const Icon = type.icon;
                      return (
                        <label
                          key={type.value}
                          className={cn(
                            'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                            newConvForm.type === type.value 
                              ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5' 
                              : 'border-[var(--color-border)] hover:bg-[var(--color-background)]'
                          )}
                        >
                          <input
                            type="radio"
                            name="type"
                            value={type.value}
                            checked={newConvForm.type === type.value}
                            onChange={() => setNewConvForm({ ...newConvForm, type: type.value })}
                            className="sr-only"
                          />
                          <div className={cn('w-10 h-10 rounded-full flex items-center justify-center',
                            type.value === 'SUPPORT' ? 'bg-blue-100' : type.value === 'BILLING' ? 'bg-green-100' : 'bg-purple-100'
                          )}>
                            <Icon className={cn('w-5 h-5', type.color)} />
                          </div>
                          <div>
                            <p className="font-medium text-sm" style={{ color: 'var(--color-text)' }}>{type.label}</p>
                            <p className="text-xs" style={{ color: 'var(--color-textSecondary)' }}>{type.description}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Asunto */}
              <Input
                label="Asunto"
                value={newConvForm.subject}
                onChange={(e) => setNewConvForm({ ...newConvForm, subject: e.target.value })}
                placeholder={isRoot ? "Ej: Información importante sobre tu cuenta" : "Ej: Problema con la facturación"}
                required
              />

              {/* Mensaje */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text)' }}>
                  Mensaje
                </label>
                <textarea
                  value={newConvForm.message}
                  onChange={(e) => setNewConvForm({ ...newConvForm, message: e.target.value })}
                  placeholder={isRoot ? "Escribí tu mensaje..." : "Describí tu consulta..."}
                  rows={4}
                  required
                  className="w-full px-3 py-2 rounded-lg border"
                  style={{
                    backgroundColor: 'var(--color-card)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="secondary" onClick={() => { setNewConversationModal(false); setUserSearch(''); }}>
                  Cancelar
                </Button>
                <Button type="submit" loading={createConversation.isPending}>
                  <Send className="w-4 h-4" />
                  Enviar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}

export default MessagesPage;
