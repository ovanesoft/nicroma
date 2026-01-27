import { useState, useEffect } from 'react';
import { 
  User, Mail, Phone, Building2, Shield, Calendar, 
  Save, Lock, Eye, EyeOff, CheckCircle, AlertCircle
} from 'lucide-react';
import Layout from '../components/layout/Layout';
import { 
  Card, CardContent, CardHeader, CardTitle, 
  Button, Input, Label, Badge 
} from '../components/ui';
import { useProfile, useUpdateProfile, useChangePassword } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { formatDate, getRoleLabel, getRoleColor, cn } from '../lib/utils';
import toast from 'react-hot-toast';

function Profile() {
  const { user: authUser, refreshUser } = useAuth();
  const { data: profileData, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();

  // Estado del formulario de perfil
  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    phone: ''
  });

  // Estado del formulario de contraseña
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  const profile = profileData?.data?.user;

  // Cargar datos cuando llegan
  useEffect(() => {
    if (profile) {
      setProfileForm({
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        phone: profile.phone || ''
      });
    }
  }, [profile]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    
    if (!profileForm.firstName.trim()) {
      toast.error('El nombre es requerido');
      return;
    }

    try {
      await updateProfile.mutateAsync(profileForm);
      toast.success('Perfil actualizado correctamente');
      // Actualizar contexto de auth si existe la función
      if (refreshUser) {
        await refreshUser();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al actualizar perfil');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (!passwordForm.currentPassword) {
      toast.error('Ingresá tu contraseña actual');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      toast.error('La nueva contraseña debe tener al menos 8 caracteres');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    try {
      await changePassword.mutateAsync({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      toast.success('Contraseña actualizada correctamente');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al cambiar contraseña');
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  if (isLoading) {
    return (
      <Layout title="Mi Perfil">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-slate-100 rounded-lg" />
          <div className="h-64 bg-slate-100 rounded-lg" />
        </div>
      </Layout>
    );
  }

  const isOAuthUser = profile?.authProvider && profile.authProvider !== 'local';

  return (
    <Layout title="Mi Perfil" subtitle="Gestiona tu información personal">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Resumen del perfil */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-6">
              {/* Avatar */}
              <div className="w-24 h-24 bg-gradient-to-br from-primary-400 to-purple-500 rounded-2xl flex items-center justify-center text-white text-3xl font-bold flex-shrink-0">
                {profile?.firstName?.[0]}{profile?.lastName?.[0]}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-bold text-slate-800">
                  {profile?.firstName} {profile?.lastName}
                </h2>
                <p className="text-slate-500 mt-1">{profile?.email}</p>
                
                <div className="flex flex-wrap items-center gap-3 mt-4">
                  <Badge className={getRoleColor(profile?.role)}>
                    <Shield className="w-3 h-3 mr-1" />
                    {getRoleLabel(profile?.role)}
                  </Badge>
                  
                  {profile?.tenantName && (
                    <span className="text-sm text-slate-500 flex items-center gap-1">
                      <Building2 className="w-4 h-4" />
                      {profile.tenantName}
                    </span>
                  )}
                  
                  {profile?.emailVerified && (
                    <span className="text-sm text-green-600 flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      Email verificado
                    </span>
                  )}
                </div>

                {isOAuthUser && (
                  <div className="mt-4 px-3 py-2 bg-blue-50 rounded-lg inline-flex items-center gap-2 text-sm text-blue-700">
                    <AlertCircle className="w-4 h-4" />
                    Cuenta vinculada con {profile.authProvider === 'google' ? 'Google' : profile.authProvider === 'facebook' ? 'Facebook' : profile.authProvider}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Formulario de perfil */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Información Personal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <Label required>Nombre</Label>
                  <Input
                    value={profileForm.firstName}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, firstName: e.target.value }))}
                    placeholder="Tu nombre"
                  />
                </div>

                <div>
                  <Label>Apellido</Label>
                  <Input
                    value={profileForm.lastName}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, lastName: e.target.value }))}
                    placeholder="Tu apellido"
                  />
                </div>

                <div>
                  <Label>Teléfono</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+54 11 1234-5678"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <Label>Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      value={profile?.email || ''}
                      disabled
                      className="pl-10 bg-slate-50"
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    El email no se puede cambiar
                  </p>
                </div>

                <Button 
                  type="submit" 
                  disabled={updateProfile.isPending}
                  className="w-full"
                >
                  {updateProfile.isPending ? (
                    'Guardando...'
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Guardar Cambios
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Cambiar contraseña */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Cambiar Contraseña
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isOAuthUser ? (
                <div className="text-center py-8">
                  <Lock className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-500">
                    Tu cuenta usa inicio de sesión con {profile.authProvider === 'google' ? 'Google' : profile.authProvider}.
                  </p>
                  <p className="text-sm text-slate-400 mt-1">
                    La contraseña se gestiona desde tu cuenta de {profile.authProvider === 'google' ? 'Google' : profile.authProvider}.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div>
                    <Label required>Contraseña Actual</Label>
                    <div className="relative">
                      <Input
                        type={showPasswords.current ? 'text' : 'password'}
                        value={passwordForm.currentPassword}
                        onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility('current')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <Label required>Nueva Contraseña</Label>
                    <div className="relative">
                      <Input
                        type={showPasswords.new ? 'text' : 'password'}
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                        placeholder="Mínimo 8 caracteres"
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility('new')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {passwordForm.newPassword && passwordForm.newPassword.length < 8 && (
                      <p className="text-xs text-amber-600 mt-1">
                        Mínimo 8 caracteres
                      </p>
                    )}
                  </div>

                  <div>
                    <Label required>Confirmar Nueva Contraseña</Label>
                    <div className="relative">
                      <Input
                        type={showPasswords.confirm ? 'text' : 'password'}
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        placeholder="Repetí la nueva contraseña"
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility('confirm')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword && (
                      <p className="text-xs text-red-600 mt-1">
                        Las contraseñas no coinciden
                      </p>
                    )}
                  </div>

                  <Button 
                    type="submit" 
                    disabled={changePassword.isPending || passwordForm.newPassword.length < 8 || passwordForm.newPassword !== passwordForm.confirmPassword}
                    className="w-full"
                  >
                    {changePassword.isPending ? 'Cambiando...' : 'Cambiar Contraseña'}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Información adicional */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Información de la Cuenta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-slate-500">Miembro desde</p>
                <p className="font-medium text-slate-800">
                  {formatDate(profile?.createdAt)}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Último acceso</p>
                <p className="font-medium text-slate-800">
                  {profile?.lastLogin ? formatDate(profile.lastLogin) : 'Nunca'}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Estado de la cuenta</p>
                <p className={cn(
                  'font-medium',
                  profile?.isActive ? 'text-green-600' : 'text-red-600'
                )}>
                  {profile?.isActive ? 'Activa' : 'Inactiva'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

export default Profile;
