import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';

// Hook genérico para GET requests
export function useApiQuery(key, url, options = {}) {
  return useQuery({
    queryKey: Array.isArray(key) ? key : [key],
    queryFn: async () => {
      const response = await api.get(url);
      return response.data;
    },
    ...options
  });
}

// Hook genérico para mutations (POST, PUT, DELETE)
export function useApiMutation(method, url, options = {}) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data) => {
      const response = await api[method](url, data);
      return response.data;
    },
    ...options,
    onSuccess: (data, variables, context) => {
      // Invalidar queries relacionadas si se especifica
      if (options.invalidateKeys) {
        options.invalidateKeys.forEach(key => {
          queryClient.invalidateQueries({ queryKey: [key] });
        });
      }
      options.onSuccess?.(data, variables, context);
    }
  });
}

// Hooks específicos para Tenants
export function useTenants(params = {}) {
  const queryString = new URLSearchParams(params).toString();
  return useApiQuery(
    ['tenants', params], 
    `/tenants${queryString ? `?${queryString}` : ''}`
  );
}

export function useTenant(id) {
  return useApiQuery(['tenant', id], `/tenants/${id}`, {
    enabled: !!id
  });
}

export function useCreateTenant() {
  return useApiMutation('post', '/tenants', {
    invalidateKeys: ['tenants']
  });
}

export function useUpdateTenant(id) {
  return useApiMutation('put', `/tenants/${id}`, {
    invalidateKeys: ['tenants', 'tenant']
  });
}

// Hooks específicos para Users
export function useUsers(params = {}) {
  const queryString = new URLSearchParams(params).toString();
  return useApiQuery(
    ['users', params], 
    `/users${queryString ? `?${queryString}` : ''}`
  );
}

export function useTenantUsers(tenantId) {
  return useApiQuery(
    ['tenantUsers', tenantId], 
    `/tenants/${tenantId}/users`,
    { enabled: !!tenantId }
  );
}

export function useCreateUser() {
  return useApiMutation('post', '/users', {
    invalidateKeys: ['users', 'tenantUsers']
  });
}

export function useUpdateUser(id) {
  return useApiMutation('put', `/users/${id}`, {
    invalidateKeys: ['users', 'tenantUsers']
  });
}

export function useDeactivateUser(id) {
  return useApiMutation('delete', `/users/${id}`, {
    invalidateKeys: ['users', 'tenantUsers']
  });
}

// Hooks específicos para Invitations
export function useInvitations(tenantId) {
  return useApiQuery(
    ['invitations', tenantId], 
    `/tenants/${tenantId}/invitations`,
    { enabled: !!tenantId }
  );
}

export function useInviteUser(tenantId) {
  return useApiMutation('post', `/tenants/${tenantId}/invite`, {
    invalidateKeys: ['invitations']
  });
}

