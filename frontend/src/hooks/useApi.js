import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
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

// Usuarios de mi organización (para admins/managers)
export function useMyOrgUsers() {
  return useApiQuery(
    ['myOrgUsers'], 
    `/tenants/my/users`
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
  return useQuery({
    queryKey: ['carpetas', params],
    queryFn: async () => {
      const response = await api.get(`/carpetas${queryString ? `?${queryString}` : ''}`);
      return response.data;
    },
    refetchInterval: 15000,
    staleTime: 10000,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData
  });
}

export function useCarpeta(id) {
  return useQuery({
    queryKey: ['carpeta', id],
    queryFn: async () => {
      const response = await api.get(`/carpetas/${id}`);
      return response.data;
    },
    enabled: !!id,
    refetchInterval: 15000,
    staleTime: 10000,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData
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
// HOOKS PARA PROVEEDORES
// ============================================

export function useProveedores(params = {}) {
  const queryString = new URLSearchParams(
    Object.entries(params).filter(([_, v]) => v !== undefined && v !== '')
  ).toString();
  return useApiQuery(
    ['proveedores', params], 
    `/proveedores${queryString ? `?${queryString}` : ''}`
  );
}

export function useProveedor(id) {
  return useApiQuery(['proveedor', id], `/proveedores/${id}`, {
    enabled: !!id
  });
}

export function useCreateProveedor() {
  return useApiMutation('post', '/proveedores', {
    invalidateKeys: ['proveedores']
  });
}

export function useUpdateProveedor(id) {
  return useApiMutation('put', `/proveedores/${id}`, {
    invalidateKeys: ['proveedores', 'proveedor']
  });
}

export function useDeleteProveedor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const response = await api.delete(`/proveedores/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proveedores'] });
    }
  });
}

export function useBuscarProveedores(query, tipo) {
  return useApiQuery(
    ['buscarProveedores', query, tipo],
    `/proveedores/buscar?q=${encodeURIComponent(query)}${tipo ? `&tipo=${tipo}` : ''}`,
    { enabled: query?.length >= 2 }
  );
}

export function useTiposProveedor() {
  return useApiQuery(['tiposProveedor'], '/proveedores/tipos');
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

// Hook para obtener cuentas bancarias del tenant (para selectores en presupuesto/carpeta)
export function useCuentasBancarias() {
  const { data, ...rest } = useApiQuery(['companyConfig'], '/tenants/my/company');
  return {
    data: data?.data?.cuentasBancarias || [],
    ...rest
  };
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

// Obtener información de medios de pago del tenant
export function usePaymentInfo() {
  return useQuery({
    queryKey: ['paymentInfo'],
    queryFn: async () => {
      const response = await api.get('/portal/payment-info');
      return response.data;
    },
    staleTime: 300000, // 5 minutos
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
    },
    refetchInterval: 15000,
    staleTime: 10000,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData // Mantiene datos mientras refresca
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
    enabled: !!id,
    refetchInterval: 15000,
    staleTime: 10000,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData
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
    refetchInterval: 10000,
    staleTime: 5000,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData
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
    },
    refetchInterval: 15000,
    staleTime: 10000,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData
  });
}

// Notificaciones (presupuestos pendientes, mensajes no leídos)
export function useNotificaciones() {
  return useQuery({
    queryKey: ['notificaciones'],
    queryFn: async () => {
      try {
        const response = await api.get('/presupuestos/notificaciones');
        return response.data;
      } catch (error) {
        console.error('Error fetching notificaciones:', error);
        return { data: { notificaciones: {} } };
      }
    },
    refetchInterval: 15000,
    staleTime: 10000,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
    retry: 1
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

export function useMarcarPresupuestoVisto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (presupuestoId) => {
      const response = await api.post(`/presupuestos/${presupuestoId}/visto`);
      return response.data;
    },
    onSuccess: () => {
      // Forzar refetch inmediato ignorando staleTime
      queryClient.refetchQueries({ queryKey: ['notificaciones'], type: 'active' });
      queryClient.invalidateQueries({ queryKey: ['presupuestosCliente'] });
    }
  });
}

// =====================================================
// BILLING - Suscripciones y Pagos
// =====================================================

// Obtener planes disponibles (público)
export function useBillingPlans() {
  return useApiQuery(['billingPlans'], '/billing/plans', {
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

// Obtener estado de suscripción del tenant actual
export function useSubscription() {
  return useApiQuery(['subscription'], '/billing/subscription', {
    staleTime: 30 * 1000, // 30 segundos
    refetchOnWindowFocus: true,
  });
}

// Iniciar checkout
export function useCreateCheckout() {
  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/billing/subscription/checkout', data);
      return response.data;
    }
  });
}

// Upgrade de plan
export function useUpgradePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/billing/subscription/upgrade', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    }
  });
}

// Downgrade de plan
export function useDowngradePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/billing/subscription/downgrade', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    }
  });
}

// Cancelar suscripción
export function useCancelSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/billing/subscription/cancel', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    }
  });
}

// Reactivar suscripción
export function useReactivateSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const response = await api.post('/billing/subscription/reactivate');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    }
  });
}

// Extender trial
export function useExtendTrial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const response = await api.post('/billing/trial/extend');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    }
  });
}

// Activar oferta de acompañamiento
export function useActivateAccompaniment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const response = await api.post('/billing/accompaniment/activate');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    }
  });
}

// Validar código promocional
export function useValidatePromotion() {
  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/billing/promotions/validate', data);
      return response.data;
    }
  });
}

// Obtener historial de pagos
export function useBillingPayments(params = {}) {
  const queryString = new URLSearchParams(params).toString();
  return useApiQuery(
    ['billingPayments', params],
    `/billing/payments${queryString ? `?${queryString}` : ''}`
  );
}

// =====================================================
// BILLING ADMIN - Para root
// =====================================================

// Listar todas las suscripciones (admin)
export function useAdminSubscriptions(params = {}) {
  const queryString = new URLSearchParams(params).toString();
  return useApiQuery(
    ['adminSubscriptions', params],
    `/billing/admin/subscriptions${queryString ? `?${queryString}` : ''}`
  );
}

// Obtener alertas de billing (admin)
export function useAdminBillingAlerts() {
  return useApiQuery(['adminBillingAlerts'], '/billing/admin/alerts', {
    refetchInterval: 60 * 1000, // 1 minuto
  });
}

// Obtener estadísticas de billing (admin)
export function useAdminBillingStats() {
  return useApiQuery(['adminBillingStats'], '/billing/admin/stats');
}

// Listar promociones (admin)
export function useAdminPromotions() {
  return useApiQuery(['adminPromotions'], '/billing/admin/promotions');
}

// Crear promoción (admin)
export function useCreatePromotion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/billing/admin/promotions', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminPromotions'] });
    }
  });
}

// Actualizar promoción (admin)
export function useUpdatePromotion(id) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const response = await api.put(`/billing/admin/promotions/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminPromotions'] });
    }
  });
}

// Suspender suscripción (admin)
export function useAdminSuspendSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ tenantId, reason }) => {
      const response = await api.post(`/billing/admin/subscriptions/${tenantId}/suspend`, { reason });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminSubscriptions'] });
    }
  });
}

