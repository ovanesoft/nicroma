import React, { useState, useEffect } from 'react';
import { 
  Search, Plus, Pencil, Trash2, Download, X, Check
} from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { 
  Card, CardContent, CardHeader, CardTitle, Button, Input, Badge,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty,
  Modal, ModalHeader, ModalTitle, ModalContent, ModalFooter
} from '../../components/ui';
import { 
  useConceptosGasto, useCreateConceptoGasto, useDeleteConceptoGasto,
  useSeedConceptosGasto
} from '../../hooks/useApi';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { cn } from '../../lib/utils';

const CATEGORIAS_IVA = [
  { value: 'GRAVADO', label: 'Gravado' },
  { value: 'NO_GRAVADO', label: 'No Gravado' },
  { value: 'EXENTO', label: 'Exento' },
];

const ALICUOTAS = [
  { value: 21, label: '21%' },
  { value: 10.5, label: '10.5%' },
  { value: 27, label: '27%' },
  { value: 5, label: '5%' },
  { value: 2.5, label: '2.5%' },
  { value: 0, label: '0%' },
];

const BASES = [
  { value: 'IMPORTE_FIJO', label: 'Importe Fijo' },
  { value: 'POR_CONTENEDOR', label: 'Por Contenedor' },
  { value: 'KILOS', label: 'Kilos' },
  { value: 'TONELADA', label: 'Tonelada' },
  { value: 'VOLUMEN', label: 'Volumen' },
  { value: 'CANT_CONTENEDORES', label: 'Cant. Contenedores' },
];

