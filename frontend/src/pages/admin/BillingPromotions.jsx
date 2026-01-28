import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Percent, DollarSign, Calendar, Users, 
  Edit2, Trash2, Copy, Check, ChevronLeft, Tag, X
} from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui';
import { useAdminPromotions, useCreatePromotion, useBillingPlans } from '../../hooks/useApi';
import api from '../../api/axios';

const BillingPromotions = () => {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [editingPromo, setEditingPromo] = useState(null);
  const [copiedCode, setCopiedCode] = useState(null);

  const { data: promosData, isLoading, refetch } = useAdminPromotions();
  const { data: plansData } = useBillingPlans();
  const createMutation = useCreatePromotion();

  const promotions = promosData?.data?.promotions || [];
  const plans = plansData?.data?.plans || [];

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    discountType: 'percentage',
    discountValue: '',
    applicablePlans: [],
    maxUses: '',
    maxUsesPerTenant: 1,
    durationMonths: '',
    expiresAt: '',
  });

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      description: '',
      discountType: 'percentage',
      discountValue: '',
      applicablePlans: [],
      maxUses: '',
      maxUsesPerTenant: 1,
      durationMonths: '',
      expiresAt: '',
    });
    setEditingPromo(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        discountValue: parseFloat(formData.discountValue),
        maxUses: formData.maxUses ? parseInt(formData.maxUses) : null,
        maxUsesPerTenant: parseInt(formData.maxUsesPerTenant) || 1,
        durationMonths: formData.durationMonths ? parseInt(formData.durationMonths) : null,
        expiresAt: formData.expiresAt || null,
      };

      if (editingPromo) {
        await api.put(`/billing/admin/promotions/${editingPromo.id}`, payload);
      } else {
        await createMutation.mutateAsync(payload);
      }
      
      setShowModal(false);
      resetForm();
      refetch();
    } catch (error) {
      console.error('Error guardando promoción:', error);
    }
  };

  const handleEdit = (promo) => {
    setFormData({
      code: promo.code,
      name: promo.name,
      description: promo.description || '',
      discountType: promo.discount_type,
      discountValue: promo.discount_value,
      applicablePlans: promo.applicable_plans || [],
      maxUses: promo.max_uses || '',
      maxUsesPerTenant: promo.max_uses_per_tenant || 1,
      durationMonths: promo.duration_months || '',
      expiresAt: promo.expires_at ? new Date(promo.expires_at).toISOString().split('T')[0] : '',
    });
    setEditingPromo(promo);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Desactivar esta promoción?')) return;
    try {
      await api.delete(`/billing/admin/promotions/${id}`);
      refetch();
    } catch (error) {
      console.error('Error desactivando:', error);
    }
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const formatDate = (date) => {
    if (!date) return 'Sin fecha';
    return new Date(date).toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
              Promociones
            </h1>
            <p style={{ color: 'var(--color-textSecondary)' }}>
              Códigos de descuento para suscripciones
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate('/admin/billing')}>
              <ChevronLeft className="w-4 h-4" />
              Volver
            </Button>
            <Button onClick={() => { resetForm(); setShowModal(true); }}>
              <Plus className="w-4 h-4" />
              Nueva promoción
            </Button>
          </div>
        </div>

        {/* Promotions Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
          </div>
        ) : promotions.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Tag className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--color-textSecondary)' }} />
              <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--color-text)' }}>
                No hay promociones
              </h3>
              <p className="mb-6" style={{ color: 'var(--color-textSecondary)' }}>
                Creá tu primer código promocional para atraer nuevos clientes.
              </p>
              <Button onClick={() => setShowModal(true)}>
                <Plus className="w-4 h-4" />
                Crear promoción
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {promotions.map((promo) => (
              <Card key={promo.id} className={!promo.is_active ? 'opacity-50' : ''}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        promo.discount_type === 'percentage' ? 'bg-indigo-100' : 'bg-green-100'
                      }`}>
                        {promo.discount_type === 'percentage' ? (
                          <Percent className="w-6 h-6 text-indigo-600" />
                        ) : (
                          <DollarSign className="w-6 h-6 text-green-600" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold" style={{ color: 'var(--color-text)' }}>
                          {promo.name}
                        </h3>
                        <button
                          onClick={() => copyCode(promo.code)}
                          className="flex items-center gap-1 text-sm font-mono hover:text-indigo-600 transition-colors"
                          style={{ color: 'var(--color-primary)' }}
                        >
                          {promo.code}
                          {copiedCode === promo.code ? (
                            <Check className="w-3 h-3 text-green-500" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>
                    {!promo.is_active && (
                      <span className="px-2 py-1 rounded-full text-xs bg-slate-100 text-slate-600">
                        Inactiva
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span style={{ color: 'var(--color-textSecondary)' }}>Descuento</span>
                      <span className="font-semibold" style={{ color: 'var(--color-text)' }}>
                        {promo.discount_type === 'percentage' 
                          ? `${promo.discount_value}%` 
                          : `$${promo.discount_value.toLocaleString()}`
                        }
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span style={{ color: 'var(--color-textSecondary)' }}>Usos</span>
                      <span style={{ color: 'var(--color-text)' }}>
                        {promo.uses_count || 0} / {promo.max_uses || '∞'}
                      </span>
                    </div>
                    {promo.duration_months && (
                      <div className="flex items-center justify-between text-sm">
                        <span style={{ color: 'var(--color-textSecondary)' }}>Duración</span>
                        <span style={{ color: 'var(--color-text)' }}>
                          {promo.duration_months} mes(es)
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm">
                      <span style={{ color: 'var(--color-textSecondary)' }}>Vence</span>
                      <span style={{ color: 'var(--color-text)' }}>
                        {formatDate(promo.expires_at)}
                      </span>
                    </div>
                  </div>

                  {promo.description && (
                    <p className="text-sm mb-4 p-3 rounded-lg" style={{ backgroundColor: 'var(--color-background)', color: 'var(--color-textSecondary)' }}>
                      {promo.description}
                    </p>
                  )}

                  <div className="flex gap-2 pt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleEdit(promo)}
                    >
                      <Edit2 className="w-4 h-4" />
                      Editar
                    </Button>
                    {promo.is_active && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDelete(promo.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
            <div 
              className="w-full max-w-lg rounded-2xl p-6 shadow-xl my-8"
              style={{ backgroundColor: 'var(--color-card)' }}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>
                  {editingPromo ? 'Editar promoción' : 'Nueva promoción'}
                </h3>
                <button onClick={() => { setShowModal(false); resetForm(); }}>
                  <X className="w-5 h-5" style={{ color: 'var(--color-textSecondary)' }} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                      Código *
                    </label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      placeholder="DESCUENTO20"
                      className="w-full px-4 py-2 rounded-lg font-mono"
                      style={{ 
                        backgroundColor: 'var(--color-background)', 
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text)'
                      }}
                      disabled={!!editingPromo}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                      Nombre *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Descuento de lanzamiento"
                      className="w-full px-4 py-2 rounded-lg"
                      style={{ 
                        backgroundColor: 'var(--color-background)', 
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text)'
                      }}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                    Descripción
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Promoción para nuevos clientes"
                    className="w-full px-4 py-2 rounded-lg"
                    style={{ 
                      backgroundColor: 'var(--color-background)', 
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                      Tipo de descuento
                    </label>
                    <select
                      value={formData.discountType}
                      onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg"
                      style={{ 
                        backgroundColor: 'var(--color-background)', 
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text)'
                      }}
                    >
                      <option value="percentage">Porcentaje (%)</option>
                      <option value="fixed">Monto fijo ($)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                      Valor del descuento *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-textSecondary)' }}>
                        {formData.discountType === 'percentage' ? '%' : '$'}
                      </span>
                      <input
                        type="number"
                        value={formData.discountValue}
                        onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                        placeholder="20"
                        className="w-full pl-8 pr-4 py-2 rounded-lg"
                        style={{ 
                          backgroundColor: 'var(--color-background)', 
                          border: '1px solid var(--color-border)',
                          color: 'var(--color-text)'
                        }}
                        required
                        min="0"
                        max={formData.discountType === 'percentage' ? 100 : undefined}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                      Usos máximos totales
                    </label>
                    <input
                      type="number"
                      value={formData.maxUses}
                      onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
                      placeholder="Ilimitado"
                      className="w-full px-4 py-2 rounded-lg"
                      style={{ 
                        backgroundColor: 'var(--color-background)', 
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text)'
                      }}
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                      Usos por tenant
                    </label>
                    <input
                      type="number"
                      value={formData.maxUsesPerTenant}
                      onChange={(e) => setFormData({ ...formData, maxUsesPerTenant: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg"
                      style={{ 
                        backgroundColor: 'var(--color-background)', 
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text)'
                      }}
                      min="1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                      Duración (meses)
                    </label>
                    <input
                      type="number"
                      value={formData.durationMonths}
                      onChange={(e) => setFormData({ ...formData, durationMonths: e.target.value })}
                      placeholder="Siempre"
                      className="w-full px-4 py-2 rounded-lg"
                      style={{ 
                        backgroundColor: 'var(--color-background)', 
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text)'
                      }}
                      min="1"
                    />
                    <p className="text-xs mt-1" style={{ color: 'var(--color-textSecondary)' }}>
                      Ej: 3 = descuento los primeros 3 meses
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                      Fecha de expiración
                    </label>
                    <input
                      type="date"
                      value={formData.expiresAt}
                      onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg"
                      style={{ 
                        backgroundColor: 'var(--color-background)', 
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text)'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>
                    Aplicable a planes
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {plans.filter(p => !p.isContactSales).map((plan) => (
                      <button
                        key={plan.slug}
                        type="button"
                        onClick={() => {
                          const current = formData.applicablePlans;
                          const updated = current.includes(plan.slug)
                            ? current.filter(p => p !== plan.slug)
                            : [...current, plan.slug];
                          setFormData({ ...formData, applicablePlans: updated });
                        }}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          formData.applicablePlans.includes(plan.slug)
                            ? 'bg-indigo-100 text-indigo-700'
                            : ''
                        }`}
                        style={!formData.applicablePlans.includes(plan.slug) ? {
                          backgroundColor: 'var(--color-background)',
                          border: '1px solid var(--color-border)',
                          color: 'var(--color-text)'
                        } : {}}
                      >
                        {plan.name}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-textSecondary)' }}>
                    Dejar vacío = aplica a todos los planes
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button 
                    type="button"
                    variant="outline" 
                    className="flex-1" 
                    onClick={() => { setShowModal(false); resetForm(); }}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit"
                    className="flex-1"
                    loading={createMutation.isPending}
                  >
                    {editingPromo ? 'Guardar cambios' : 'Crear promoción'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default BillingPromotions;