// Reactivar suscripción (admin)
export function useAdminReactivateSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (tenantId) => {
      const response = await api.post(`/billing/admin/subscriptions/${tenantId}/reactivate`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminSubscriptions'] });
    }
  });
}

// =====================================================
// NOTIFICACIONES DEL SISTEMA
// =====================================================

// Obtener mis notificaciones
export function useMyNotifications(options = {}) {
  const { unreadOnly = false, limit = 20 } = options;
  return useQuery({
    queryKey: ['myNotifications', { unreadOnly, limit }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (unreadOnly) params.append('unreadOnly', 'true');
      params.append('limit', limit.toString());
      const response = await api.get(`/notifications/my?${params}`);
      return response.data;
    },
    refetchInterval: 60000, // Refrescar cada minuto
    staleTime: 30000
  });
}

// Marcar notificación como leída
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (notificationId) => {
      const response = await api.post(`/notifications/${notificationId}/read`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myNotifications'] });
    }
  });
}

// Marcar todas como leídas
export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const response = await api.post('/notifications/read-all');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myNotifications'] });
    }
  });
}

// =====================================================
// NOTIFICACIONES - ADMIN ROOT
// =====================================================

// Listar todas las notificaciones (root)
export function useAllNotifications(page = 1, limit = 20) {
  return useQuery({
    queryKey: ['allNotifications', page, limit],
    queryFn: async () => {
      const response = await api.get(`/notifications?page=${page}&limit=${limit}`);
      return response.data;
    }
  });
}

// Crear notificación (root)
export function useCreateNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/notifications', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allNotifications'] });
    }
  });
}

// Desactivar notificación (root)
export function useDeactivateNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const response = await api.delete(`/notifications/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allNotifications'] });
    }
  });
}

// =====================================================
// CONVERSACIONES / MENSAJERÍA
// =====================================================

// Obtener mis conversaciones
export function useMyConversations(filters = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.append('status', filters.status);
  if (filters.type) params.append('type', filters.type);
  
  return useQuery({
    queryKey: ['myConversations', filters],
    queryFn: async () => {
      const response = await api.get(`/conversations/my?${params}`);
      return response.data;
    },
    refetchInterval: 30000 // Refrescar cada 30 segundos
  });
}

// Obtener conteo de conversaciones no leídas
export function useUnreadConversationsCount() {
  return useQuery({
    queryKey: ['unreadConversationsCount'],
    queryFn: async () => {
      const response = await api.get('/conversations/unread-count');
      return response.data;
    },
    refetchInterval: 60000
  });
}

// Obtener una conversación con mensajes
export function useConversation(id) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: ['conversation', id],
    queryFn: async () => {
      const response = await api.get(`/conversations/${id}`);
      // Al cargar la conversación, el backend marca como leída
      // Refrescar el conteo de no leídas
      queryClient.refetchQueries({ queryKey: ['unreadConversationsCount'], type: 'active' });
      queryClient.refetchQueries({ queryKey: ['myConversations'], type: 'active' });
      return response.data;
    },
    enabled: !!id,
    refetchInterval: 10000 // Refrescar cada 10 segundos cuando está abierta
  });
}

// Crear nueva conversación
export function useCreateConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/conversations', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['myConversations'], type: 'active' });
      queryClient.refetchQueries({ queryKey: ['unreadConversationsCount'], type: 'active' });
    }
  });
}

// Agregar mensaje a conversación
export function useAddMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ conversationId, content, attachments }) => {
      const response = await api.post(`/conversations/${conversationId}/messages`, { content, attachments });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.refetchQueries({ queryKey: ['conversation', variables.conversationId], type: 'active' });
      queryClient.refetchQueries({ queryKey: ['myConversations'], type: 'active' });
      queryClient.refetchQueries({ queryKey: ['unreadConversationsCount'], type: 'active' });
    }
  });
}

// Cambiar estado de conversación
export function useUpdateConversationStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ conversationId, status }) => {
      const response = await api.patch(`/conversations/${conversationId}/status`, { status });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['conversation', variables.conversationId] });
      queryClient.invalidateQueries({ queryKey: ['myConversations'] });
    }
  });
}