export function useCancelInvitation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (invitationId) => {
      const response = await api.delete(`/invitations/${invitationId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
    }
  });
}

// ============================================
// HOOKS PARA CARPETAS
// ============================================

export function useCarpetas(params = {}) {
  const queryString = new URLSearchParams(
    Object.entries(params).filter(([_, v]) => v !== undefined && v !== '')
  ).toString();
  return useApiQuery(
    ['carpetas', params], 
    `/carpetas${queryString ? `?${queryString}` : ''}`
  );
}

export function useCarpeta(id) {
  return useApiQuery(['carpeta', id], `/carpetas/${id}`, {
    enabled: !!id
  });
}

export function useCreateCarpeta() {
  return useApiMutation('post', '/carpetas', {
    invalidateKeys: ['carpetas']
  });
}

export function useUpdateCarpeta(id) {
  return useApiMutation('put', `/carpetas/${id}`, {
    invalidateKeys: ['carpetas', 'carpeta']
  });
}

export function useDeleteCarpeta(id) {
  return useApiMutation('delete', `/carpetas/${id}`, {
    invalidateKeys: ['carpetas']
  });
}

export function useDuplicarCarpeta(id) {
  return useApiMutation('post', `/carpetas/${id}/duplicar`, {
    invalidateKeys: ['carpetas']
  });
}

// ============================================
// HOOKS PARA CLIENTES
// ============================================

export function useClientes(params = {}) {
  const queryString = new URLSearchParams(
    Object.entries(params).filter(([_, v]) => v !== undefined && v !== '')
  ).toString();
  return useApiQuery(
    ['clientes', params], 
    `/clientes${queryString ? `?${queryString}` : ''}`
  );
}

export function useCliente(id) {
  return useApiQuery(['cliente', id], `/clientes/${id}`, {
    enabled: !!id
  });
}

export function useCreateCliente() {
  return useApiMutation('post', '/clientes', {
    invalidateKeys: ['clientes']
  });
}

export function useUpdateCliente(id) {
  return useApiMutation('put', `/clientes/${id}`, {
    invalidateKeys: ['clientes', 'cliente']
  });
}

export function useBuscarClientes(query, tipo) {
  return useApiQuery(
    ['buscarClientes', query, tipo],
    `/clientes/buscar?q=${encodeURIComponent(query)}${tipo ? `&tipo=${tipo}` : ''}`,
    { enabled: query?.length >= 2 }
  );
}

// ============================================
// HOOKS PARA PREFACTURAS
// ============================================

export function usePrefacturas(params = {}) {
  const queryString = new URLSearchParams(
    Object.entries(params).filter(([_, v]) => v !== undefined && v !== '')
  ).toString();
  return useApiQuery(
    ['prefacturas', params], 
    `/prefacturas${queryString ? `?${queryString}` : ''}`
  );
}

export function usePrefactura(id) {
  return useApiQuery(['prefactura', id], `/prefacturas/${id}`, {
    enabled: !!id
  });
}

export function useCreatePrefactura() {
  return useApiMutation('post', '/prefacturas', {
    invalidateKeys: ['prefacturas']
  });
}

export function useCreatePrefacturaDesdeCarpeta() {
  return useApiMutation('post', '/prefacturas/desde-carpeta', {
    invalidateKeys: ['prefacturas', 'carpeta']
  });
}

export function useConfirmarPrefactura() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const response = await api.post(`/prefacturas/${id}/confirmar`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prefacturas'] });
      queryClient.invalidateQueries({ queryKey: ['prefactura'] });
    }
  });
}

export function useCancelarPrefactura() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const response = await api.post(`/prefacturas/${id}/cancelar`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prefacturas'] });
    }
  });
}

// ============================================
// HOOKS PARA FACTURAS
// ============================================

export function useFacturas(params = {}) {
  const queryString = new URLSearchParams(
    Object.entries(params).filter(([_, v]) => v !== undefined && v !== '')
  ).toString();
  return useApiQuery(
    ['facturas', params], 
    `/facturas${queryString ? `?${queryString}` : ''}`
  );
}

export function useFactura(id) {
  return useApiQuery(['factura', id], `/facturas/${id}`, {
    enabled: !!id
  });
}

export function useCreateFactura() {
  return useApiMutation('post', '/facturas', {
    invalidateKeys: ['facturas']
  });
}

export function useCreateFacturaDesdePrefactura() {
  return useApiMutation('post', '/facturas/desde-prefactura', {
    invalidateKeys: ['facturas', 'prefacturas']
  });
}

export function useAnularFactura() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const response = await api.post(`/facturas/${id}/anular`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facturas'] });
    }
  });
}

export function useRegistrarCobranza() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ facturaId, ...data }) => {
      const response = await api.post(`/facturas/${facturaId}/cobranza`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facturas'] });
      queryClient.invalidateQueries({ queryKey: ['factura'] });
    }
  });
}

// ============================================
// HOOKS PARA ESTADÍSTICAS
// ============================================

export function useStats() {
  return useApiQuery(['stats'], '/stats');
}

// ============================================
// HOOKS PARA INTEGRACIONES
// ============================================

// Lista de proveedores soportados
export function useCarriers() {
  return useApiQuery(['carriers'], '/integrations/carriers');
}

// Lista de integraciones configuradas
export function useIntegrations() {
  return useApiQuery(['integrations'], '/integrations');
}

// Detalle de una integración
export function useIntegration(provider) {
  return useApiQuery(['integration', provider], `/integrations/${provider}`, {
    enabled: !!provider
  });
}

// Guardar integración
export function useSaveIntegration(provider) {
  return useApiMutation('post', `/integrations/${provider}`, {
    invalidateKeys: ['integrations', 'carriers', 'integration']
  });
}

// Probar conexión
export function useTestConnection(provider) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (credentials) => {
      const response = await api.post(`/integrations/${provider}/test`, credentials);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integration', provider] });
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      queryClient.invalidateQueries({ queryKey: ['carriers'] });
    }
  });
}

// Eliminar integración
export function useDeleteIntegration(provider) {
  return useApiMutation('delete', `/integrations/${provider}`, {
    invalidateKeys: ['integrations', 'carriers']
  });
}

// Tracking directo
export function useTrack() {
  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/integrations/track', data);
      return response.data;
    }
  });
}

// Schedules
export function useSchedules() {
  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/integrations/schedules', data);
      return response.data;
    }
  });
}

// Suscripciones de tracking
export function useTrackingSubscriptions(params = {}) {
  const queryString = new URLSearchParams(
    Object.entries(params).filter(([_, v]) => v !== undefined && v !== '')
  ).toString();
  return useApiQuery(
    ['trackingSubscriptions', params], 
    `/integrations/subscriptions${queryString ? `?${queryString}` : ''}`
  );
}

export function useTrackingSubscription(id) {
  return useApiQuery(['trackingSubscription', id], `/integrations/subscriptions/${id}`, {
    enabled: !!id
  });
}

export function useCreateTrackingSubscription() {
  return useApiMutation('post', '/integrations/subscriptions', {
    invalidateKeys: ['trackingSubscriptions']
  });
}

export function useRefreshTracking(id) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const response = await api.post(`/integrations/subscriptions/${id}/refresh`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trackingSubscription', id] });
      queryClient.invalidateQueries({ queryKey: ['trackingSubscriptions'] });
    }
  });
}

export function useDeleteTrackingSubscription(id) {
  return useApiMutation('delete', `/integrations/subscriptions/${id}`, {
    invalidateKeys: ['trackingSubscriptions']
  });
}

// ============================================
// HOOKS PARA FACTURACIÓN ELECTRÓNICA
// ============================================

// Configuración fiscal
export function useFiscalConfig() {
  return useApiQuery(['fiscalConfig'], '/fiscal/config');
}

export function useSaveFiscalConfig() {
  return useApiMutation('post', '/fiscal/config', {
    invalidateKeys: ['fiscalConfig']
  });
}

export function useTestFiscalConnection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const response = await api.post('/fiscal/test-connection');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiscalConfig'] });
    }
  });
}

export function useValidateCertificate() {
  return useMutation({
    mutationFn: async (certificate) => {
      const response = await api.post('/fiscal/validate-certificate', { certificate });
      return response.data;
    }
  });
}

export function useFiscalServerStatus(environment = 'TESTING') {
  return useApiQuery(
    ['fiscalServerStatus', environment],
    `/fiscal/server-status?environment=${environment}`
  );
}

// Puntos de venta
export function usePuntosVenta() {
  return useApiQuery(['puntosVenta'], '/fiscal/puntos-venta');
}

export function useSyncPuntosVenta() {
  return useApiMutation('post', '/fiscal/puntos-venta/sync', {
    invalidateKeys: ['puntosVenta']
  });
}

export function useSavePuntoVenta() {
  return useApiMutation('post', '/fiscal/puntos-venta', {
    invalidateKeys: ['puntosVenta']
  });
}

// Datos de referencia
export function useTiposComprobante() {
  return useApiQuery(['tiposComprobante'], '/fiscal/tipos-comprobante');
}

export function useTiposDocumento() {
  return useApiQuery(['tiposDocumento'], '/fiscal/tipos-documento');
}

export function useAlicuotasIVA() {
  return useApiQuery(['alicuotasIVA'], '/fiscal/alicuotas-iva');
}

export function useUltimoAutorizado(puntoVenta, tipoComprobante) {
  return useApiQuery(
    ['ultimoAutorizado', puntoVenta, tipoComprobante],
    `/fiscal/ultimo-autorizado?puntoVenta=${puntoVenta}&tipoComprobante=${tipoComprobante}`,
    { enabled: !!puntoVenta && !!tipoComprobante }
  );
}

// Emisión de comprobantes
export function useEmitirComprobante() {
  return useApiMutation('post', '/fiscal/emitir', {
    invalidateKeys: ['comprobantesFiscales', 'facturas']
  });
}

export function useEmitirDesdeFactura(facturaId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post(`/fiscal/emitir-desde-factura/${facturaId}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['factura', facturaId] });
      queryClient.invalidateQueries({ queryKey: ['facturas'] });
      queryClient.invalidateQueries({ queryKey: ['comprobantesFiscales'] });
    }
  });
}

