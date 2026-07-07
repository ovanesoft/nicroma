import { useState } from 'react';
import { Banknote, Plus, Trash2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { 
  Card, CardContent, CardHeader, CardTitle, Button, Input,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell
} from '../../components/ui';
import { 
  useTiposCambioUltimos, useTiposCambioHistorico, 
  useCargarTiposCambio, useEliminarTipoCambio 
} from '../../hooks/useApi';
import { formatDateTime, cn } from '../../lib/utils';
import toast from 'react-hot-toast';

const MONEDAS_SUGERIDAS = ['USD', 'EUR', 'CAD', 'BRL', 'GBP', 'CNY', 'CHF', 'JPY'];

function TiposCambioPage() {
  const [filtroMoneda, setFiltroMoneda] = useState('');
  const [valores, setValores] = useState({ USD: '', EUR: '', CAD: '', BRL: '' });
  const [otraMoneda, setOtraMoneda] = useState('');
  const [otraValor, setOtraValor] = useState('');

  const { data: ultimosData } = useTiposCambioUltimos();
  const { data: historicoData, isLoading } = useTiposCambioHistorico(filtroMoneda);
  const cargar = useCargarTiposCambio();
  const eliminar = useEliminarTipoCambio();

  const ultimos = ultimosData?.data?.ultimos || {};
  const historico = historicoData?.data?.historico || [];

  const handleGuardar = async () => {
    const cotizaciones = Object.entries(valores)
      .filter(([, v]) => v !== '' && parseFloat(v) > 0)
      .map(([moneda, valor]) => ({ moneda, valor: parseFloat(valor) }));

    if (otraMoneda.trim() && otraValor !== '' && parseFloat(otraValor) > 0) {
      cotizaciones.push({ moneda: otraMoneda.trim().toUpperCase(), valor: parseFloat(otraValor) });
    }

    if (cotizaciones.length === 0) {
      toast.error('Cargá al menos una cotización');
      return;
    }

    try {
      const result = await cargar.mutateAsync(cotizaciones);
      toast.success(result.message || 'Cotizaciones guardadas');
      setValores({ USD: '', EUR: '', CAD: '', BRL: '' });
      setOtraMoneda('');
      setOtraValor('');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al guardar');
    }
  };

  const handleEliminar = async (id) => {
    if (!confirm('¿Eliminar este registro del histórico?')) return;
    try {
      await eliminar.mutateAsync(id);
      toast.success('Registro eliminado');
    } catch {
      toast.error('Error al eliminar');
    }
  };

  const fmt = (v) => Number(v).toLocaleString('es-AR', { minimumFractionDigits: 2 });

  // Calcular variación vs registro anterior de la misma moneda
  const getVariacion = (registro, index) => {
    const anteriores = historico.slice(index + 1).filter(h => h.moneda === registro.moneda);
    if (anteriores.length === 0) return null;
    const anterior = anteriores[0].valor;
    if (anterior === registro.valor) return 0;
    return ((registro.valor - anterior) / anterior) * 100;
  };

  return (
    <Layout 
      title="Tipo de Cambio" 
      subtitle="Cargá las cotizaciones del día y mirá la evolución de las monedas"
    >
      {/* Últimos valores */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
        {Object.entries(ultimos).map(([moneda, info]) => (
          <Card key={moneda}>
            <CardContent className="p-4">
              <p className="text-xs text-slate-500 font-medium">{moneda}</p>
              <p className="text-xl font-bold text-slate-800 tabular-nums">$ {fmt(info.valor)}</p>
              <p className="text-[10px] text-slate-400">{formatDateTime(info.fecha)}</p>
            </CardContent>
          </Card>
        ))}
        {Object.keys(ultimos).length === 0 && (
          <Card className="col-span-full">
            <CardContent className="p-6 text-center text-slate-400 text-sm">
              Todavía no hay cotizaciones cargadas
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cargar cotizaciones */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Banknote className="w-5 h-5" /> Cargar Cotizaciones
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {['USD', 'EUR', 'CAD', 'BRL'].map(m => (
              <div key={m} className="flex items-center gap-3">
                <span className="w-12 text-sm font-semibold text-slate-700">{m}</span>
                <input
                  type="number" step="0.01" placeholder="0.00"
                  value={valores[m]}
                  onChange={(e) => setValores(prev => ({ ...prev, [m]: e.target.value }))}
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-sm text-right focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                />
              </div>
            ))}
            {/* Otra moneda */}
            <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
              <input
                type="text" placeholder="Otra..." maxLength={5}
                value={otraMoneda}
                onChange={(e) => setOtraMoneda(e.target.value.toUpperCase())}
                className="w-20 px-2 py-2 rounded-lg border border-slate-300 text-sm uppercase focus:border-primary-500 outline-none"
                list="monedas-sugeridas"
              />
              <datalist id="monedas-sugeridas">
                {MONEDAS_SUGERIDAS.map(m => <option key={m} value={m} />)}
              </datalist>
              <input
                type="number" step="0.01" placeholder="0.00"
                value={otraValor}
                onChange={(e) => setOtraValor(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-sm text-right focus:border-primary-500 outline-none"
              />
            </div>
            <Button className="w-full" onClick={handleGuardar} loading={cargar.isPending}>
              <Plus className="w-4 h-4" /> Guardar Cotizaciones
            </Button>
            <p className="text-xs text-slate-400">
              Los valores se expresan en pesos argentinos (ARS) por unidad de moneda extranjera.
            </p>
          </CardContent>
        </Card>

        {/* Histórico / Evolución */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Evolución</CardTitle>
            <select
              value={filtroMoneda}
              onChange={(e) => setFiltroMoneda(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm bg-white"
            >
              <option value="">Todas las monedas</option>
              {Object.keys(ultimos).map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center h-40">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
              </div>
            ) : historico.length === 0 ? (
              <p className="text-center py-10 text-slate-400 text-sm">Sin registros</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Moneda</TableHead>
                    <TableHead className="text-right">Valor (ARS)</TableHead>
                    <TableHead className="text-right">Variación</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historico.map((r, idx) => {
                    const variacion = getVariacion(r, idx);
                    return (
                      <TableRow key={r.id}>
                        <TableCell>
                          <span className="text-sm text-slate-600">{formatDateTime(r.fecha)}</span>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-slate-800">{r.moneda}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-mono font-medium">$ {fmt(r.valor)}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          {variacion === null ? (
                            <span className="text-slate-300">—</span>
                          ) : (
                            <span className={cn(
                              'inline-flex items-center gap-1 text-xs font-medium',
                              variacion > 0 ? 'text-red-600' : variacion < 0 ? 'text-green-600' : 'text-slate-400'
                            )}>
                              {variacion > 0 ? <TrendingUp className="w-3.5 h-3.5" /> 
                                : variacion < 0 ? <TrendingDown className="w-3.5 h-3.5" /> 
                                : <Minus className="w-3.5 h-3.5" />}
                              {Math.abs(variacion).toFixed(2)}%
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={() => handleEliminar(r.id)}
                            className="p-1.5 text-red-300 hover:text-red-600 rounded"
                            title="Eliminar registro"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

export default TiposCambioPage;