function CatalogoGastosPage() {
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nombre: '',
    categoriaIVA: 'GRAVADO',
    porcentajeIVA: 21,
    divisa: 'USD',
    base: 'IMPORTE_FIJO',
    prepaidCollect: 'P',
  });

  const { data, isLoading, refetch } = useConceptosGasto();
  const createConcepto = useCreateConceptoGasto();
  const deleteConcepto = useDeleteConceptoGasto();
  const seedConceptos = useSeedConceptosGasto();

  const conceptos = data?.data?.conceptos || [];
  const filtered = search
    ? conceptos.filter(c => c.nombre.toLowerCase().includes(search.toLowerCase()))
    : conceptos;

  const resetForm = () => {
    setForm({
      nombre: '',
      categoriaIVA: 'GRAVADO',
      porcentajeIVA: 21,
      divisa: 'USD',
      base: 'IMPORTE_FIJO',
      prepaidCollect: 'P',
    });
    setEditingId(null);
  };

  const openNew = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEdit = (concepto) => {
    setForm({
      nombre: concepto.nombre,
      categoriaIVA: concepto.categoriaIVA || 'GRAVADO',
      porcentajeIVA: concepto.porcentajeIVA || 21,
      divisa: concepto.divisa || 'USD',
      base: concepto.base || 'IMPORTE_FIJO',
      prepaidCollect: concepto.prepaidCollect || 'P',
    });
    setEditingId(concepto.id);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.nombre.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/conceptos-gasto/${editingId}`, form);
        toast.success('Concepto actualizado');
      } else {
        await createConcepto.mutateAsync(form);
        toast.success('Concepto creado');
      }
      setModalOpen(false);
      resetForm();
      refetch();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, nombre) => {
    if (!confirm(`¿Eliminar "${nombre}"?`)) return;
    try {
      await deleteConcepto.mutateAsync(id);
      toast.success('Concepto eliminado');
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  const handleSeed = async () => {
    try {
      const result = await seedConceptos.mutateAsync({});
      if (result.data?.creados > 0) {
        toast.success(`${result.data.creados} conceptos cargados`);
        refetch();
      } else {
        toast.info('Ya hay conceptos cargados');
      }
    } catch (error) {
      toast.error('Error al cargar conceptos');
    }
  };

  const getCatBadge = (cat) => {
    if (cat === 'GRAVADO') return <Badge variant="success">Gravado</Badge>;
    if (cat === 'EXENTO') return <Badge variant="warning">Exento</Badge>;
    return <Badge variant="secondary">No Gravado</Badge>;
  };

  return (
    <Layout 
      title="Catálogo de Gastos" 
      subtitle="Conceptos precargados para presupuestos y tarifas"
    >
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar concepto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
          />
        </div>
        {conceptos.length === 0 && (
          <Button variant="secondary" onClick={handleSeed} loading={seedConceptos.isPending}>
            <Download className="w-4 h-4" />
            Cargar conceptos estándar
          </Button>
        )}
        <Button onClick={openNew}>
          <Plus className="w-4 h-4" />
          Nuevo Concepto
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Concepto</TableHead>
                <TableHead>IVA</TableHead>
                <TableHead>Alícuota</TableHead>
                <TableHead>Divisa</TableHead>
                <TableHead>Base</TableHead>
                <TableHead>P/C</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={7}>
                      <div className="h-10 bg-slate-100 rounded animate-pulse" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableEmpty 
                  colSpan={7} 
                  message={
                    conceptos.length === 0
                      ? 'No hay conceptos. Hacé clic en "Cargar conceptos estándar" para empezar.'
                      : 'No se encontraron resultados'
                  }
                />
              ) : (
                filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <span className="font-medium text-slate-800">{c.nombre}</span>
                    </TableCell>
                    <TableCell>{getCatBadge(c.categoriaIVA)}</TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-600">
                        {c.categoriaIVA === 'GRAVADO' ? `${c.porcentajeIVA}%` : '—'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-600">{c.divisa}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-slate-500">
                        {BASES.find(b => b.value === c.base)?.label || c.base || '—'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        'text-xs font-medium px-1.5 py-0.5 rounded',
                        c.prepaidCollect === 'P' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                      )}>
                        {c.prepaidCollect === 'P' ? 'Prepaid' : 'Collect'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <button
                          onClick={() => openEdit(c)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id, c.nombre)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal crear/editar */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
        <ModalHeader onClose={() => setModalOpen(false)}>
          <ModalTitle>{editingId ? 'Editar Concepto' : 'Nuevo Concepto'}</ModalTitle>
        </ModalHeader>
        <ModalContent className="space-y-4">
          <Input
            label="Nombre del concepto"
            placeholder="FLETE MARÍTIMO"
            value={form.nombre}
            onChange={(e) => setForm(prev => ({ ...prev, nombre: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Categoría IVA</label>
              <select
                value={form.categoriaIVA}
                onChange={(e) => {
                  const cat = e.target.value;
                  setForm(prev => ({
                    ...prev,
                    categoriaIVA: cat,
                    porcentajeIVA: cat === 'GRAVADO' ? (prev.porcentajeIVA || 21) : 0,
                  }));
                }}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm"
              >
                {CATEGORIAS_IVA.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            {form.categoriaIVA === 'GRAVADO' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Alícuota</label>
                <select
                  value={form.porcentajeIVA}
                  onChange={(e) => setForm(prev => ({ ...prev, porcentajeIVA: parseFloat(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm"
                >
                  {ALICUOTAS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                </select>
              </div>
            )}
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Divisa</label>
              <select
                value={form.divisa}
                onChange={(e) => setForm(prev => ({ ...prev, divisa: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="ARS">ARS</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Base</label>
              <select
                value={form.base}
                onChange={(e) => setForm(prev => ({ ...prev, base: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm"
              >
                {BASES.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">P/C</label>
              <select
                value={form.prepaidCollect}
                onChange={(e) => setForm(prev => ({ ...prev, prepaidCollect: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm"
              >
                <option value="P">Prepaid</option>
                <option value="C">Collect</option>
              </select>
            </div>
          </div>
        </ModalContent>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
          <Button onClick={handleSave} loading={saving}>
            {editingId ? 'Guardar Cambios' : 'Crear Concepto'}
          </Button>
        </ModalFooter>
      </Modal>
    </Layout>
  );
}

export default CatalogoGastosPage;