// Comprobantes fiscales
export function useComprobantesFiscales(params = {}) {
  const queryString = new URLSearchParams(
    Object.entries(params).filter(([_, v]) => v !== undefined && v !== '')
  ).toString();
  return useApiQuery(
    ['comprobantesFiscales', params],
    `/fiscal/comprobantes${queryString ? `?${queryString}` : ''}`
  );
}

export function useComprobanteFiscal(id) {
  return useApiQuery(['comprobanteFiscal', id], `/fiscal/comprobantes/${id}`, {
    enabled: !!id
  });
}

// ============================================
// HOOKS PARA PERFIL DE USUARIO
// ============================================

export function useProfile() {
  return useApiQuery(['profile'], '/users/profile');
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const response = await api.put('/users/profile', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    }
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/users/change-password', data);
      return response.data;
    }
  });
}

// ============================================
// HOOKS PARA CONFIGURACIÓN DE EMPRESA
// ============================================

export function useCompanyConfig() {
  return useApiQuery(['companyConfig'], '/tenants/my/company');
}

export function useUpdateCompanyConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const response = await api.put('/tenants/my/company', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companyConfig'] });
    }
  });
}

export function useUploadCompanyLogo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (logo) => {
      const response = await api.post('/tenants/my/company/logo', { logo });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companyConfig'] });
    }
  });
}

