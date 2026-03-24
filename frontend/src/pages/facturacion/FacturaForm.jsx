import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Save, Plus, Trash2, Search, Receipt, X
} from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { 
  Card, CardContent, CardHeader, CardTitle, Button, Input
} from '../../components/ui';
import { useCreateFactura, useBuscarClientes } from '../../hooks/useApi';
import { cn } from '../../lib/utils';
import toast from 'react-hot-toast';

const TIPOS_COMPROBANTE = [
  { value: '001', label: 'Factura A' },
  { value: '006', label: 'Factura B' },
  { value: '011', label: 'Factura C' },
  { value: '003', label: 'Nota de Crédito A' },
  { value: '008', label: 'Nota de Crédito B' },
  { value: '013', label: 'Nota de Crédito C' },
];

const ALICUOTAS_IVA = [
  { value: 21, label: '21%' },
  { value: 10.5, label: '10.5%' },
  { value: 27, label: '27%' },
  { value: 0, label: 'Exento / No Gravado' },
];

function FacturaForm() {
  const navigate = useNavigate();
  const createFactura = useCreateFactura();

  const [selectedCliente, setSelectedCliente] = useState(null);
  const [clienteSearch, setClienteSearch] = useState('');
  const [showClienteSearch, setShowClienteSearch] = useState(false);

  const { data: clientesData } = useBuscarClientes(clienteSearch);
  const clienteResults = clientesData?.data?.clientes || [];

  const [formData, setFormData] = useState({
    tipoComprobante: '001',
    puntoVenta: 1,
    moneda: 'ARS',
    cotizacion: 1,
    observaciones: '',
    fechaVencimiento: '',
  });

  const [items, setItems] = useState([
    { descripcion: '', cantidad: 1, precioUnitario: 0, alicuotaIVA: 21 }
  ]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addItem = () => {
    setItems([...items, { descripcion: '', cantidad: 1, precioUnitario: 0, alicuotaIVA: 21 }]);
  };

  const updateItem = (index, field, value) => {
    const updated = [...items];
    if (['cantidad', 'precioUnitario', 'alicuotaIVA'].includes(field)) {
      updated[index][field] = parseFloat(value) || 0;
    } else {
      updated[index][field] = value;
    }
    setItems(updated);
  };

  const removeItem = (index) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const itemsCalculados = items.map(i => {
    const subtotal = (i.cantidad || 1) * (i.precioUnitario || 0);
    const iva = subtotal * ((i.alicuotaIVA || 0) / 100);
    return { ...i, subtotal, iva, total: subtotal + iva };
  });

  const totalSubtotal = itemsCalculados.reduce((sum, i) => sum + i.subtotal, 0);
  const totalIVA = itemsCalculados.reduce((sum, i) => sum + i.iva, 0);
  const totalGeneral = totalSubtotal + totalIVA;

  const handleSubmit = async () => {
    if (!selectedCliente) {
      toast.error('Seleccioná un cliente');
      return;
    }
    if (!items.some(i => i.descripcion)) {
      toast.error('Agregá al menos un item con descripción');
      return;
    }

    try {
      const payload = {
        clienteId: selectedCliente.id,
        tipoComprobante: formData.tipoComprobante,
        puntoVenta: parseInt(formData.puntoVenta),
        moneda: formData.moneda,
        observaciones: formData.observaciones || null,
        items: items.filter(i => i.descripcion).map(i => ({
          descripcion: i.descripcion,
          cantidad: i.cantidad || 1,
          precioUnitario: i.precioUnitario || 0,
          alicuotaIVA: i.alicuotaIVA || 0,
        })),
      };

      const result = await createFactura.mutateAsync(payload);
      toast.success('Factura creada exitosamente');
      navigate(`/facturas/${result.data.factura.id}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al crear factura');
    }
  };

  return (
    <Layout 
      title="Nueva Factura"
      subtitle="Crear factura directa sin carpeta"
    >
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={() => navigate('/facturas')}>
          <ArrowLeft className="w-4 h-4" />
          Volver
        </Button>
        <Button onClick={handleSubmit} loading={createFactura.isPending}>
          <Save className="w-4 h-4" />
          Crear Factura
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Cliente */}
          <Card>
            <CardHeader>
              <CardTitle>Cliente</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedCliente ? (
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                  <div>
                    <p className="font-medium">{selectedCliente.razonSocial}</p>
                    <p className="text-sm text-slate-500">
                      {selectedCliente.tipoDocumento}: {selectedCliente.numeroDocumento}
                      {selectedCliente.condicionFiscal && ` · ${selectedCliente.condicionFiscal}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedCliente(null)}
                    className="p-1 text-slate-400 hover:text-red-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar cliente por nombre o CUIT..."
                      value={clienteSearch}
                      onChange={(e) => {
                        setClienteSearch(e.target.value);
                        setShowClienteSearch(true);
                      }}
                      onFocus={() => setShowClienteSearch(true)}
                      className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:border-primary-500 text-sm"
                    />
                  </div>
                  {showClienteSearch && clienteSearch.length >= 2 && clienteResults.length > 0 && (
                    <div className="bg-white rounded-lg border max-h-48 overflow-y-auto shadow-lg">
                      {clienteResults.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setSelectedCliente(c);
                            setShowClienteSearch(false);
                            setClienteSearch('');
                          }}
                          className="w-full px-4 py-2.5 text-left hover:bg-slate-50 border-b last:border-b-0"
                        >
                          <p className="font-medium text-sm">{c.razonSocial}</p>
                          <p className="text-xs text-slate-500">
                            {c.numeroDocumento}{c.condicionFiscal ? ` · ${c.condicionFiscal}` : ''}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Items</CardTitle>
              <Button type="button" size="sm" onClick={addItem}>
                <Plus className="w-4 h-4" />
                Agregar Item
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr className="text-xs text-slate-500 border-b bg-slate-50">
                      <th className="py-3 px-2 text-left font-medium">Descripción</th>
                      <th className="py-3 px-2 text-right font-medium w-20">Cant.</th>
                      <th className="py-3 px-2 text-right font-medium w-28">Precio Unit.</th>
                      <th className="py-3 px-2 text-center font-medium w-24">IVA</th>
                      <th className="py-3 px-2 text-right font-medium w-28">Subtotal</th>
                      <th className="py-3 px-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => {
                      const calc = itemsCalculados[index];
                      return (
                        <tr key={index} className="border-b border-slate-100">
                          <td className="py-2 px-2">
                            <input
                              type="text"
                              value={item.descripcion}
                              onChange={(e) => updateItem(index, 'descripcion', e.target.value)}
                              placeholder="Descripción del servicio o producto"
                              className="w-full px-2 py-1.5 text-sm rounded border border-slate-300"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="number"
                              value={item.cantidad}
                              onChange={(e) => updateItem(index, 'cantidad', e.target.value)}
                              className="w-full px-2 py-1.5 text-sm rounded border border-slate-300 text-right"
                              min="1"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="number"
                              step="0.01"
                              value={item.precioUnitario || ''}
                              onChange={(e) => updateItem(index, 'precioUnitario', e.target.value)}
                              placeholder="0.00"
                              className="w-full px-2 py-1.5 text-sm rounded border border-slate-300 text-right"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <select
                              value={item.alicuotaIVA}
                              onChange={(e) => updateItem(index, 'alicuotaIVA', e.target.value)}
                              className="w-full px-1 py-1.5 text-sm rounded border border-slate-300 bg-white"
                            >
                              {ALICUOTAS_IVA.map(a => (
                                <option key={a.value} value={a.value}>{a.label}</option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2 px-2 text-right">
                            <span className="text-sm font-medium">{calc.subtotal.toFixed(2)}</span>
                          </td>
                          <td className="py-2 px-2">
                            <button
                              type="button"
                              onClick={() => removeItem(index)}
                              className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                              disabled={items.length <= 1}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Totales */}
              <div className="mt-6 pt-4 border-t space-y-2">
                <div className="flex justify-end gap-16">
                  <span className="text-sm text-slate-500">Subtotal</span>
                  <span className="text-sm font-medium w-28 text-right">{formData.moneda} {totalSubtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-end gap-16">
                  <span className="text-sm text-slate-500">IVA</span>
                  <span className="text-sm font-medium w-28 text-right">{formData.moneda} {totalIVA.toFixed(2)}</span>
                </div>
                <div className="flex justify-end gap-16 pt-2 border-t">
                  <span className="text-base font-bold text-slate-700">Total</span>
                  <span className="text-lg font-bold text-green-600 w-28 text-right">{formData.moneda} {totalGeneral.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Comprobante</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Tipo</label>
                <select
                  value={formData.tipoComprobante}
                  onChange={(e) => handleChange('tipoComprobante', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm"
                >
                  {TIPOS_COMPROBANTE.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Punto de Venta</label>
                <input
                  type="number"
                  value={formData.puntoVenta}
                  onChange={(e) => handleChange('puntoVenta', parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Moneda</label>
                <select
                  value={formData.moneda}
                  onChange={(e) => handleChange('moneda', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm"
                >
                  <option value="ARS">ARS - Peso Argentino</option>
                  <option value="USD">USD - Dólar</option>
                  <option value="EUR">EUR - Euro</option>
                </select>
              </div>
              <Input
                label="Vencimiento"
                type="date"
                value={formData.fechaVencimiento}
                onChange={(e) => handleChange('fechaVencimiento', e.target.value)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Observaciones</CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                value={formData.observaciones}
                onChange={(e) => handleChange('observaciones', e.target.value)}
                placeholder="Notas o comentarios..."
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-primary-500 outline-none resize-none text-sm"
              />
            </CardContent>
          </Card>

          {/* Resumen rápido */}
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Receipt className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-800">Resumen</span>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-green-700">Items:</span>
                  <span className="font-medium">{items.filter(i => i.descripcion).length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700">Subtotal:</span>
                  <span className="font-medium">{formData.moneda} {totalSubtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700">IVA:</span>
                  <span className="font-medium">{formData.moneda} {totalIVA.toFixed(2)}</span>
                </div>
                <hr className="border-green-200" />
                <div className="flex justify-between text-base">
                  <span className="font-bold text-green-800">Total:</span>
                  <span className="font-bold text-green-800">{formData.moneda} {totalGeneral.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}

export default FacturaForm;