export function useDeleteCompanyLogo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const response = await api.delete('/tenants/my/company/logo');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companyConfig'] });
    }
  });
}

export function useEnablePortal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const response = await api.post('/tenants/my/company/portal');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companyConfig'] });
    }
  });
}

// Portal público (sin auth)
export function usePortalInfo(portalSlug) {
  return useQuery({
    queryKey: ['portal', portalSlug],
    queryFn: async () => {
      const response = await api.get(`/portal-info/${portalSlug}`);
      return response.data;
    },
    enabled: !!portalSlug
  });
}

// =====================================================
// PORTAL DE CLIENTES (requiere auth)
// =====================================================

// Dashboard del portal
export function usePortalDashboard() {
  return useQuery({
    queryKey: ['portalDashboard'],
    queryFn: async () => {
      const response = await api.get('/portal/dashboard');
      return response.data;
    },
    staleTime: 30000, // 30 segundos
    refetchOnMount: true
  });
}

// Envíos del cliente
export function usePortalEnvios(params = {}) {
  return useQuery({
    queryKey: ['portalEnvios', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.append('page', params.page);
      if (params.limit) searchParams.append('limit', params.limit);
      if (params.estado) searchParams.append('estado', params.estado);
      const response = await api.get(`/portal/envios?${searchParams.toString()}`);
      return response.data;
    }
  });
}

export function usePortalEnvio(id) {
  return useQuery({
    queryKey: ['portalEnvio', id],
    queryFn: async () => {
      const response = await api.get(`/portal/envios/${id}`);
      return response.data;
    },
    enabled: !!id
  });
}

// Facturas del cliente
export function usePortalFacturas(params = {}) {
  return useQuery({
    queryKey: ['portalFacturas', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.append('page', params.page);
      if (params.limit) searchParams.append('limit', params.limit);
      if (params.estado) searchParams.append('estado', params.estado);
      const response = await api.get(`/portal/facturas?${searchParams.toString()}`);
      return response.data;
    }
  });
}

export function usePortalFactura(id) {
  return useQuery({
    queryKey: ['portalFactura', id],
    queryFn: async () => {
      const response = await api.get(`/portal/facturas/${id}`);
      return response.data;
    },
    enabled: !!id
  });
}

// Prefacturas del cliente
export function usePortalPrefacturas(params = {}) {
  return useQuery({
    queryKey: ['portalPrefacturas', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.append('page', params.page);
      if (params.limit) searchParams.append('limit', params.limit);
      if (params.estado) searchParams.append('estado', params.estado);
      const response = await api.get(`/portal/prefacturas?${searchParams.toString()}`);
      return response.data;
    }
  });
}

// Mi cuenta
export function usePortalMiCuenta() {
  return useQuery({
    queryKey: ['portalMiCuenta'],
    queryFn: async () => {
      const response = await api.get('/portal/mi-cuenta');
      return response.data;
    }
  });
}

// =============================================
// PRESUPUESTOS
// =============================================

// Lista de presupuestos (tenant)
export function usePresupuestos(params = {}) {
  return useQuery({
    queryKey: ['presupuestos', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.append('page', params.page);
      if (params.limit) searchParams.append('limit', params.limit);
      if (params.search) searchParams.append('search', params.search);
      if (params.estado) searchParams.append('estado', params.estado);
      if (params.clienteId) searchParams.append('clienteId', params.clienteId);
      const response = await api.get(`/presupuestos?${searchParams.toString()}`);
      return response.data;
    }
  });
}

// Presupuesto por ID
export function usePresupuesto(id) {
  return useQuery({
    queryKey: ['presupuesto', id],
    queryFn: async () => {
      const response = await api.get(`/presupuestos/${id}`);
      return response.data;
    },
    enabled: !!id
  });
}

// Crear presupuesto
export function useCreatePresupuesto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/presupuestos', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['presupuestos'] });
    }
  });
}

// Actualizar presupuesto
export function useUpdatePresupuesto(id) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const response = await api.put(`/presupuestos/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['presupuestos'] });
      queryClient.invalidateQueries({ queryKey: ['presupuesto', id] });
    }
  });
}

// Cambiar estado de presupuesto
export function useCambiarEstadoPresupuesto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, estado, motivoRechazo }) => {
      const response = await api.post(`/presupuestos/${id}/estado`, { estado, motivoRechazo });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['presupuestos'] });
      queryClient.invalidateQueries({ queryKey: ['presupuesto', variables.id] });
    }
  });
}

// Convertir presupuesto a carpeta
export function useConvertirPresupuesto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const response = await api.post(`/presupuestos/${id}/convertir`);
      return response.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['presupuestos'] });
      queryClient.invalidateQueries({ queryKey: ['presupuesto', id] });
      queryClient.invalidateQueries({ queryKey: ['carpetas'] });
    }
  });
}

// Mensajes de presupuesto
export function useMensajesPresupuesto(id) {
  return useQuery({
    queryKey: ['presupuestoMensajes', id],
    queryFn: async () => {
      const response = await api.get(`/presupuestos/${id}/mensajes`);
      return response.data;
    },
    enabled: !!id,
    refetchInterval: 10000 // Refrescar cada 10 segundos para simular "tiempo real"
  });
}

// Agregar mensaje
export function useAgregarMensaje() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ presupuestoId, mensaje, adjuntos }) => {
      const response = await api.post(`/presupuestos/${presupuestoId}/mensajes`, { mensaje, adjuntos });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['presupuestoMensajes', variables.presupuestoId] });
      queryClient.invalidateQueries({ queryKey: ['presupuesto', variables.presupuestoId] });
    }
  });
}

// Solicitar presupuesto desde portal (público/cliente)
export function useSolicitarPresupuesto() {
  return useMutation({
    mutationFn: async ({ portalSlug, data }) => {
      const response = await api.post(`/presupuestos/solicitar/${portalSlug}`, data);
      return response.data;
    }
  });
}

// Presupuestos del cliente (portal)
export function usePresupuestosCliente() {
  return useQuery({
    queryKey: ['presupuestosCliente'],
    queryFn: async () => {
      const response = await api.get('/presupuestos/mis-presupuestos');
      return response.data;
    }
  });
}

// Notificaciones (presupuestos pendientes, mensajes no leídos)
export function useNotificaciones() {
  return useQuery({
    queryKey: ['notificaciones'],
    queryFn: async () => {
      const response = await api.get('/presupuestos/notificaciones');
      return response.data;
    },
    refetchInterval: 30000, // Refrescar cada 30 segundos
    staleTime: 10000 // Considerar datos frescos por 10 segundos
  });
}

// Marcar mensajes como leídos
export function useMarcarMensajesLeidos() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (presupuestoId) => {
      const response = await api.post(`/presupuestos/${presupuestoId}/mensajes/leidos`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificaciones'] });
      queryClient.invalidateQueries({ queryKey: ['presupuesto'] });
      queryClient.invalidateQueries({ queryKey: ['mensajesPresupuesto'] });
    }
  });
}
